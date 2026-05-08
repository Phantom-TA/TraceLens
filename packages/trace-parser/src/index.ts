/**
 * @file index.ts
 * @description Public API surface for @tracelens/trace-parser.
 *
 * Only exports that are part of the module's contract are listed here.
 * Internal helpers (filters, extractors, correlator) are NOT re-exported.
 *
 * Consumers should import exclusively from "@tracelens/trace-parser".
 */

// ─── Primary Entry Point ───────────────────────────────────────────────────────

export { parse } from "./parser.js";

// ─── Types (Public Contract) ───────────────────────────────────────────────────

export type {
  // Input types
  ParseInput,
  RawChromeTrace,
  RawTraceEvent,
  LighthouseLHRInput,
  HARLog,
  HAREntry,

  // Extracted signal types
  LongTask,
  LongTaskAttribution,
  LCPCandidate,
  RenderBlockingResource,
  HydrationSignal,
  ScriptingBottleneck,
  RenderingTimeline,
  MainThreadSummary,
  BundleSignals,
  CorrelationInsights,
  BottleneckCategory,

  // Final output
  ParsedTraceBottlenecks,
} from "./types.js";
