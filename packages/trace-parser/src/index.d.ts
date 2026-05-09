/**
 * @file index.ts
 * @description Public API surface for @tracelens/trace-parser.
 *
 * Only exports that are part of the module's contract are listed here.
 * Internal helpers (filters, extractors, correlator) are NOT re-exported.
 *
 * Consumers should import exclusively from "@tracelens/trace-parser".
 */
export { parse } from "./parser.js";
export type { ParseInput, RawChromeTrace, RawTraceEvent, LighthouseLHRInput, HARLog, HAREntry, LongTask, LongTaskAttribution, LCPCandidate, RenderBlockingResource, HydrationSignal, ScriptingBottleneck, RenderingTimeline, MainThreadSummary, BundleSignals, CorrelationInsights, BottleneckCategory, ParsedTraceBottlenecks, } from "./types.js";
//# sourceMappingURL=index.d.ts.map