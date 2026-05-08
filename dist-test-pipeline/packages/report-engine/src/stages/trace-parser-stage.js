"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.runTraceParserStage = runTraceParserStage;
const fs_1 = require("fs");
const path_1 = require("path");
const index_1 = require("../../trace-parser/src/index");
const session_js_1 = require("../session.js");
const logger_js_1 = require("../logger.js");
async function runTraceParserStage(ctx) {
    const stage = ctx.stages.traceParser;
    if (!ctx.config.runTraceParser) {
        (0, session_js_1.markStageSkipped)(stage, "runTraceParser is false");
        logger_js_1.logger.stageSkipped("TraceParser", "disabled in config");
        return;
    }
    (0, session_js_1.markStageStart)(stage);
    logger_js_1.logger.stageStart("TraceParser", `analyzing ${ctx.config.routes.length} route(s)`);
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
                lhrContent = (0, fs_1.readFileSync)(bundle.lighthouse.jsonPath, "utf-8");
                logger_js_1.logger.info(`  LHR: ${bundle.lighthouse.jsonPath}`);
            }
            else {
                logger_js_1.logger.info(`  No LHR available for ${route.url} — running partial analysis`);
            }
            if (bundle.playwright.harPath) {
                harContent = (0, fs_1.readFileSync)(bundle.playwright.harPath, "utf-8");
                logger_js_1.logger.info(`  HAR: ${bundle.playwright.harPath}`);
            }
            // ── Parse ───────────────────────────────────────────────────────────────
            const result = (0, index_1.parse)({
                lhr: lhrContent,
                harJson: harContent,
                url: route.url,
            });
            // ── Persist ─────────────────────────────────────────────────────────────
            const outputPath = (0, path_1.join)(bundle.routeDir, "intelligence", "bottlenecks.json");
            (0, fs_1.writeFileSync)(outputPath, JSON.stringify(result, null, 2), "utf-8");
            // ── Store back in context ───────────────────────────────────────────────
            bundle.traceParser = { outputPath, result };
            logger_js_1.logger.route(route.url);
            logger_js_1.logger.metric("  Data quality  ", result.dataQuality);
            logger_js_1.logger.metric("  LCP          ", result.vitals.lcp, "ms");
            logger_js_1.logger.metric("  Bottleneck   ", result.correlations.primaryBottleneck);
            logger_js_1.logger.artifact("  Output       ", outputPath);
            hasAtLeastOneSuccess = true;
        }
        catch (err) {
            const errMsg = err instanceof Error ? err.message : String(err);
            logger_js_1.logger.stageFailed(`TraceParser [${route.url}]`, errMsg, false);
        }
    }
    if (!hasAtLeastOneSuccess && !ctx.config.continueOnFailure) {
        const err = new Error("TraceParser failed for all routes");
        (0, session_js_1.markStageFailed)(stage, err);
        throw err;
    }
    (0, session_js_1.markStageDone)(stage, stage.durationMs ?? 0);
    logger_js_1.logger.stageDone("TraceParser", stage.durationMs ?? 0);
}
