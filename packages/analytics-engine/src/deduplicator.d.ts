/**
 * @file deduplicator.ts
 * @description Signal deduplication and AI signal normalization.
 *
 * Multiple analysis tools (Lighthouse, trace-parser, bundle-analyzer) often
 * produce overlapping signals. This module:
 *   1. Deduplicates overlapping signals by semantic similarity
 *   2. Normalizes signal phrasing (consistent tense, units, capitalization)
 *   3. Prioritizes signals by impact (most actionable first)
 *   4. Caps total signals at MAX_SIGNALS for LLM efficiency
 *
 * DEDUP STRATEGY:
 *   - If two signals share the same "semantic prefix" (first 30 chars), keep the more specific one
 *   - Prefer signals that include quantitative data (ms, KB numbers)
 *   - Prefer signals from combined correlation over single-source signals
 */
export declare function deduplicateAndRankSignals(...signalSets: (string[] | null | undefined)[]): string[];
export declare function assessDataQuality(input: {
    hasLighthouse: boolean;
    hasTraceParser: boolean;
    hasBundleAnalysis: boolean;
    hasPlaywright: boolean;
}): import("./types.js").DataQualityReport;
//# sourceMappingURL=deduplicator.d.ts.map