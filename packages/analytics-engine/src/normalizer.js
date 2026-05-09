/**
 * @file normalizer.ts
 * @description Metric normalization layer.
 *
 * Converts raw pipeline output into consistent, rated, normalized metrics.
 *
 * THRESHOLDS (matching Google's Core Web Vitals standards):
 *   LCP: good <2500ms, poor >=4000ms
 *   FCP: good <1800ms, poor >=3000ms
 *   TBT: good <200ms,  poor >=600ms
 *   CLS: good <0.1,    poor >=0.25
 *   TTI: good <3800ms, poor >=7300ms
 *   TTFB:good <800ms,  poor >=1800ms
 */
// ─── CWV Thresholds ────────────────────────────────────────────────────────────
const THRESHOLDS = {
    lcp: { good: 2500, poor: 4000 },
    fcp: { good: 1800, poor: 3000 },
    tbt: { good: 200, poor: 600 },
    cls: { good: 0.1, poor: 0.25 },
    tti: { good: 3800, poor: 7300 },
    ttfb: { good: 800, poor: 1800 },
    speedIndex: { good: 3400, poor: 5800 },
};
export function rateMetric(key, value) {
    if (value === null)
        return "unknown";
    const t = THRESHOLDS[key];
    if (value <= t.good)
        return "good";
    if (value >= t.poor)
        return "poor";
    return "needs-improvement";
}
export function ratePerformanceScore(score) {
    if (score === null)
        return "unknown";
    if (score >= 90)
        return "good";
    if (score >= 50)
        return "needs-improvement";
    return "poor";
}
function overallRating(ratings) {
    const known = ratings.filter((r) => r !== "unknown");
    if (known.length === 0)
        return "unknown";
    if (known.some((r) => r === "poor"))
        return "poor";
    if (known.some((r) => r === "needs-improvement"))
        return "needs-improvement";
    return "good";
}
// ─── Core Web Vitals ───────────────────────────────────────────────────────────
export function normalizeCoreWebVitals(vitals) {
    const lcpRating = rateMetric("lcp", vitals.lcp);
    const fcpRating = rateMetric("fcp", vitals.fcp);
    const tbtRating = rateMetric("tbt", vitals.tbt);
    const clsRating = rateMetric("cls", vitals.cls);
    const ttiRating = rateMetric("tti", vitals.tti);
    const ttfbRating = rateMetric("ttfb", vitals.ttfb);
    const siRating = rateMetric("speedIndex", vitals.speedIndex);
    // Normalize performanceScore: pipeline returns 0–100 int or 0–1 float
    const rawScore = vitals.performanceScore;
    const normalizedScore = rawScore === null ? null
        : rawScore > 1 ? Math.round(rawScore)
            : Math.round(rawScore * 100);
    return {
        lcp: { value: vitals.lcp, unit: "ms", rating: lcpRating },
        fcp: { value: vitals.fcp, unit: "ms", rating: fcpRating },
        tbt: { value: vitals.tbt, unit: "ms", rating: tbtRating },
        cls: { value: vitals.cls, unit: "unitless", rating: clsRating },
        tti: { value: vitals.tti, unit: "ms", rating: ttiRating },
        ttfb: { value: vitals.ttfb, unit: "ms", rating: ttfbRating },
        speedIndex: { value: vitals.speedIndex, unit: "ms", rating: siRating },
        performanceScore: normalizedScore,
        overallRating: overallRating([lcpRating, fcpRating, tbtRating, clsRating]),
    };
}
// ─── Main Thread ───────────────────────────────────────────────────────────────
export function severityFromDuration(ms) {
    if (ms >= 1000)
        return "critical";
    if (ms >= 500)
        return "high";
    if (ms >= 200)
        return "medium";
    return "low";
}
export function normalizeMainThread(bottlenecks) {
    if (!bottlenecks) {
        return {
            totalBlockingMs: 0,
            totalMainThreadMs: 0,
            longTaskCount: 0,
            longestTaskMs: 0,
            categoryBreakdown: {},
            topLongTasks: [],
        };
    }
    const mt = bottlenecks.mainThread;
    const topLongTasks = bottlenecks.largestLongTasks
        .slice(0, 5)
        .map((t) => ({
        script: t.script,
        attributedScripts: t.attributedScripts ?? [],
        durationMs: t.duration,
        startTimeMs: t.startTime,
        attribution: t.attribution,
        severity: severityFromDuration(t.duration),
        lcpOverlap: t.lcpOverlap ?? false,
    }));
    return {
        totalBlockingMs: mt.totalBlockingMs,
        totalMainThreadMs: mt.totalMainThreadMs,
        longTaskCount: mt.longTaskCount,
        longestTaskMs: mt.longestTaskMs,
        categoryBreakdown: mt.categoryBreakdown,
        topLongTasks,
    };
}
// ─── Scripting Bottlenecks ─────────────────────────────────────────────────────
/** Clean up script URLs — strip query strings, shorten long paths */
function cleanScriptUrl(url) {
    if (!url || url === "Unattributable")
        return "Unattributable";
    try {
        const parsed = new URL(url);
        const parts = parsed.pathname.split("/");
        return parts[parts.length - 1] || parsed.hostname;
    }
    catch {
        // Not a full URL — already a short name
        return url.length > 60 ? url.slice(-60) : url;
    }
}
export function normalizeScriptingBottlenecks(bottlenecks) {
    if (!bottlenecks)
        return [];
    return bottlenecks.scriptingBottlenecks
        .filter((s) => s.totalExecutionMs > 50) // only significant scripts
        .slice(0, 8)
        .map((s) => ({
        url: cleanScriptUrl(s.url),
        totalExecutionMs: Math.round(s.totalExecutionMs),
        causedLongTask: s.causedLongTask,
        severity: severityFromDuration(s.totalExecutionMs),
    }));
}
// ─── Render-Blocking Resources ─────────────────────────────────────────────────
export function normalizeRenderBlockingResources(bottlenecks) {
    if (!bottlenecks)
        return [];
    return bottlenecks.renderBlockingResources
        .slice(0, 8)
        .map((r) => ({
        url: cleanScriptUrl(r.url),
        type: r.type,
        blockingMs: r.blockingMs,
        sizeKB: r.transferSizeKB,
    }));
}
// ─── LCP Candidate ─────────────────────────────────────────────────────────────
export function normalizeLCPCandidate(bottlenecks) {
    if (!bottlenecks?.lcpCandidate)
        return null;
    const lcp = bottlenecks.lcpCandidate;
    return {
        element: lcp.element,
        resourceUrl: lcp.resourceUrl,
        renderTimeMs: lcp.renderTime,
        sizeKB: lcp.sizeKB,
        wasRenderBlocked: lcp.wasRenderBlocked,
        source: lcp.source,
    };
}
// ─── Hydration ─────────────────────────────────────────────────────────────────
export function normalizeHydration(bottlenecks) {
    if (!bottlenecks) {
        return {
            detected: false,
            framework: null,
            durationMs: null,
            fcpToHydrationMs: null,
            largeInitialJS: false,
            jsBeforeFcpMs: 0,
            severity: "low",
            confidence: 0,
            detectionMethod: null,
            confidenceNote: null,
        };
    }
    const h = bottlenecks.hydration;
    const bs = bottlenecks.bundleSignals;
    const jsBeforeFcpMs = Math.round(bs.jsBeforeFcpMs);
    // Compute severity: detected hydration delay OR large initial JS
    let severity = "low";
    if (h.detected && (h.durationMs ?? 0) > 1000)
        severity = "high";
    else if (h.detected && (h.durationMs ?? 0) > 500)
        severity = "medium";
    else if (bs.largeInitialJS && jsBeforeFcpMs > 3000)
        severity = "high";
    else if (bs.largeInitialJS && jsBeforeFcpMs > 1500)
        severity = "medium";
    else if (bs.largeInitialJS)
        severity = "low";
    return {
        detected: h.detected,
        framework: h.framework,
        durationMs: h.durationMs,
        fcpToHydrationMs: h.fcpToHydrationMs,
        largeInitialJS: bs.largeInitialJS,
        jsBeforeFcpMs,
        severity,
        confidence: h.confidence ?? 0,
        detectionMethod: h.detectionMethod ?? null,
        confidenceNote: h.confidenceNote ?? null,
    };
}
//# sourceMappingURL=normalizer.js.map