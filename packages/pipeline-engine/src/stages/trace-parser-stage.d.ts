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
import type { PipelineContext } from "../types.js";
export declare function runTraceParserStage(ctx: PipelineContext): Promise<void>;
//# sourceMappingURL=trace-parser-stage.d.ts.map