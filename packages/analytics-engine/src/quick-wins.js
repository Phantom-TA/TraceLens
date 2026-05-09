/**
 * @file quick-wins.ts
 * @description Quick win prioritization engine.
 *
 * Generates actionable, sorted quick wins from all performance risks.
 * Quick wins are ranked by estimated impact (savings in ms).
 *
 * QUICK WIN SOURCES:
 *   1. Render-blocking resources → eliminate blocking CSS/JS
 *   2. Bundle deduplication → run npm dedupe (easy, high-value)
 *   3. Moment.js / lodash replacement → trivial refactor, big win
 *   4. Lazy-loading heavy chart libs → single import() call
 *   5. Deferring analytics → move script tag after DOMContentLoaded
 *   6. Image optimization → add width/height attributes, WebP
 *   7. Code splitting → add dynamic imports per route
 */
const MAX_QUICK_WINS = 7;
export function generateQuickWins(bottlenecks, bundle, vitals, frameworkDetection) {
    const wins = [];
    const fw = frameworkDetection?.framework ?? null;
    const fwConf = frameworkDetection?.confidence ?? 0;
    // Helper: get framework-specific lazy-load API
    const lazyLoadApi = (componentName) => {
        if (fw === "next.js" && fwConf > 0.5)
            return `next/dynamic(() => import('./${componentName}'), { ssr: false })`;
        if ((fw === "react" || fw === "next.js") && fwConf > 0.3)
            return `React.lazy(() => import('./${componentName}')) with <Suspense>`;
        if (fw === "vue" || fw === "nuxt")
            return `defineAsyncComponent(() => import('./${componentName}'))`;
        if (fw === "angular")
            return `loadComponent: () => import('./${componentName}')`;
        return `dynamic import() for ./${componentName}`;
    };
    // ── Win 1: Eliminate render-blocking resources ─────────────────────────────
    if (bottlenecks?.renderBlockingResources.length) {
        const totalSavings = bottlenecks.renderBlockingResources.reduce((s, r) => s + (r.blockingMs ?? 0), 0);
        if (totalSavings > 100) {
            wins.push({
                action: `Eliminate ${bottlenecks.renderBlockingResources.length} render-blocking resource(s) — add defer/async`,
                estimatedSavingsMs: Math.round(totalSavings),
                priority: 0,
                category: "network",
            });
        }
    }
    // ── Win 2: npm dedupe (bundle duplicates) ─────────────────────────────────
    if (bundle?.duplicatePackages.length) {
        const totalWasted = bundle.duplicatePackages.reduce((s, d) => s + d.wastedKB, 0);
        if (totalWasted > 50) {
            // Estimate parse savings: ~1ms per KB
            wins.push({
                action: `Run "npm dedupe" — ${bundle.duplicatePackages.length} duplicate package(s), ~${Math.round(totalWasted)}KB wasted`,
                estimatedSavingsMs: Math.round(totalWasted),
                priority: 0,
                category: "bundle",
            });
        }
    }
    // ── Win 3: Replace heavy date libraries ───────────────────────────────────
    if (bundle) {
        const momentDep = bundle.largestDependencies.find((d) => d.name === "moment" && d.initial);
        if (momentDep) {
            wins.push({
                action: `Replace moment.js (${Math.round(momentDep.sizeKB)}KB) with dayjs (~2KB) — saves ~${Math.round(momentDep.sizeKB - 2)}KB`,
                estimatedSavingsMs: Math.round(momentDep.sizeKB - 2),
                priority: 0,
                category: "bundle",
            });
        }
    }
    // ── Win 4: Lazy-load chart libraries (framework-aware) ───────────────────────
    if (bundle) {
        const chartDeps = bundle.largestDependencies.filter((d) => d.category === "chart-library" && d.initial && d.sizeKB > 100);
        for (const dep of chartDeps.slice(0, 2)) {
            const lazyCall = lazyLoadApi(dep.name);
            wins.push({
                action: `Lazy-load ${dep.name} (${Math.round(dep.sizeKB)}KB) — use ${lazyCall}`,
                estimatedSavingsMs: Math.round(dep.sizeKB),
                priority: 0,
                category: "bundle",
            });
        }
    }
    // ── Win 5: Defer analytics ─────────────────────────────────────────────────
    if (bundle) {
        const analyticsDeps = bundle.largestDependencies.filter((d) => (d.category === "analytics" || d.category === "ads") && d.initial);
        if (analyticsDeps.length > 0) {
            const totalKB = analyticsDeps.reduce((s, d) => s + d.sizeKB, 0);
            wins.push({
                action: `Defer ${analyticsDeps.map((d) => d.name).join(", ")} after hydration — ${Math.round(totalKB)}KB removed from initial load`,
                estimatedSavingsMs: Math.round(totalKB * 0.8),
                priority: 0,
                category: "javascript",
            });
        }
    }
    // ── Win 6: Use full lodash tree-shaking ───────────────────────────────────
    if (bundle?.performanceSignals.unoptimizedLodash) {
        const lodasDep = bundle.largestDependencies.find((d) => d.name === "lodash");
        const savings = lodasDep ? Math.round(lodasDep.sizeKB * 0.9) : 60;
        wins.push({
            action: `Switch lodash → lodash-es with tree-shaking — saves ~${savings}KB`,
            estimatedSavingsMs: savings,
            priority: 0,
            category: "bundle",
        });
    }
    // ── Win 7: Defer heavy scripts from trace (with script-specific names) ──────
    if (bottlenecks && !wins.some((w) => w.category === "javascript")) {
        const heavyScripts = bottlenecks.scriptingBottlenecks
            .filter((s) => s.totalExecutionMs > 200 && s.url && s.url !== "Unattributable")
            .slice(0, 2);
        if (heavyScripts.length > 0) {
            const names = heavyScripts.map((s) => {
                const parts = s.url.split("/");
                return parts[parts.length - 1] ?? s.url;
            }).join(", ");
            const totalMs = heavyScripts.reduce((s, x) => s + x.totalExecutionMs, 0);
            wins.push({
                action: `Defer or async-load: ${names} — ${Math.round(totalMs)}ms execution can be deferred after page interaction`,
                estimatedSavingsMs: Math.round(totalMs * 0.5),
                priority: 0,
                category: "javascript",
            });
        }
    }
    // ── Win 8: Framework-specific hydration optimization ───────────────────────
    if (fw && fwConf > 0.5 && bottlenecks?.hydration.detected && (bottlenecks.hydration.durationMs ?? 0) > 500) {
        const delay = bottlenecks.hydration.durationMs;
        let hydrationAction = "";
        if (fw === "next.js") {
            hydrationAction = `Use Next.js React Server Components + Suspense to defer non-critical hydration. Target: reduce ${delay}ms interaction gap.`;
        }
        else if (fw === "react") {
            hydrationAction = `Use React.lazy() + startTransition() to defer non-critical component hydration. Target: reduce ${delay}ms post-FCP gap.`;
        }
        else if (fw === "vue" || fw === "nuxt") {
            hydrationAction = `Use Nuxt's lazy: true or defineAsyncComponent() to defer below-fold hydration. Target: reduce ${delay}ms gap.`;
        }
        else if (fw === "astro") {
            hydrationAction = `Use Astro's client:idle or client:visible hydration directives. Target: reduce ${delay}ms interaction gap.`;
        }
        else {
            hydrationAction = `Defer non-critical ${fw} component hydration using progressive enhancement patterns.`;
        }
        wins.push({
            action: hydrationAction,
            estimatedSavingsMs: Math.round(delay * 0.5),
            priority: 0,
            category: "javascript",
        });
    }
    // Sort by estimated savings descending, assign priority ranks
    wins.sort((a, b) => (b.estimatedSavingsMs ?? 0) - (a.estimatedSavingsMs ?? 0));
    return wins.slice(0, MAX_QUICK_WINS).map((w, i) => ({ ...w, priority: i + 1 }));
}
//# sourceMappingURL=quick-wins.js.map