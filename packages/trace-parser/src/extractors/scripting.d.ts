/**
 * @file extractors/scripting.ts
 * @description JS execution bottleneck analysis.
 *
 * Groups all EvaluateScript / FunctionCall events by script URL,
 * sums their execution times, and identifies which scripts are the
 * biggest consumers of main-thread time.
 *
 * Also computes BundleSignals: whether heavy JS evaluated before FCP,
 * indicating a bundle-size problem affecting render performance.
 */
import type { BundleSignals, LighthouseLHRInput, RawTraceEvent, RendererThread, RenderingTimeline, ScriptingBottleneck } from "../types.js";
/**
 * Extracts scripting bottlenecks from Chrome trace events.
 * Groups by script URL and sums execution time.
 *
 * @param events    - Pre-filtered trace events (main thread)
 * @param renderer  - Renderer thread identity
 * @param longTaskScripts - Script URLs identified as long-task causes
 * @returns         - Array of ScriptingBottleneck sorted by totalExecutionMs desc
 */
export declare function extractScriptingBottlenecks(events: RawTraceEvent[], renderer: RendererThread, longTaskScripts: Set<string>): ScriptingBottleneck[];
/**
 * Extracts scripting bottlenecks from Lighthouse LHR bootup-time audit.
 * Used when no raw trace is available.
 */
export declare function extractScriptingFromLHR(lhr: LighthouseLHRInput): ScriptingBottleneck[];
/**
 * Computes rendering timeline (paint, layout, style recalc).
 */
export declare function extractRenderingTimeline(events: RawTraceEvent[], renderer: RendererThread): RenderingTimeline;
/**
 * Computes bundle signals from scripting data + FCP timing.
 */
export declare function computeBundleSignals(events: RawTraceEvent[], renderer: RendererThread, fcpMs: number | null, scriptingBottlenecks: ScriptingBottleneck[]): BundleSignals;
//# sourceMappingURL=scripting.d.ts.map