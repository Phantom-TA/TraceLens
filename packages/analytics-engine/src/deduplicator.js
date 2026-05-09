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
const MAX_SIGNALS = 20;
// ─── Signal Prioritization Keys ───────────────────────────────────────────────
/** Keywords that indicate a high-priority, high-impact signal */
const HIGH_PRIORITY_KEYWORDS = [
    "primary bottleneck",
    "LCP",
    "FCP",
    "TBT",
    "blocking time",
    "bundle",
    "duplicate",
    "hydration",
    "render-blocking",
    "long task",
];
function signalPriority(signal) {
    const lower = signal.toLowerCase();
    for (let i = 0; i < HIGH_PRIORITY_KEYWORDS.length; i++) {
        if (lower.includes(HIGH_PRIORITY_KEYWORDS[i].toLowerCase()))
            return i;
    }
    return HIGH_PRIORITY_KEYWORDS.length;
}
/** Whether a signal contains quantitative data */
function hasQuantitativeData(signal) {
    return /\d+(ms|KB|kb|%|\/100)/.test(signal);
}
// ─── Signal Normalization ─────────────────────────────────────────────────────
/** Apply consistent normalization to a raw signal string */
function normalizeSignal(signal) {
    return signal
        .trim()
        // Remove trailing periods for consistency — we'll add them back
        .replace(/\.$/, "")
        // Fix floating-point precision noise
        .replace(/(\d+\.\d{3,})(ms)/g, (_, num, unit) => `${Math.round(Number(num))}${unit}`)
        // Capitalize first letter
        .replace(/^[a-z]/, (c) => c.toUpperCase());
}
// ─── Deduplication ─────────────────────────────────────────────────────────────
/**
 * Deduplicates by checking if two signals share the same core concept.
 * Uses first 40 chars of normalized content as semantic key.
 */
function semanticKey(signal) {
    return signal
        .toLowerCase()
        .replace(/[^a-z0-9 ]/g, "")
        .slice(0, 40)
        .trim();
}
export function deduplicateAndRankSignals(...signalSets) {
    const allSignals = [];
    for (const set of signalSets) {
        if (!set)
            continue;
        for (const raw of set) {
            const normalized = normalizeSignal(raw);
            allSignals.push({
                signal: normalized,
                priority: signalPriority(normalized),
                hasData: hasQuantitativeData(normalized),
            });
        }
    }
    // Sort: lower priority number = more important
    allSignals.sort((a, b) => {
        if (a.priority !== b.priority)
            return a.priority - b.priority;
        // Prefer signals with numbers (more specific)
        if (a.hasData !== b.hasData)
            return a.hasData ? -1 : 1;
        return 0;
    });
    // Deduplicate by semantic key — keep first (highest priority) occurrence
    const seen = new Set();
    const result = [];
    for (const item of allSignals) {
        const key = semanticKey(item.signal);
        if (!seen.has(key)) {
            seen.add(key);
            result.push(item.signal);
        }
        if (result.length >= MAX_SIGNALS)
            break;
    }
    return result;
}
// ─── Data Quality Assessment ───────────────────────────────────────────────────
export function assessDataQuality(input) {
    const sources = [];
    if (input.hasPlaywright)
        sources.push("playwright");
    if (input.hasLighthouse)
        sources.push("lighthouse");
    if (input.hasTraceParser)
        sources.push("trace-parser");
    if (input.hasBundleAnalysis)
        sources.push("bundle-analyzer");
    const confidence = sources.length >= 4 ? "high" :
        sources.length >= 2 ? "medium" : "low";
    let note = null;
    if (!input.hasTraceParser && !input.hasLighthouse) {
        note = "No performance data available — analysis is incomplete";
    }
    else if (!input.hasLighthouse) {
        note = "No Lighthouse data — Core Web Vitals estimated from trace only";
    }
    else if (!input.hasTraceParser) {
        note = "No Chrome trace — bottleneck analysis based on Lighthouse LHR only";
    }
    else if (!input.hasBundleAnalysis) {
        note = "No bundle analysis — provide webpack stats for complete JS intelligence";
    }
    return {
        sources,
        ...input,
        confidence,
        note,
    };
}
//# sourceMappingURL=deduplicator.js.map