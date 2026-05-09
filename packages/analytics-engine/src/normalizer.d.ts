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
import type { MetricRating, NormalizedCoreWebVitals, NormalizedHydration, NormalizedLCPCandidate, NormalizedMainThread, NormalizedRenderBlockingResource, NormalizedScriptingBottleneck, Severity } from "./types.js";
import type { ParsedTraceBottlenecks } from "../../trace-parser/src/types.js";
declare const THRESHOLDS: {
    lcp: {
        good: number;
        poor: number;
    };
    fcp: {
        good: number;
        poor: number;
    };
    tbt: {
        good: number;
        poor: number;
    };
    cls: {
        good: number;
        poor: number;
    };
    tti: {
        good: number;
        poor: number;
    };
    ttfb: {
        good: number;
        poor: number;
    };
    speedIndex: {
        good: number;
        poor: number;
    };
};
export declare function rateMetric(key: keyof typeof THRESHOLDS, value: number | null): MetricRating;
export declare function ratePerformanceScore(score: number | null): MetricRating;
export declare function normalizeCoreWebVitals(vitals: {
    fcp: number | null;
    lcp: number | null;
    tbt: number | null;
    cls: number | null;
    tti: number | null;
    ttfb: number | null;
    speedIndex: number | null;
    performanceScore: number | null;
}): NormalizedCoreWebVitals;
export declare function severityFromDuration(ms: number): Severity;
export declare function normalizeMainThread(bottlenecks: ParsedTraceBottlenecks | null): NormalizedMainThread;
export declare function normalizeScriptingBottlenecks(bottlenecks: ParsedTraceBottlenecks | null): NormalizedScriptingBottleneck[];
export declare function normalizeRenderBlockingResources(bottlenecks: ParsedTraceBottlenecks | null): NormalizedRenderBlockingResource[];
export declare function normalizeLCPCandidate(bottlenecks: ParsedTraceBottlenecks | null): NormalizedLCPCandidate | null;
export declare function normalizeHydration(bottlenecks: ParsedTraceBottlenecks | null): NormalizedHydration;
export {};
//# sourceMappingURL=normalizer.d.ts.map