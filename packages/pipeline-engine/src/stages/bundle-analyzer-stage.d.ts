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
import type { PipelineContext } from "../types.js";
export declare function runBundleAnalyzerStage(ctx: PipelineContext): Promise<void>;
//# sourceMappingURL=bundle-analyzer-stage.d.ts.map