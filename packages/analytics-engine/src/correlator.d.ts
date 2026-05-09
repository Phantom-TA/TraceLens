/**
 * @file correlator.ts
 * @description Cross-system intelligence correlation engine.
 *
 * This is the INTELLIGENCE core of the analytics engine.
 * It correlates signals across Lighthouse, trace-parser, and bundle-analyzer
 * to identify root causes that no single tool can see alone.
 *
 * CORRELATION RULES:
 *   1. Long tasks + large initial JS → "heavy-javascript" (confirmed)
 *   2. LCP > 2500ms + long task overlapping LCP → "long-tasks blocking LCP"
 *   3. Large initial JS + LCP delay → "oversized bundle causing LCP"
 *   4. Render-blocking resources + FCP > 1800ms → "render-blocking-resources"
 *   5. Hydration detected + JS > 2000ms before FCP → "hydration-delay"
 *   6. Bundle duplicates > 100KB → "duplicate-packages"
 *   7. Analytics/ads in initial bundle → "analytics-in-initial-bundle"
 *   8. No code splitting on routes → "missing-code-splitting"
 *   9. TTFB > 800ms → "slow-server"
 *  10. CLS > 0.1 + LCP image large → "unoptimized-images"
 */
import type { BottleneckType, NormalizedBundle, PerformanceRisk } from "./types.js";
import type { ParsedTraceBottlenecks } from "../../trace-parser/src/types.js";
import type { BundleAnalysisResult } from "../../bundle-analyzer/src/types.js";
interface CorrelationContext {
    vitals: {
        fcp: number | null;
        lcp: number | null;
        tbt: number | null;
        cls: number | null;
        tti: number | null;
        ttfb: number | null;
    };
    bottlenecks: ParsedTraceBottlenecks | null;
    bundle: BundleAnalysisResult | null;
}
export declare function correlatePerformanceRisks(ctx: CorrelationContext): PerformanceRisk[];
/**
 * Determine the single highest-confidence primary bottleneck.
 * Uses trace-parser's correlation as the primary source,
 * overriding with bundle-analyzer if it provides stronger evidence.
 */
export declare function resolvePrimaryBottleneck(bottlenecks: ParsedTraceBottlenecks | null, bundle: BundleAnalysisResult | null, risks: PerformanceRisk[]): BottleneckType;
export declare function normalizeBundle(bundle: BundleAnalysisResult | null): NormalizedBundle | null;
export {};
//# sourceMappingURL=correlator.d.ts.map