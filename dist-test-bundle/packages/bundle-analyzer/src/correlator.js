/**
 * @file correlator.ts
 * @description Bundle-to-performance correlation engine.
 *
 * Cross-references bundle signals with trace-parser runtime data
 * (when available) to produce causal explanations:
 * "This 2.4MB initial bundle is causing your 27s TTI."
 */
/**
 * Correlates bundle signals with performance data.
 */
export function correlateBundleSignals(initialSizeKB, signals, deps, duplicates, trace) {
    // ── Cross-reference with trace data if available ────────────────────────────
    const fcpMs = trace?.vitals?.fcp ?? null;
    const tbtMs = trace?.vitals?.tbt ?? null;
    const jsBeforeFcpMs = trace?.bundleSignals?.jsBeforeFcpMs ?? null;
    // Bundle causing slow FCP: initial JS > 200KB AND FCP > 2500ms
    const bundleCausingSlowFcp = signals.largeInitialJS &&
        (fcpMs === null || fcpMs > 2500);
    // Bundle causing high TBT: large initial JS = long parse time = long tasks
    const bundleCausingHighTbt = signals.largeInitialJS &&
        (tbtMs === null || tbtMs > 200);
    // ── Diagnose primary issue ──────────────────────────────────────────────────
    const primaryIssue = diagnosePrimaryIssue(initialSizeKB, signals, deps, duplicates);
    const explanation = buildExplanation(primaryIssue, initialSizeKB, signals, deps, duplicates, fcpMs, tbtMs, jsBeforeFcpMs);
    return {
        bundleCausingSlowFcp,
        bundleCausingHighTbt,
        primaryIssue,
        explanation,
    };
}
// ─── Helpers ───────────────────────────────────────────────────────────────────
function diagnosePrimaryIssue(initialSizeKB, signals, deps, duplicates) {
    // Oversized initial bundle is the most common root cause
    if (initialSizeKB > 1000)
        return "oversized-initial-bundle";
    // Heavy third-party in initial load
    if (signals.thirdPartyInInitialBundle || signals.chartLibraryInInitial) {
        return "heavy-third-party";
    }
    // Significant duplication
    const totalWasted = duplicates.reduce((s, d) => s + d.wastedKB, 0);
    if (totalWasted > 100)
        return "duplicate-packages";
    // Moment.js / unoptimized lodash
    if (signals.heavyDateLibrary || signals.unoptimizedLodash) {
        return "unoptimized-dependencies";
    }
    // Oversized route chunks → no code splitting
    if (signals.oversizedRouteChunks)
        return "oversized-route-chunks";
    // Large initial JS but no specific cause → poor code splitting
    if (initialSizeKB > 500)
        return "poor-code-splitting";
    // Large initial JS
    if (signals.largeInitialJS)
        return "oversized-initial-bundle";
    return "well-optimized";
}
function buildExplanation(issue, initialSizeKB, signals, deps, duplicates, fcpMs, tbtMs, jsBeforeFcpMs) {
    const parts = [];
    switch (issue) {
        case "oversized-initial-bundle": {
            const topDep = deps.filter((d) => d.initial)[0];
            parts.push(`Initial JavaScript bundle is ${initialSizeKB}KB — estimated ${signals.estimatedParseMs}ms parse time on a mid-range device.`);
            if (topDep)
                parts.push(`Largest dependency: "${topDep.name}" at ${topDep.sizeKB}KB.`);
            break;
        }
        case "heavy-third-party": {
            const heavyDeps = deps.filter((d) => d.initial && (d.category === "analytics" || d.category === "ads" || d.category === "chart-library"));
            parts.push(`Heavy third-party scripts in the initial bundle: ${heavyDeps.map((d) => `"${d.name}" (${d.sizeKB}KB)`).join(", ")}.`);
            parts.push("These should be deferred or lazy-loaded after the page becomes interactive.");
            break;
        }
        case "duplicate-packages": {
            const top = duplicates[0];
            const totalWasted = Math.round(duplicates.reduce((s, d) => s + d.wastedKB, 0));
            parts.push(`${duplicates.length} duplicate package(s) detected, wasting ~${totalWasted}KB. ` +
                `Worst: "${top?.name}" in ${top?.instances.length} copies.`);
            break;
        }
        case "unoptimized-dependencies": {
            if (signals.heavyDateLibrary) {
                parts.push(`"moment.js" detected — it is 231KB minified. Replace with "dayjs" (~2KB) or "date-fns" (tree-shakeable).`);
            }
            if (signals.unoptimizedLodash) {
                parts.push(`Full "lodash" build detected. Switch to "lodash-es" with tree-shaking or use native array/object methods.`);
            }
            break;
        }
        case "oversized-route-chunks":
            parts.push(`One or more route chunks exceed 500KB. This means users downloading a specific page load far more JS than necessary.`);
            break;
        case "poor-code-splitting":
            parts.push(`Initial bundle is ${initialSizeKB}KB. Consider React.lazy() / dynamic imports to split code by route.`);
            break;
        case "well-optimized":
            parts.push(`Bundle appears well-optimized. Initial JS is ${initialSizeKB}KB with no obvious heavy dependencies.`);
            break;
    }
    if (fcpMs !== null)
        parts.push(`Runtime FCP: ${fcpMs}ms.`);
    if (tbtMs !== null)
        parts.push(`Runtime TBT: ${tbtMs}ms.`);
    if (jsBeforeFcpMs !== null)
        parts.push(`JS executed before FCP: ${jsBeforeFcpMs}ms.`);
    return parts.join(" ");
}
