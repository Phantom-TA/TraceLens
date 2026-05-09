/**
 * @file parser.ts
 * @description Main orchestrator for the trace-parser module.
 *
 * EXECUTION ORDER:
 *   1. Parse + validate input (trace JSON / LHR / HAR)
 *   2. Discover renderer thread + navigationStart reference
 *   3. Filter raw events → keep only relevant events (~5-10% of total)
 *   4. Run all extractors in dependency order:
 *      a. Long tasks + main thread summary
 *      b. LCP candidate
 *      c. Render-blocking resources
 *      d. Hydration signals
 *      e. Scripting bottlenecks
 *      f. Rendering timeline + bundle signals
 *   5. Correlate signals → primary bottleneck diagnosis
 *   6. Build AI signal list
 *   7. Assemble final ParsedTraceBottlenecks output
 *
 * DATA QUALITY LEVELS:
 *   "full"    — Chrome trace + LHR + HAR
 *   "trace"   — Chrome trace only
 *   "lhr"     — Lighthouse LHR only
 *   "partial" — Incomplete, missing key data
 */
import type { ParseInput, ParsedTraceBottlenecks } from "./types.js";
/**
 * Parses a Chrome trace and/or Lighthouse LHR into a compact,
 * AI-ready ParsedTraceBottlenecks summary.
 *
 * This is the single entry point for the trace-parser module.
 *
 * @param input - ParseInput containing at least one of: traceJson, lhr, harJson
 * @returns     - Complete ParsedTraceBottlenecks summary
 *
 * @throws {Error} If both traceJson and lhr are absent or unparseable
 *
 * @example
 * ```ts
 * import { parse } from "@tracelens/trace-parser";
 * import { readFileSync } from "fs";
 *
 * const result = await parse({
 *   lhr: readFileSync("report.json", "utf-8"),
 * });
 *
 * console.log(result.correlations.primaryBottleneck);
 * console.log(result.aiSignals);
 * ```
 */
export declare function parse(input: ParseInput): ParsedTraceBottlenecks;
//# sourceMappingURL=parser.d.ts.map