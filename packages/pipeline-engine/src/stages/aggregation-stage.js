/**
 * @file stages/aggregation-stage.ts
 * @description Pipeline Stage 5: Output aggregation.
 *
 * RESPONSIBILITY:
 *   - Merge all per-route analysis results from PipelineContext
 *   - Produce the canonical TraceLensResult
 *   - Merge aiSignals from all stages (trace-parser + bundle-analyzer)
 *   - Write tracelens-result.json to the session root
 *
 * This is the FINAL stage output that the AI engine and dashboard consume.
 * It is a pure transformation — reads from ctx, writes JSON.
 */
import { writeFileSync } from "fs";
import { join } from "path";
import { markStageDone, markStageFailed, markStageStart } from "../session.js";
import { logger } from "../logger.js";
const MAX_MERGED_SIGNALS = 30;
export async function runAggregationStage(ctx, sessionStart) {
    const stage = ctx.stages.aggregation;
    markStageStart(stage);
    logger.stageStart("Aggregation", "merging all stage outputs");
    try {
        const routes = [];
        for (const routeConfig of ctx.config.routes) {
            const bundle = ctx.routeArtifacts.get(routeConfig.url);
            if (!bundle)
                continue;
            routes.push(buildRouteResult(bundle));
        }
        const completedAt = new Date().toISOString();
        const durationMs = new Date(completedAt).getTime() - new Date(sessionStart).getTime();
        const success = isSuccess(ctx);
        const result = {
            sessionId: ctx.sessionId,
            startedAt: sessionStart,
            completedAt,
            durationMs,
            success,
            stages: ctx.stages,
            routes,
            config: ctx.config,
            resultPath: null,
        };
        // ── Persist canonical result ──────────────────────────────────────────────
        const resultPath = join(ctx.sessionDir, "tracelens-result.json");
        writeFileSync(resultPath, JSON.stringify(result, null, 2), "utf-8");
        result.resultPath = resultPath;
        markStageDone(stage, stage.durationMs ?? 0);
        logger.stageDone("Aggregation", stage.durationMs ?? 0);
        logger.artifact("  Result", resultPath);
        return result;
    }
    catch (err) {
        markStageFailed(stage, err);
        logger.stageFailed("Aggregation", stage.error ?? "unknown error", true);
        throw err;
    }
}
// ─── Helpers ───────────────────────────────────────────────────────────────────
function buildRouteResult(bundle) {
    const traceResult = bundle.traceParser.result;
    const bundleResult = bundle.bundleAnalyzer.result;
    // Merge AI signals from all stages (trace-parser + bundle-analyzer)
    const mergedSignals = [];
    if (traceResult?.aiSignals) {
        mergedSignals.push(...traceResult.aiSignals);
    }
    if (bundleResult?.aiSignals) {
        // Deduplicate overlapping signals before merging
        for (const sig of bundleResult.aiSignals) {
            if (!mergedSignals.some((existing) => existing.slice(0, 30) === sig.slice(0, 30))) {
                mergedSignals.push(sig);
            }
        }
    }
    // Use Lighthouse vitals as the primary source (most reliable)
    const vitals = bundle.lighthouse.vitals ?? {
        fcp: traceResult?.vitals.fcp ?? null,
        lcp: traceResult?.vitals.lcp ?? null,
        tbt: traceResult?.vitals.tbt ?? null,
        cls: traceResult?.vitals.cls ?? null,
        tti: traceResult?.vitals.tti ?? null,
        ttfb: traceResult?.vitals.ttfb ?? null,
        speedIndex: traceResult?.vitals.speedIndex ?? null,
    };
    return {
        url: bundle.url,
        label: bundle.label,
        vitals: {
            ...vitals,
            performanceScore: bundle.lighthouse.performanceScore,
        },
        bottlenecks: traceResult ?? null,
        bundle: bundleResult ?? null,
        artifacts: {
            screenshotPath: bundle.playwright.screenshotPath,
            tracePath: bundle.playwright.tracePath,
            harPath: bundle.playwright.harPath,
            lighthouseJsonPath: bundle.lighthouse.jsonPath,
            lighthouseHtmlPath: bundle.lighthouse.htmlPath,
            bottlenecksJsonPath: bundle.traceParser.outputPath,
            bundleJsonPath: bundle.bundleAnalyzer.outputPath,
        },
        aiSignals: mergedSignals.slice(0, MAX_MERGED_SIGNALS),
        primaryBottleneck: traceResult?.correlations.primaryBottleneck ?? null,
    };
}
function isSuccess(ctx) {
    const stages = ctx.stages;
    return (stages.playwright.status !== "failed" &&
        stages.lighthouse.status !== "failed" &&
        stages.aggregation.status !== "failed");
}
//# sourceMappingURL=aggregation-stage.js.map