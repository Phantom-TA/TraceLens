/**
 * @file parser.ts
 * @description Main orchestrator for the bundle-analyzer module.
 *
 * EXECUTION ORDER:
 *   1. Parse + validate input (webpack stats / SME / both)
 *   2. Normalize into unified internal representation
 *   3. Run all analyzers:
 *      a. Dependency sizes + classification
 *      b. Duplicate package detection
 *      c. Route chunk analysis
 *      d. Performance signal computation
 *      e. Hydration risk assessment
 *   4. Correlate with trace-parser data (if provided)
 *   5. Build AI signal list
 *   6. Assemble final BundleAnalysisResult
 *
 * DATA QUALITY:
 *   "webpack-stats" → richest, chunk relationships + module reasons
 *   "source-map"    → accurate sizes, no chunk info
 *   "combined"      → both merged (sizes from SME, structure from stats)
 *   "partial"       → only partial data available
 */
import type { BundleAnalysisInput, BundleAnalysisResult } from "./types.js";
/**
 * Analyzes a JavaScript bundle and produces a compact, AI-ready
 * BundleAnalysisResult summary.
 *
 * @param input - BundleAnalysisInput with at least one of webpackStats / sourceMapExplorer
 * @returns     - Complete BundleAnalysisResult
 *
 * @throws {Error} If no valid input is provided
 *
 * @example
 * ```ts
 * import { analyze } from "@tracelens/bundle-analyzer";
 * import { readFileSync } from "fs";
 *
 * const result = analyze({
 *   webpackStats: readFileSync("stats.json", "utf-8"),
 *   framework: "next.js",
 * });
 *
 * console.log(result.correlations.primaryIssue);
 * console.log(result.aiSignals);
 * ```
 */
export declare function analyze(input: BundleAnalysisInput): BundleAnalysisResult;
//# sourceMappingURL=parser.d.ts.map