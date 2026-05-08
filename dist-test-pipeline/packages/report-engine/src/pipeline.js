"use strict";
/**
 * @file pipeline.ts
 * @description The central Pipeline Engine orchestrator.
 *
 * This is the backbone of TraceLens.
 *
 * EXECUTION ORDER (strictly sequential):
 *   1. Session Init   — generate ID, create directories, build context
 *   2. Playwright     — capture trace, HAR, screenshot
 *   3. Lighthouse     — run performance audit, generate LHR
 *   4. TraceParser    — extract bottleneck signals from LHR + HAR
 *   5. BundleAnalyzer — analyze bundle composition (if configured)
 *   6. Aggregation    — merge all results into TraceLensResult
 *
 * KEY INVARIANTS:
 *   - One session ID shared by all stages
 *   - Artifact paths passed explicitly via PipelineContext (no disk search)
 *   - Each stage updates ctx.stages[stageName] status
 *   - continueOnFailure=true means non-critical failures don't abort the run
 *
 * USAGE:
 *   import { runPipeline } from "@tracelens/report-engine";
 *
 *   const result = await runPipeline({
 *     routes: [{ url: "https://example.com" }],
 *     device: { mode: "desktop", throttle: "none" },
 *   });
 *
 *   console.log(result.routes[0].aiSignals);
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.runPipeline = runPipeline;
const session_js_1 = require("./session.js");
const logger_js_1 = require("./logger.js");
const playwright_stage_js_1 = require("./stages/playwright-stage.js");
const lighthouse_stage_js_1 = require("./stages/lighthouse-stage.js");
const trace_parser_stage_js_1 = require("./stages/trace-parser-stage.js");
const bundle_analyzer_stage_js_1 = require("./stages/bundle-analyzer-stage.js");
const aggregation_stage_js_1 = require("./stages/aggregation-stage.js");
/**
 * Runs the complete TraceLens performance intelligence pipeline.
 *
 * @param config - Pipeline configuration (only `routes` is required)
 * @returns      - Canonical TraceLensResult with all intelligence merged
 */
async function runPipeline(config) {
    // ── Stage 0: Session Initialization ──────────────────────────────────────────
    const ctx = (0, session_js_1.createPipelineContext)(config);
    const sessionStart = ctx.createdAt;
    logger_js_1.logger.banner(ctx.sessionId);
    logger_js_1.logger.info(`Routes   : ${ctx.config.routes.map((r) => r.url).join(", ")}`);
    logger_js_1.logger.info(`Device   : ${ctx.config.device.mode} / ${ctx.config.device.throttle}`);
    logger_js_1.logger.info(`Sessions : ${ctx.sessionDir}`);
    logger_js_1.logger.separator();
    // ── Stage 1: Playwright ───────────────────────────────────────────────────────
    await (0, playwright_stage_js_1.runPlaywrightStage)(ctx);
    // ── Stage 2: Lighthouse ───────────────────────────────────────────────────────
    await (0, lighthouse_stage_js_1.runLighthouseStage)(ctx);
    // ── Stage 3: Trace Parser ─────────────────────────────────────────────────────
    await (0, trace_parser_stage_js_1.runTraceParserStage)(ctx);
    // ── Stage 4: Bundle Analyzer ──────────────────────────────────────────────────
    await (0, bundle_analyzer_stage_js_1.runBundleAnalyzerStage)(ctx);
    // ── Stage 5: Aggregation ──────────────────────────────────────────────────────
    const result = await (0, aggregation_stage_js_1.runAggregationStage)(ctx, sessionStart);
    // ── Final Summary ─────────────────────────────────────────────────────────────
    logger_js_1.logger.separator();
    logger_js_1.logger.summary(ctx.sessionId, result.durationMs, result.success, result.routes.length);
    for (const route of result.routes) {
        logger_js_1.logger.info(`${route.url}`);
        if (route.vitals.lcp !== null)
            logger_js_1.logger.metric("  LCP", route.vitals.lcp, "ms");
        if (route.vitals.fcp !== null)
            logger_js_1.logger.metric("  FCP", route.vitals.fcp, "ms");
        if (route.vitals.performanceScore !== null) {
            logger_js_1.logger.metric("  Score", Math.round((route.vitals.performanceScore ?? 0) * 100), "/100");
        }
        if (route.primaryBottleneck)
            logger_js_1.logger.metric("  Bottleneck", route.primaryBottleneck);
        if (route.artifacts.bottlenecksJsonPath)
            logger_js_1.logger.artifact("  Intelligence", route.artifacts.bottlenecksJsonPath);
    }
    logger_js_1.logger.artifact("Result", result.resultPath);
    return result;
}
