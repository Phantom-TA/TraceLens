/**
 * @file runner.ts
 * @description Main orchestrator for the LighthouseRunner.
 *
 * Execution order per route run:
 *   1. Resolve output directories for this run
 *   2. Build the Lighthouse config for the preset + route overrides
 *   3. Assemble Chrome flags (base preset flags + user flags)
 *   4. Launch Chrome via chrome-launcher
 *   5. Run Lighthouse programmatically against the remote debugging port
 *   6. Write JSON and/or HTML reports to disk
 *   7. Kill Chrome
 *   8. Extract scores + Core Web Vitals from the LHR
 *   9. Return LighthouseRouteResult
 *
 * When config.runs > 1, each route is audited N times sequentially.
 * Routes are also processed sequentially (not in parallel) to avoid
 * resource contention skewing CPU/network measurements.
 *
 * A session-summary.json is written at the end containing per-route
 * averaged metrics across all runs.
 */
import { launch as launchChrome } from "chrome-launcher";
import lighthouse from "lighthouse";
import path from "path";
import { buildLighthouseConfig, BASE_CHROME_FLAGS } from "./presets.js";
import { resolveConfig } from "./config.js";
import { initRouteDir, initSessionDir, resolveArtifactPaths, slugifyRoute, writeFile, writeJson, } from "./output-manager.js";
// ─── Session ID ────────────────────────────────────────────────────────────────
/**
 * Generates a unique session ID: YYYYMMDDHHMMSS-<random5>
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
// ─── Score Extractor ───────────────────────────────────────────────────────────
/**
 * Maps a raw Lighthouse numeric score (0–1 | null) to a human-readable rating.
 */
function rateScore(score) {
    if (score === null)
        return "error";
    if (score >= 0.9)
        return "pass";
    if (score >= 0.5)
        return "average";
    return "fail";
}
/**
 * Safely extracts a numeric metric value (in ms) from the LHR audit map.
 * Returns null if the audit is missing or has no numeric value.
 *
 * @param audits    - The lhr.audits map from a Lighthouse result
 * @param auditId   - The Lighthouse audit ID (e.g. "largest-contentful-paint")
 */
function extractMetric(
// eslint-disable-next-line @typescript-eslint/no-explicit-any
audits, auditId) {
    const audit = audits[auditId];
    if (!audit)
        return null;
    const val = audit.numericValue;
    return typeof val === "number" ? Math.round(val) : null;
}
/**
 * Extracts Core Web Vitals and key metrics from a raw Lighthouse result.
 *
 * @param lhr - Raw Lighthouse result object
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractVitals(lhr) {
    const audits = lhr.audits ?? {};
    return {
        fcp: extractMetric(audits, "first-contentful-paint"),
        lcp: extractMetric(audits, "largest-contentful-paint"),
        tbt: extractMetric(audits, "total-blocking-time"),
        cls: (() => {
            const audit = audits["cumulative-layout-shift"];
            if (!audit)
                return null;
            const val = audit.numericValue;
            return typeof val === "number" ? Math.round(val * 1000) / 1000 : null;
        })(),
        speedIndex: extractMetric(audits, "speed-index"),
        tti: extractMetric(audits, "interactive"),
        ttfb: extractMetric(audits, "server-response-time"),
    };
}
// ─── Averager ──────────────────────────────────────────────────────────────────
/**
 * Computes the arithmetic mean of an array of numbers, ignoring nulls.
 * Returns null if no non-null values exist.
 */
function mean(values) {
    const nums = values.filter((v) => v !== null);
    if (nums.length === 0)
        return null;
    return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 100) / 100;
}
/**
 * Averages metrics across all successful runs for a single route.
 */
function averageRouteRuns(runs) {
    const successful = runs.filter((r) => r.success);
    return {
        performanceScore: mean(successful.map((r) => r.scores.performance.score !== null
            ? r.scores.performance.score * 100
            : null)),
        fcp: mean(successful.map((r) => r.vitals.fcp)),
        lcp: mean(successful.map((r) => r.vitals.lcp)),
        tbt: mean(successful.map((r) => r.vitals.tbt)),
        cls: mean(successful.map((r) => r.vitals.cls)),
        speedIndex: mean(successful.map((r) => r.vitals.speedIndex)),
        tti: mean(successful.map((r) => r.vitals.tti)),
        ttfb: mean(successful.map((r) => r.vitals.ttfb)),
    };
}
// ─── Single Route Run ──────────────────────────────────────────────────────────
/**
 * Runs a single Lighthouse audit for one route.
 * Launches its own Chrome instance and kills it when done.
 *
 * @param route      - Route configuration to audit
 * @param config     - Fully resolved runner configuration
 * @param sessionDir - Session output directory
 * @param runIndex   - 0-based run index
 * @returns          - Complete LighthouseRouteResult
 */
async function runRoute(route, config, sessionDir, runIndex) {
    const startedAt = new Date().toISOString();
    const startTime = Date.now();
    const routeLabel = route.label ?? slugifyRoute(route.url);
    const routeDir = initRouteDir(sessionDir, routeLabel, runIndex, config.runs);
    const artifactPaths = resolveArtifactPaths(routeDir, config.formats);
    const artifacts = {
        outputDir: routeDir,
        jsonPath: artifactPaths.json,
        htmlPath: artifactPaths.html,
    };
    let chrome = null;
    try {
        // ── Step 1: Build Lighthouse config ───────────────────────────────────────
        const lhConfig = buildLighthouseConfig(config.preset, config.categories, config.locale, route.configOverrides);
        // Collect output formats for Lighthouse's own report generation
        const outputFormats = config.formats.length === 1
            ? config.formats[0]
            : config.formats;
        // ── Step 2: Launch Chrome ──────────────────────────────────────────────────
        const chromeFlags = [...BASE_CHROME_FLAGS, ...config.chromeFlags];
        chrome = await launchChrome({
            chromePath: config.chromePath,
            chromeFlags,
            port: config.port,
            logLevel: "silent",
        });
        // ── Step 3: Run Lighthouse ─────────────────────────────────────────────────
        const runnerResult = await lighthouse(route.url, {
            port: chrome.port,
            output: outputFormats,
            logLevel: "silent",
            maxWaitForLoad: config.timeout,
            ...(config.chromePath ? { chromePath: config.chromePath } : {}),
        }, lhConfig);
        if (!runnerResult) {
            throw new Error("Lighthouse returned no result — audit may have timed out.");
        }
        const { lhr, report } = runnerResult;
        // ── Step 4: Write reports to disk ──────────────────────────────────────────
        if (Array.isArray(report)) {
            // Lighthouse returns reports in the same order as outputFormats
            const formatOrder = Array.isArray(outputFormats) ? outputFormats : [outputFormats];
            formatOrder.forEach((fmt, i) => {
                const content = report[i];
                if (!content)
                    return;
                if (fmt === "json" && artifactPaths.json) {
                    writeFile(artifactPaths.json, content);
                }
                else if (fmt === "html" && artifactPaths.html) {
                    writeFile(artifactPaths.html, content);
                }
            });
        }
        else if (typeof report === "string") {
            const fmt = Array.isArray(outputFormats) ? outputFormats[0] : outputFormats;
            if (fmt === "json" && artifactPaths.json) {
                writeFile(artifactPaths.json, report);
            }
            else if (fmt === "html" && artifactPaths.html) {
                writeFile(artifactPaths.html, report);
            }
        }
        // ── Step 5: Extract scores + vitals ───────────────────────────────────────
        const cats = lhr.categories ?? {};
        const completedAt = new Date().toISOString();
        const durationMs = Date.now() - startTime;
        return {
            route,
            preset: config.preset,
            startedAt,
            completedAt,
            durationMs,
            runIndex,
            scores: {
                performance: {
                    score: cats.performance?.score ?? null,
                    rating: rateScore(cats.performance?.score ?? null),
                },
                accessibility: {
                    score: cats.accessibility?.score ?? null,
                    rating: rateScore(cats.accessibility?.score ?? null),
                },
                bestPractices: {
                    score: cats["best-practices"]?.score ?? null,
                    rating: rateScore(cats["best-practices"]?.score ?? null),
                },
                seo: {
                    score: cats.seo?.score ?? null,
                    rating: rateScore(cats.seo?.score ?? null),
                },
            },
            vitals: extractVitals(lhr),
            artifacts,
            success: true,
        };
    }
    catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[lighthouse-runner] Route failed: ${route.url} (run ${runIndex + 1})\n  ${message}`);
        const completedAt = new Date().toISOString();
        const durationMs = Date.now() - startTime;
        return {
            route,
            preset: config.preset,
            startedAt,
            completedAt,
            durationMs,
            runIndex,
            scores: {
                performance: { score: null, rating: "error" },
                accessibility: { score: null, rating: "error" },
                bestPractices: { score: null, rating: "error" },
                seo: { score: null, rating: "error" },
            },
            vitals: {
                fcp: null, lcp: null, tbt: null,
                cls: null, speedIndex: null, tti: null, ttfb: null,
            },
            artifacts,
            success: false,
            error: message,
        };
    }
    finally {
        // Always kill Chrome, even on failure
        if (chrome) {
            try {
                await chrome.kill();
            }
            catch { /* ignore */ }
        }
    }
}
// ─── Public API ────────────────────────────────────────────────────────────────
/**
 * The main LighthouseRunner — accepts a LighthouseRunnerConfig and returns
 * a complete LighthouseRunnerResult with per-route run results and averages.
 *
 * Routes and runs are processed sequentially (not in parallel) to avoid
 * resource contention that would skew performance measurements.
 *
 * @param userConfig - Caller-supplied configuration (partial — defaults are applied)
 * @returns          - Full LighthouseRunnerResult written to /reports/lighthouse
 *
 * @example
 * ```ts
 * import { run } from "@tracelens/lighthouse-runner";
 *
 * const result = await run({
 *   routes: [{ url: "https://example.com" }],
 *   preset: "mobile",
 *   runs: 3,
 *   formats: ["json", "html"],
 * });
 *
 * console.log(result.routes[0].averages.lcp); // e.g. 1240 ms
 * ```
 */
export async function run(userConfig) {
    const config = resolveConfig(userConfig);
    const sessionId = generateSessionId();
    const startedAt = new Date().toISOString();
    const startTime = Date.now();
    console.log(`[lighthouse-runner] Session started: ${sessionId}`);
    console.log(`[lighthouse-runner] Auditing ${config.routes.length} route(s), ` +
        `${config.runs} run(s) each, preset: ${config.preset}`);
    const sessionDir = initSessionDir(config.outputDir, sessionId);
    const routeSummaries = [];
    for (const route of config.routes) {
        const routeRuns = [];
        for (let runIndex = 0; runIndex < config.runs; runIndex++) {
            console.log(`[lighthouse-runner] → ${route.url} (run ${runIndex + 1}/${config.runs})`);
            const result = await runRoute(route, config, sessionDir, runIndex);
            routeRuns.push(result);
            // Print a compact score summary per run
            const perf = result.scores.performance;
            const lcp = result.vitals.lcp;
            const scoreStr = perf.score !== null
                ? `perf=${Math.round(perf.score * 100)} lcp=${lcp ?? "n/a"}ms`
                : `failed: ${result.error}`;
            console.log(`[lighthouse-runner]   ${scoreStr}`);
        }
        const summary = {
            route,
            totalRuns: config.runs,
            successfulRuns: routeRuns.filter((r) => r.success).length,
            averages: averageRouteRuns(routeRuns),
            runs: routeRuns,
        };
        routeSummaries.push(summary);
    }
    const completedAt = new Date().toISOString();
    const durationMs = Date.now() - startTime;
    const success = routeSummaries.every((s) => s.successfulRuns > 0);
    // ── Write session summary ───────────────────────────────────────────────────
    let summaryPath = null;
    if (!config.skipSummary) {
        summaryPath = path.join(sessionDir, "session-summary.json");
        const summaryPayload = {
            sessionId,
            startedAt,
            completedAt,
            durationMs,
            preset: config.preset,
            routes: routeSummaries,
            config,
            success,
            summaryPath,
        };
        writeJson(summaryPath, summaryPayload);
    }
    const runnerResult = {
        sessionId,
        startedAt,
        completedAt,
        durationMs,
        preset: config.preset,
        routes: routeSummaries,
        config,
        success,
        summaryPath,
    };
    console.log(`[lighthouse-runner] Session complete: ${sessionId} ` +
        `(${durationMs}ms, ${success ? "✓ all passed" : "✗ some failed"})`);
    console.log(`[lighthouse-runner] Output: ${sessionDir}`);
    return runnerResult;
}
