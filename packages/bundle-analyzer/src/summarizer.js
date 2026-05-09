/**
 * @file summarizer.ts
 * @description AI signal builder for bundle analysis.
 *
 * Produces ≤20 concise, actionable, human-readable performance facts
 * from bundle analysis data — optimized for LLM prompt injection.
 */
const MAX_SIGNALS = 20;
export function buildBundleAISignals(result) {
    const signals = [];
    const { initialBundleSizeKB, asyncBundleSizeKB, largestDependencies, duplicatePackages, routeChunks, hydrationRisk, performanceSignals: ps, correlations, initialComposition, } = result;
    // ── Primary issue first ───────────────────────────────────────────────────
    signals.push(`Primary issue: ${correlations.primaryIssue.replace(/-/g, " ")}.`);
    // ── Bundle sizes ──────────────────────────────────────────────────────────
    signals.push(`Initial JS bundle: ${initialBundleSizeKB}KB (estimated ${ps.estimatedParseMs}ms parse time).`);
    if (asyncBundleSizeKB > 0) {
        signals.push(`Async/lazy JS: ${asyncBundleSizeKB}KB across lazy-loaded chunks.`);
    }
    // ── Initial composition ───────────────────────────────────────────────────
    if (initialComposition.frameworkKB > 0) {
        signals.push(`Framework code: ${initialComposition.frameworkKB}KB of initial bundle.`);
    }
    if (initialComposition.thirdPartyKB > 0) {
        signals.push(`Third-party libraries: ${initialComposition.thirdPartyKB}KB of initial bundle.`);
    }
    if (initialComposition.notableInitialDeps.length > 0) {
        signals.push(`Notable initial deps: ${initialComposition.notableInitialDeps.slice(0, 3).join("; ")}.`);
    }
    // ── Top dependency ────────────────────────────────────────────────────────
    const topDep = largestDependencies[0];
    if (topDep) {
        const altNote = topDep.alternative ? ` Consider: ${topDep.alternative}.` : "";
        signals.push(`Largest dependency: "${topDep.name}" at ${topDep.sizeKB}KB (${topDep.percentage}% of bundle).${altNote}`);
    }
    // ── Problem dependencies ──────────────────────────────────────────────────
    if (ps.heavyDateLibrary) {
        signals.push(`moment.js detected in bundle — replace with dayjs (~2KB) to save ~229KB.`);
    }
    if (ps.unoptimizedLodash) {
        signals.push(`Full lodash build detected — switch to lodash-es with tree-shaking.`);
    }
    if (ps.chartLibraryInInitial) {
        const chartDep = largestDependencies.find((d) => d.category === "chart-library" && d.initial);
        signals.push(`Chart library "${chartDep?.name ?? "unknown"}" (${chartDep?.sizeKB ?? "?"}KB) in initial bundle — lazy load it.`);
    }
    if (ps.thirdPartyInInitialBundle) {
        const analyticsOrAds = largestDependencies.filter((d) => d.initial && (d.category === "analytics" || d.category === "ads"));
        if (analyticsOrAds.length > 0) {
            signals.push(`Analytics/ads in initial bundle: ${analyticsOrAds.map((d) => `"${d.name}"`).join(", ")} — defer after hydration.`);
        }
    }
    // ── Duplicates ────────────────────────────────────────────────────────────
    if (duplicatePackages.length > 0) {
        const totalWasted = Math.round(duplicatePackages.reduce((s, d) => s + d.wastedKB, 0));
        signals.push(`${duplicatePackages.length} duplicate package(s) waste ~${totalWasted}KB. Run "npm dedupe" or check yarn resolutions.`);
        const topDup = duplicatePackages[0];
        if (topDup) {
            signals.push(`Worst duplicate: "${topDup.name}" in ${topDup.instances.length} copies (~${topDup.wastedKB}KB wasted).`);
        }
    }
    // ── Route chunks ──────────────────────────────────────────────────────────
    if (routeChunks.length > 0) {
        const largest = routeChunks[0];
        if (largest && largest.sizeKB > 200) {
            signals.push(`Largest route chunk: "${largest.route}" at ${largest.sizeKB}KB.`);
        }
        if (ps.oversizedRouteChunks) {
            signals.push(`${routeChunks.filter((r) => r.sizeKB > 500).length} route chunk(s) exceed 500KB — split shared dependencies.`);
        }
    }
    // ── Hydration risk ────────────────────────────────────────────────────────
    if (hydrationRisk.isHigh) {
        signals.push(`High hydration risk: ~${hydrationRisk.estimatedJsParseMs}ms estimated JS parse/eval before interactive.`);
        if (hydrationRisk.heavyDeps.length > 0) {
            signals.push(`Hydration-heavy dependencies: ${hydrationRisk.heavyDeps.slice(0, 3).join(", ")}.`);
        }
    }
    // ── Code splitting advice ─────────────────────────────────────────────────
    if (correlations.primaryIssue === "poor-code-splitting" || initialBundleSizeKB > 400) {
        signals.push("Use React.lazy() + Suspense or Next.js dynamic imports to split by route.");
    }
    return signals.slice(0, MAX_SIGNALS);
}
//# sourceMappingURL=summarizer.js.map