"use strict";
/**
 * @file stages/bundle-analyzer-stage.ts
 * @description Pipeline Stage 4: Bundle analysis.
 *
 * RESPONSIBILITY:
 *   - Read webpack stats / SME JSON from config-specified paths
 *   - Cross-reference with trace-parser results from ctx (no search)
 *   - Run bundle-analyzer
 *   - Write bundle-analysis.json to <routeDir>/intelligence/
 *   - Populate ctx.routeArtifacts[url].bundleAnalyzer with result + path
 *
 * IMPORTANT:
 *   Bundle analysis is SESSION-LEVEL not ROUTE-LEVEL.
 *   One webpack build serves all routes of an app.
 *   We still store per-route for consistency (all routes get the same
 *   bundle result but with route-specific trace correlation).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.runBundleAnalyzerStage = runBundleAnalyzerStage;
const fs_1 = require("fs");
const path_1 = require("path");
const index_1 = require("../../bundle-analyzer/src/index");
const session_js_1 = require("../session.js");
const logger_js_1 = require("../logger.js");
async function runBundleAnalyzerStage(ctx) {
    const stage = ctx.stages.bundleAnalyzer;
    if (!ctx.config.runBundleAnalyzer || !ctx.config.bundle) {
        (0, session_js_1.markStageSkipped)(stage, "bundle config not provided");
        logger_js_1.logger.stageSkipped("BundleAnalyzer", "no webpack stats / SME config provided");
        return;
    }
    (0, session_js_1.markStageStart)(stage);
    logger_js_1.logger.stageStart("BundleAnalyzer", "analyzing bundle composition");
    try {
        const bundleConfig = ctx.config.bundle;
        // ── Read bundle inputs ──────────────────────────────────────────────────
        let webpackStatsContent;
        let smeContent;
        if (bundleConfig.webpackStatsPath) {
            const p = (0, path_1.resolve)(bundleConfig.webpackStatsPath);
            webpackStatsContent = (0, fs_1.readFileSync)(p, "utf-8");
            logger_js_1.logger.info(`  Webpack stats: ${p}`);
        }
        if (bundleConfig.sourceMapExplorerPath) {
            const p = (0, path_1.resolve)(bundleConfig.sourceMapExplorerPath);
            smeContent = (0, fs_1.readFileSync)(p, "utf-8");
            logger_js_1.logger.info(`  SME output: ${p}`);
        }
        if (!webpackStatsContent && !smeContent) {
            throw new Error("No readable bundle input found. Check webpackStatsPath / sourceMapExplorerPath.");
        }
        // ── For each route, run bundle analysis with its trace context ───────────
        for (const route of ctx.config.routes) {
            const routeBundle = ctx.routeArtifacts.get(route.url);
            if (!routeBundle)
                continue;
            // Build trace context from trace-parser result (explicit passing, no search)
            const traceResult = routeBundle.traceParser.result;
            const traceContext = traceResult
                ? {
                    vitals: {
                        fcp: traceResult.vitals.fcp,
                        lcp: traceResult.vitals.lcp,
                        tbt: traceResult.vitals.tbt,
                    },
                    bundleSignals: {
                        jsBeforeFcpMs: traceResult.bundleSignals.jsBeforeFcpMs,
                        largeInitialJS: traceResult.bundleSignals.largeInitialJS,
                    },
                    scriptingBottlenecks: traceResult.scriptingBottlenecks.map((s) => ({
                        url: s.url,
                        totalExecutionMs: s.totalExecutionMs,
                    })),
                }
                : undefined;
            const input = {
                webpackStats: webpackStatsContent,
                sourceMapExplorer: smeContent,
                traceBottlenecks: traceContext,
                framework: bundleConfig.framework,
                projectName: bundleConfig.projectName,
            };
            const result = (0, index_1.analyze)(input);
            // ── Persist ─────────────────────────────────────────────────────────────
            const outputPath = (0, path_1.join)(routeBundle.routeDir, "intelligence", "bundle-analysis.json");
            (0, fs_1.writeFileSync)(outputPath, JSON.stringify(result, null, 2), "utf-8");
            // ── Store back in context ─────────────────────────────────────────────
            routeBundle.bundleAnalyzer = { outputPath, result };
            logger_js_1.logger.route(route.url);
            logger_js_1.logger.metric("  Initial JS   ", result.initialBundleSizeKB, "KB");
            logger_js_1.logger.metric("  Primary issue", result.correlations.primaryIssue);
            logger_js_1.logger.metric("  Duplicates   ", result.duplicatePackages.length);
            logger_js_1.logger.artifact("  Output       ", outputPath);
        }
        (0, session_js_1.markStageDone)(stage, stage.durationMs ?? 0);
        logger_js_1.logger.stageDone("BundleAnalyzer", stage.durationMs ?? 0);
    }
    catch (err) {
        (0, session_js_1.markStageFailed)(stage, err);
        logger_js_1.logger.stageFailed("BundleAnalyzer", stage.error ?? "unknown error", !ctx.config.continueOnFailure);
        if (!ctx.config.continueOnFailure)
            throw err;
    }
}
