"use strict";
/**
 * @file runner.ts
 * @description Main orchestrator for the PlaywrightRunner.
 *
 * Execution order per route:
 *   1. Init output directories
 *   2. Create isolated browser context (with HAR recording)
 *   3. Start Playwright trace recording
 *   4. Open new page, navigate to URL
 *   5. Wait for page stability
 *   6. Extract navigation timings
 *   7. Capture screenshot
 *   8. Stop trace → save trace.zip
 *   9. Close context (triggers HAR save)
 *  10. Build RouteResult, write to disk
 *
 * When config.runs > 1, each route is audited N times and all
 * results are returned (averaging is handled by analytics-engine).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.run = run;
const browser_1 = require("./browser");
const config_1 = require("./config");
const output_manager_1 = require("./output-manager");
const screenshot_1 = require("./screenshot");
const trace_capture_1 = require("./trace-capture");
const timings_1 = require("./timings");
// ─── Session ID ────────────────────────────────────────────────────────────────
/**
 * Generates a session ID in the format: YYYYMMDD-HHmmss-<random>
 * Used as the top-level directory name under /reports.
 */
function generateSessionId() {
    const now = new Date();
    const datePart = now
        .toISOString()
        .replace(/[-:T]/g, "")
        .replace(/\..+/, "");
    const rand = Math.random().toString(36).slice(2, 7);
    return `${datePart}-${rand}`;
}
// ─── Single Route Run ──────────────────────────────────────────────────────────
/**
 * Runs a single audit for one route within an existing browser instance.
 * Creates and destroys its own BrowserContext for full isolation.
 *
 * @param browser - Shared browser instance
 * @param route - The route configuration to audit
 * @param config - Fully resolved runner configuration
 * @param sessionDir - Session output directory
 * @param runIndex - 0-based run index for multi-run sessions
 * @returns RouteResult with all timings, artifacts, and status
 */
async function runRoute(browser, route, config, sessionDir, runIndex) {
    const startedAt = new Date().toISOString();
    const startTime = Date.now();
    // Determine route label: use explicit label or derive from URL
    const routeLabel = route.label ?? (0, output_manager_1.slugifyRoute)(route.url);
    const routeDir = (0, output_manager_1.initRouteDir)(sessionDir, routeLabel, config.runs > 1 ? runIndex : undefined);
    const artifactPaths = (0, output_manager_1.resolveArtifactPaths)(routeDir, config.screenshot.format);
    let context = null;
    let deviceProfile = null;
    try {
        // ── Step 1: Create isolated browser context ────────────────────────────────
        const harPath = config.har !== false ? artifactPaths.har : undefined;
        context = await (0, browser_1.createContext)(browser, config, harPath);
        deviceProfile = context.deviceProfile;
        // ── Step 2: Start trace recording ─────────────────────────────────────────
        await (0, trace_capture_1.startTrace)(context.context, config);
        // ── Step 3: Open page and navigate ────────────────────────────────────────
        const page = await (0, browser_1.createPage)(context.context);
        await page.goto(route.url, {
            waitUntil: "domcontentloaded",
            timeout: config.navigationTimeout,
        });
        // ── Step 4: Wait for page to stabilize ────────────────────────────────────
        await (0, timings_1.waitForPageStability)(page, route.waitForSelector, route.waitMs, config.waitTimeout);
        // ── Step 5: Extract navigation timings ────────────────────────────────────
        const timings = await (0, timings_1.extractNavigationTimings)(page);
        // ── Step 6: Capture screenshot ────────────────────────────────────────────
        const screenshotResult = await (0, screenshot_1.captureScreenshot)(page, artifactPaths.screenshot, config);
        await page.close();
        // ── Step 7: Stop and save trace ───────────────────────────────────────────
        const traceResult = await (0, trace_capture_1.stopTrace)(context.context, artifactPaths.trace, config);
        // ── Step 8: Close context (triggers HAR file write) ───────────────────────
        await (0, browser_1.closeContext)(context.context, context.cdpSession);
        const completedAt = new Date().toISOString();
        const durationMs = Date.now() - startTime;
        const artifacts = {
            outputDir: routeDir,
            screenshotPath: screenshotResult.screenshotPath,
            tracePath: traceResult.success ? traceResult.tracePath : null,
            harPath: config.har !== false ? artifactPaths.har : null,
        };
        return {
            route,
            deviceProfile,
            startedAt,
            completedAt,
            durationMs,
            timings,
            artifacts,
            success: true,
        };
    }
    catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[playwright-runner] Route failed: ${route.url} (run ${runIndex + 1})\n  ${message}`);
        // Always clean up context even on failure
        if (context) {
            await (0, browser_1.closeContext)(context.context, context.cdpSession).catch(() => void 0);
        }
        const completedAt = new Date().toISOString();
        const durationMs = Date.now() - startTime;
        return {
            route,
            deviceProfile: deviceProfile ?? {
                mode: config.device,
                viewport: config.viewport,
                userAgent: "",
                isMobile: false,
                hasTouch: false,
                deviceScaleFactor: 1,
            },
            startedAt,
            completedAt,
            durationMs,
            timings: { domContentLoaded: 0, load: 0, ttfb: 0, firstPaint: null, firstContentfulPaint: null },
            artifacts: {
                outputDir: routeDir,
                screenshotPath: null,
                tracePath: null,
                harPath: null,
            },
            success: false,
            error: message,
        };
    }
}
// ─── Public API ────────────────────────────────────────────────────────────────
/**
 * The main PlaywrightRunner — accepts a RunnerConfig and returns a RunnerResult.
 *
 * Routes are audited sequentially (not in parallel) to avoid resource contention
 * and to prevent traces from interfering with each other's CPU/network measurements.
 *
 * When config.runs > 1, each route is audited N times and all results included.
 *
 * @param userConfig - Caller-supplied configuration (partial — defaults are applied)
 * @returns A complete RunnerResult with all route results and session metadata
 *
 * @example
 * ```ts
 * import { run } from "@tracelens/playwright-runner";
 *
 * const result = await run({
 *   routes: [{ url: "https://example.com" }],
 *   device: "mobile",
 *   runs: 3,
 * });
 *
 * console.log(result.routes[0].timings.lcp);
 * ```
 */
async function run(userConfig) {
    const config = (0, config_1.resolveConfig)(userConfig);
    const sessionId = generateSessionId();
    const startedAt = new Date().toISOString();
    const startTime = Date.now();
    console.log(`[playwright-runner] Session started: ${sessionId}`);
    console.log(`[playwright-runner] Auditing ${config.routes.length} route(s), ` +
        `${config.runs} run(s) each, device: ${config.device}`);
    const sessionDir = (0, output_manager_1.initSessionDir)(config.outputDir, sessionId);
    const routeResults = [];
    let browser = null;
    try {
        browser = await (0, browser_1.launchBrowser)(config);
        for (const route of config.routes) {
            for (let runIndex = 0; runIndex < config.runs; runIndex++) {
                console.log(`[playwright-runner] → ${route.url} (run ${runIndex + 1}/${config.runs})`);
                const result = await runRoute(browser, route, config, sessionDir, runIndex);
                routeResults.push(result);
            }
        }
    }
    finally {
        if (browser) {
            await (0, browser_1.closeBrowser)(browser);
        }
    }
    const completedAt = new Date().toISOString();
    const durationMs = Date.now() - startTime;
    const success = routeResults.every((r) => r.success);
    const runnerResult = {
        sessionId,
        startedAt,
        completedAt,
        durationMs,
        routes: routeResults,
        config,
        success,
    };
    // Persist the full session result to disk
    (0, output_manager_1.writeJson)(`${sessionDir}/session.json`, runnerResult);
    console.log(`[playwright-runner] Session complete: ${sessionId} ` +
        `(${durationMs}ms, ${success ? "✓ all passed" : "✗ some failed"})`);
    console.log(`[playwright-runner] Output: ${sessionDir}`);
    return runnerResult;
}
