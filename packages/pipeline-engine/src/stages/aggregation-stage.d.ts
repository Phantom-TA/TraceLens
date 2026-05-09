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
import type { PipelineContext, TraceLensResult } from "../types.js";
export declare function runAggregationStage(ctx: PipelineContext, sessionStart: string): Promise<TraceLensResult>;
//# sourceMappingURL=aggregation-stage.d.ts.map