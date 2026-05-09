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
 *   import { runPipeline } from "@tracelens/pipeline-engine";
 *
 *   const result = await runPipeline({
 *     routes: [{ url: "https://example.com" }],
 *     device: { mode: "desktop", throttle: "none" },
 *   });
 *
 *   console.log(result.routes[0].aiSignals);
 */
import { createPipelineContext } from "./session.js";
import { logger } from "./logger.js";
import { runPlaywrightStage } from "./stages/playwright-stage.js";
import { runLighthouseStage } from "./stages/lighthouse-stage.js";
import { runTraceParserStage } from "./stages/trace-parser-stage.js";
import { runBundleAnalyzerStage } from "./stages/bundle-analyzer-stage.js";
import { runAggregationStage } from "./stages/aggregation-stage.js";
/**
 * Runs the complete TraceLens performance intelligence pipeline.
 *
 * @param config - Pipeline configuration (only `routes` is required)
 * @returns      - Canonical TraceLensResult with all intelligence merged
 */
export async function runPipeline(config) {
    // ── Stage 0: Session Initialization ──────────────────────────────────────────
    const ctx = createPipelineContext(config);
    const sessionStart = ctx.createdAt;
    logger.banner(ctx.sessionId);
    logger.info(`Routes   : ${ctx.config.routes.map((r) => r.url).join(", ")}`);
    logger.info(`Device   : ${ctx.config.device.mode} / ${ctx.config.device.throttle}`);
    logger.info(`Sessions : ${ctx.sessionDir}`);
    logger.separator();
    // ── Stage 1: Playwright ───────────────────────────────────────────────────────
    await runPlaywrightStage(ctx);
    // ── Stage 2: Lighthouse ───────────────────────────────────────────────────────
    await runLighthouseStage(ctx);
    // ── Stage 3: Trace Parser ─────────────────────────────────────────────────────
    await runTraceParserStage(ctx);
    // ── Stage 4: Bundle Analyzer ──────────────────────────────────────────────────
    await runBundleAnalyzerStage(ctx);
    // ── Stage 5: Aggregation ──────────────────────────────────────────────────────
    const result = await runAggregationStage(ctx, sessionStart);
    // ── Final Summary ─────────────────────────────────────────────────────────────
    logger.separator();
    logger.summary(ctx.sessionId, result.durationMs, result.success, result.routes.length);
    for (const route of result.routes) {
        logger.info(`${route.url}`);
        if (route.vitals.lcp !== null)
            logger.metric("  LCP", route.vitals.lcp, "ms");
        if (route.vitals.fcp !== null)
            logger.metric("  FCP", route.vitals.fcp, "ms");
        if (route.vitals.performanceScore !== null) {
            logger.metric("  Score", Math.round((route.vitals.performanceScore ?? 0) * 100), "/100");
        }
        if (route.primaryBottleneck)
            logger.metric("  Bottleneck", route.primaryBottleneck);
        if (route.artifacts.bottlenecksJsonPath)
            logger.artifact("  Intelligence", route.artifacts.bottlenecksJsonPath);
    }
    logger.artifact("Result", result.resultPath);
    return result;
}
//# sourceMappingURL=pipeline.js.map