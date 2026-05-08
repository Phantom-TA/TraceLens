"use strict";
/**
 * @file stages/lighthouse-stage.ts
 * @description Pipeline Stage 2: Lighthouse performance audit.
 *
 * RESPONSIBILITY:
 *   - Run Lighthouse for all configured routes
 *   - Write JSON + HTML reports to the session's lighthouse directory
 *   - Populate ctx.routeArtifacts[url].lighthouse with explicit paths + vitals
 *
 * EXECUTION ORDER:
 *   Lighthouse runs AFTER Playwright, against the SAME URLs.
 *   Both use separate, clean browser instances (no resource contention).
 *   They are NOT racing — strictly sequential within a session.
 *
 * DIRECTORY OVERRIDE:
 *   Lighthouse writes to: <sessionDir>/<routeSlug>/lighthouse/
 *   This is controlled by passing an explicit outputDir per route.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.runLighthouseStage = runLighthouseStage;
const index_1 = require("../../lighthouse-runner/src/index");
const session_js_1 = require("../session.js");
const logger_js_1 = require("../logger.js");
const path_1 = require("path");
async function runLighthouseStage(ctx) {
    const stage = ctx.stages.lighthouse;
    if (!ctx.config.runLighthouse) {
        (0, session_js_1.markStageSkipped)(stage, "runLighthouse is false");
        logger_js_1.logger.stageSkipped("Lighthouse", "disabled in config");
        return;
    }
    (0, session_js_1.markStageStart)(stage);
    logger_js_1.logger.stageStart("Lighthouse", `auditing ${ctx.config.routes.length} route(s), preset: ${ctx.config.device.mode}`);
    try {
        const result = await (0, index_1.run)({
            routes: ctx.config.routes.map((r) => ({ url: r.url, label: r.label })),
            preset: ctx.config.device.mode === "mobile" ? "mobile" : "desktop",
            formats: ["json", "html"],
            // Point to session's lighthouse directory
            outputDir: (0, path_1.join)(ctx.sessionDir, "_lighthouse"),
            runs: ctx.config.runs,
        });
        // ── Map results back into PipelineContext ─────────────────────────────────
        for (const routeSummary of result.routes) {
            const bundle = ctx.routeArtifacts.get(routeSummary.route.url);
            if (!bundle)
                continue;
            // Take the first successful run's artifacts
            const firstRun = routeSummary.runs.find((r) => r.success);
            if (!firstRun) {
                logger_js_1.logger.info(`  No successful Lighthouse run for ${routeSummary.route.url}`);
                continue;
            }
            bundle.lighthouse = {
                jsonPath: firstRun.artifacts.jsonPath,
                htmlPath: firstRun.artifacts.htmlPath,
                vitals: {
                    fcp: routeSummary.averages.fcp,
                    lcp: routeSummary.averages.lcp,
                    tbt: routeSummary.averages.tbt,
                    cls: routeSummary.averages.cls,
                    tti: routeSummary.averages.tti,
                    ttfb: routeSummary.averages.ttfb,
                    speedIndex: routeSummary.averages.speedIndex,
                },
                performanceScore: routeSummary.averages.performanceScore,
            };
            logger_js_1.logger.route(routeSummary.route.url);
            logger_js_1.logger.metric("  Perf Score", bundle.lighthouse.performanceScore !== null
                ? Math.round((bundle.lighthouse.performanceScore ?? 0) * 100)
                : null, "/100");
            logger_js_1.logger.metric("  LCP", bundle.lighthouse.vitals?.lcp ?? null, "ms");
            logger_js_1.logger.metric("  FCP", bundle.lighthouse.vitals?.fcp ?? null, "ms");
            logger_js_1.logger.metric("  TBT", bundle.lighthouse.vitals?.tbt ?? null, "ms");
            logger_js_1.logger.artifact("  LHR JSON  ", bundle.lighthouse.jsonPath);
        }
        (0, session_js_1.markStageDone)(stage, stage.durationMs ?? 0);
        logger_js_1.logger.stageDone("Lighthouse", stage.durationMs ?? 0, `${result.routes.length} route(s) audited`);
    }
    catch (err) {
        (0, session_js_1.markStageFailed)(stage, err);
        logger_js_1.logger.stageFailed("Lighthouse", stage.error ?? "unknown error", !ctx.config.continueOnFailure);
        if (!ctx.config.continueOnFailure)
            throw err;
    }
}
