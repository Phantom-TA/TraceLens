/**
 * @file correlator.ts
 * @description Bundle-to-performance correlation engine.
 *
 * Cross-references bundle signals with trace-parser runtime data
 * (when available) to produce causal explanations:
 * "This 2.4MB initial bundle is causing your 27s TTI."
 */
import type { BundleAnalysisInput, BundleCorrelationInsights, BundleDependency, BundlePerformanceSignals, DuplicatePackage } from "./types.js";
/**
 * Correlates bundle signals with performance data.
 */
export declare function correlateBundleSignals(initialSizeKB: number, signals: BundlePerformanceSignals, deps: BundleDependency[], duplicates: DuplicatePackage[], trace: BundleAnalysisInput["traceBottlenecks"]): BundleCorrelationInsights;
//# sourceMappingURL=correlator.d.ts.map