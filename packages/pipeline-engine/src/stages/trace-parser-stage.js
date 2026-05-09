/**
 * @file stages/trace-parser-stage.ts
 * @description Pipeline Stage 3: Trace analysis.
 *
 * RESPONSIBILITY:
 *   - Read LHR JSON from ctx.routeArtifacts[url].lighthouse.jsonPath
 *   - Read HAR from ctx.routeArtifacts[url].playwright.harPath
 *   - Pass both EXPLICITLY to trace-parser (no filesystem hunting)
 *   - Write bottlenecks.json to <routeDir>/intelligence/
 *   - Populate ctx.routeArtifacts[url].traceParser with result + path
 *
 * KEY DESIGN:
 *   This stage uses ONLY paths stored in PipelineContext.
 *   It NEVER searches the filesystem. If lighthouse.jsonPath is null
 *   (because Lighthouse failed), it gracefully runs with lhr=undefined.
 */
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { parse as parseTrace } from "../../../trace-parser/src/index.js";
import { markStageDone, markStageFailed, markStageSkipped, markStageStart } from "../session.js";
import { logger } from "../logger.js";
export async function runTraceParserStage(ctx) {
    const stage = ctx.stages.traceParser;
    if (!ctx.config.runTraceParser) {
        markStageSkipped(stage, "runTraceParser is false");
        logger.stageSkipped("TraceParser", "disabled in config");
        return;
    }
    markStageStart(stage);
    logger.stageStart("TraceParser", `analyzing ${ctx.config.routes.length} route(s)`);
    let hasAtLeastOneSuccess = false;
    for (const route of ctx.config.routes) {
        const bundle = ctx.routeArtifacts.get(route.url);
        if (!bundle)
            continue;
        try {
            // ── Read artifacts explicitly from PipelineContext paths ────────────────
            let lhrContent;
            let harContent;
            if (bundle.lighthouse.jsonPath) {
                lhrContent = readFileSync(bundle.lighthouse.jsonPath, "utf-8");
                logger.info(`  LHR: ${bundle.lighthouse.jsonPath}`);
            }
            else {
                logger.info(`  No LHR available for ${route.url} — running partial analysis`);
            }
            if (bundle.playwright.harPath) {
                harContent = readFileSync(bundle.playwright.harPath, "utf-8");
                logger.info(`  HAR: ${bundle.playwright.harPath}`);
            }
            // ── Parse ───────────────────────────────────────────────────────────────
            const result = parseTrace({
                lhr: lhrContent,
                harJson: harContent,
                url: route.url,
            });
            // ── Persist ─────────────────────────────────────────────────────────────
            const outputPath = join(bundle.routeDir, "intelligence", "bottlenecks.json");
            writeFileSync(outputPath, JSON.stringify(result, null, 2), "utf-8");
            // ── Store back in context ───────────────────────────────────────────────
            bundle.traceParser = { outputPath, result };
            logger.route(route.url);
            logger.metric("  Data quality  ", result.dataQuality);
            logger.metric("  LCP          ", result.vitals.lcp, "ms");
            logger.metric("  Bottleneck   ", result.correlations.primaryBottleneck);
            logger.artifact("  Output       ", outputPath);
            hasAtLeastOneSuccess = true;
        }
        catch (err) {
            const errMsg = err instanceof Error ? err.message : String(err);
            logger.stageFailed(`TraceParser [${route.url}]`, errMsg, false);
        }
    }
    if (!hasAtLeastOneSuccess && !ctx.config.continueOnFailure) {
        const err = new Error("TraceParser failed for all routes");
        markStageFailed(stage, err);
        throw err;
    }
    markStageDone(stage, stage.durationMs ?? 0);
    logger.stageDone("TraceParser", stage.durationMs ?? 0);
}
//# sourceMappingURL=trace-parser-stage.js.map