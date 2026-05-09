/**
 * @file aggregator.ts
 * @description Main analytics aggregator — orchestrates all normalization,
 * correlation, deduplication, and quick win stages into one canonical output.
 *
 * EXECUTION ORDER:
 *   1. Normalize Core Web Vitals (consistent units + ratings)
 *   2. Normalize main thread / scripting / rendering signals
 *   3. Normalize bundle intelligence
 *   4. Run cross-system correlation → PerformanceRisks
 *   5. Resolve primary bottleneck
 *   6. Generate quick wins
 *   7. Deduplicate + rank AI signals from all sources
 *   8. Assess data quality
 *   9. Assemble canonical TraceLensIntelligenceReport
 */
import type { AggregatorInput, TraceLensIntelligenceReport } from "./types.js";
/**
 * Aggregate all pipeline intelligence into one canonical normalized report.
 *
 * @param input - The pipeline result for a single route
 * @returns     - The canonical TraceLensIntelligenceReport
 */
export declare function aggregate(input: AggregatorInput): TraceLensIntelligenceReport;
//# sourceMappingURL=aggregator.d.ts.map