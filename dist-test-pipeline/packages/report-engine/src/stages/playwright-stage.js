"use strict";
/**
 * @file stages/playwright-stage.ts
 * @description Pipeline Stage 1: Playwright artifact capture.
 *
 * RESPONSIBILITY:
 *   - Launch Playwright for all configured routes
 *   - Capture screenshot, trace.zip, and HAR
 *   - Write artifacts to the session's route artifact directories
 *   - Populate ctx.routeArtifacts[url].playwright with explicit paths
 *
 * EXPLICIT ARTIFACT PASSING:
 *   Artifacts are NOT stored in arbitrary directories.
 *   They are written to: <sessionDir>/<routeSlug>/artifacts/
 *   Paths are stored directly in the PipelineContext.
 *
 * NOTE:
 *   Playwright uses its own internal output-manager which generates
 *   its own session ID. We override its outputDir to point to
 *   our session's artifact directory so all files land in the right place.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.runPlaywrightStage = runPlaywrightStage;
const index_1 = require("../../playwright-runner/src/index");
const session_js_1 = require("../session.js");
const logger_js_1 = require("../logger.js");
async function runPlaywrightStage(ctx) {
    const stage = ctx.stages.playwright;
    if (!ctx.config.capturePlaywrightArtifacts) {
        (0, session_js_1.markStageSkipped)(stage, "capturePlaywrightArtifacts is false");
        logger_js_1.logger.stageSkipped("Playwright", "disabled in config");
        return;
    }
    (0, session_js_1.markStageStart)(stage);
    logger_js_1.logger.stageStart("Playwright", `capturing ${ctx.config.routes.length} route(s)`);
    try {
        // Map device mode to throttle profile
        const throttle = ctx.config.device.throttle === "none" ? "none"
            : ctx.config.device.throttle === "4g" ? "4g"
                : "3g";
        const result = await (0, index_1.run)({
            routes: ctx.config.routes.map((r) => ({
                url: r.url,
                label: r.label,
            })),
            device: ctx.config.device.mode,
            throttle,
            // CRITICAL: Point output to OUR session directory
            // This overrides playwright-runner's own session management
            outputDir: ctx.sessionDir,
            headless: ctx.config.headless,
            runs: 1,
            screenshot: { fullPage: true, format: "png" },
            trace: { screenshots: true, snapshots: true },
            har: {},
        });
        // ── Map playwright results back into our PipelineContext ──────────────────
        for (const routeResult of result.routes) {
            const bundle = ctx.routeArtifacts.get(routeResult.route.url);
            if (!bundle)
                continue;
            // Playwright writes to its own sessionId directory inside our outputDir.
            // We need to read from its actual output paths.
            bundle.playwright = {
                screenshotPath: routeResult.artifacts.screenshotPath,
                tracePath: routeResult.artifacts.tracePath,
                harPath: routeResult.artifacts.harPath,
                timings: {
                    domContentLoaded: routeResult.timings.domContentLoaded,
                    load: routeResult.timings.load,
                    ttfb: routeResult.timings.ttfb,
                    firstPaint: routeResult.timings.firstPaint,
                    firstContentfulPaint: routeResult.timings.firstContentfulPaint,
                },
            };
            logger_js_1.logger.route(routeResult.route.url);
            logger_js_1.logger.artifact("screenshot ", bundle.playwright.screenshotPath);
            logger_js_1.logger.artifact("trace     ", bundle.playwright.tracePath);
            logger_js_1.logger.artifact("HAR       ", bundle.playwright.harPath);
        }
        (0, session_js_1.markStageDone)(stage, stage.durationMs ?? 0);
        logger_js_1.logger.stageDone("Playwright", stage.durationMs ?? 0, `${result.routes.length} route(s) captured`);
    }
    catch (err) {
        (0, session_js_1.markStageFailed)(stage, err);
        logger_js_1.logger.stageFailed("Playwright", stage.error ?? "unknown error", !ctx.config.continueOnFailure);
        if (!ctx.config.continueOnFailure)
            throw err;
    }
}
