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
import type { PipelineConfig, TraceLensResult } from "./types.js";
/**
 * Runs the complete TraceLens performance intelligence pipeline.
 *
 * @param config - Pipeline configuration (only `routes` is required)
 * @returns      - Canonical TraceLensResult with all intelligence merged
 */
export declare function runPipeline(config: PipelineConfig): Promise<TraceLensResult>;
//# sourceMappingURL=pipeline.d.ts.map