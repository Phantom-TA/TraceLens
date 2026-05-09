/**
 * @file correlator.ts
 * @description Cross-signal correlation engine.
 *
 * PURPOSE:
 *   Takes all extracted signals and produces a unified diagnosis.
 *   The correlator answers: "WHY is the frontend slow?" by finding
 *   causal relationships between bottleneck signals.
 *
 * CORRELATION RULES:
 *
 *   1. lcpBlockedByLongTask:
 *      A long task overlaps with or precedes the LCP window (LCP - 200ms to LCP).
 *
 *   2. fcpBlockedByResources:
 *      Render-blocking resources exist (blockingMs > 0).
 *
 *   3. hydrationDelayedLcp:
 *      Hydration end time is later than or close to LCP render time.
 *      (Text LCP can be delayed by hydration — the DOM exists but is
 *      not rendered until the framework takes control.)
 *
 *   4. heavyJsBeforeFcp:
 *      More than 200ms of JS evaluated before FCP.
 *
 *   PRIMARY BOTTLENECK DIAGNOSIS:
 *      Pick the highest-impact root cause based on severity ordering:
 *        render-blocking-resources > heavy-javascript > hydration-delay
 *        > long-tasks > slow-server > image-optimization > unknown
 */
import type { BundleSignals, CorrelationInsights, HydrationSignal, LCPCandidate, LongTask, RenderBlockingResource } from "./types.js";
/**
 * Correlates all extracted signals into a unified bottleneck diagnosis.
 *
 * @param lcpCandidate        - Detected LCP candidate (or null)
 * @param longTasks           - Top long tasks
 * @param renderBlockers      - Render-blocking resources
 * @param hydration           - Hydration signal
 * @param bundleSignals       - Bundle composition signals
 * @param fcpMs               - First Contentful Paint (ms)
 * @param ttfbMs              - Time to First Byte (ms)
 * @returns                   - CorrelationInsights
 */
export declare function correlateSignals(lcpCandidate: LCPCandidate | null, longTasks: LongTask[], renderBlockers: RenderBlockingResource[], hydration: HydrationSignal, bundleSignals: BundleSignals, fcpMs: number | null, ttfbMs: number | null): CorrelationInsights;
//# sourceMappingURL=correlator.d.ts.map