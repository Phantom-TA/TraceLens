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

import { readFileSync, writeFileSync } from "fs";
import { join, resolve } from "path";
import { analyze as analyzeBundle } from "../../../bundle-analyzer/src/index.js";
import type { BundleAnalysisInput } from "../../../bundle-analyzer/src/index.js";
import type { PipelineContext } from "../types.js";
import { markStageDone, markStageFailed, markStageSkipped, markStageStart } from "../session.js";
import { logger } from "../logger.js";

export async function runBundleAnalyzerStage(ctx: PipelineContext): Promise<void> {
  const stage = ctx.stages.bundleAnalyzer;

  if (!ctx.config.runBundleAnalyzer || !ctx.config.bundle) {
    markStageSkipped(stage, "bundle config not provided");
    logger.stageSkipped("BundleAnalyzer", "no webpack stats / SME config provided");
    return;
  }

  markStageStart(stage);
  logger.stageStart("BundleAnalyzer", "analyzing bundle composition");

  try {
    const bundleConfig = ctx.config.bundle;

    // ── Read bundle inputs ──────────────────────────────────────────────────
    let webpackStatsContent: string | undefined;
    let smeContent: string | undefined;

    if (bundleConfig.webpackStatsPath) {
      const p = resolve(bundleConfig.webpackStatsPath);
      webpackStatsContent = readFileSync(p, "utf-8");
      logger.info(`  Webpack stats: ${p}`);
    }

    if (bundleConfig.sourceMapExplorerPath) {
      const p = resolve(bundleConfig.sourceMapExplorerPath);
      smeContent = readFileSync(p, "utf-8");
      logger.info(`  SME output: ${p}`);
    }

    if (!webpackStatsContent && !smeContent) {
      throw new Error("No readable bundle input found. Check webpackStatsPath / sourceMapExplorerPath.");
    }

    // ── For each route, run bundle analysis with its trace context ───────────
    for (const route of ctx.config.routes) {
      const routeBundle = ctx.routeArtifacts.get(route.url);
      if (!routeBundle) continue;

      // Build trace context from trace-parser result (explicit passing, no search)
      const traceResult = routeBundle.traceParser.result;
      const traceContext: BundleAnalysisInput["traceBottlenecks"] = traceResult
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

      const input: BundleAnalysisInput = {
        webpackStats: webpackStatsContent,
        sourceMapExplorer: smeContent,
        traceBottlenecks: traceContext,
        framework: bundleConfig.framework,
        projectName: bundleConfig.projectName,
      };

      const result = analyzeBundle(input);

      // ── Persist ─────────────────────────────────────────────────────────────
      const outputPath = join(routeBundle.routeDir, "intelligence", "bundle-analysis.json");
      writeFileSync(outputPath, JSON.stringify(result, null, 2), "utf-8");

      // ── Store back in context ─────────────────────────────────────────────
      routeBundle.bundleAnalyzer = { outputPath, result };

      logger.route(route.url);
      logger.metric("  Initial JS   ", result.initialBundleSizeKB, "KB");
      logger.metric("  Primary issue", result.correlations.primaryIssue);
      logger.metric("  Duplicates   ", result.duplicatePackages.length);
      logger.artifact("  Output       ", outputPath);
    }

    markStageDone(stage, stage.durationMs ?? 0);
    logger.stageDone("BundleAnalyzer", stage.durationMs ?? 0);
  } catch (err) {
    markStageFailed(stage, err);
    logger.stageFailed("BundleAnalyzer", stage.error ?? "unknown error", !ctx.config.continueOnFailure);
    if (!ctx.config.continueOnFailure) throw err;
  }
}
