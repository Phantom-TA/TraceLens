/**
 * @file extractors/render-blocking.ts
 * @description Render-blocking resource detection.
 *
 * WHAT IS RENDER-BLOCKING:
 *   Resources that prevent the browser from painting any pixels until
 *   they are fully downloaded and processed. These are the most direct
 *   cause of delayed FCP.
 *
 * DETECTION STRATEGY:
 *   PRIMARY — Lighthouse LHR:
 *     The "render-blocking-resources" audit is the most reliable source.
 *     It has already done the CDP instrumentation to identify blockers.
 *
 *   SECONDARY — Chrome Trace:
 *     Look for ResourceSendRequest events for scripts/stylesheets that
 *     occur before the firstContentfulPaint event. If a script is loaded
 *     without async/defer (args.data.isLinkPreload === false, etc.), it
 *     blocks parsing.
 *
 *   TERTIARY — ParseHTML pauses:
 *     When ParseHTML is interrupted by EvaluateScript events, the
 *     evaluated script was parser-blocking.
 */
import type { HAREntry, LighthouseLHRInput, RawTraceEvent, RendererThread, RenderBlockingResource } from "../types.js";
/**
 * Extracts render-blocking resources from a Lighthouse LHR.
 * This is the highest-quality source — Lighthouse uses Chrome DevTools
 * Protocol internally to measure actual blocking time.
 *
 * @param lhr - Parsed Lighthouse LHR
 * @returns   - Array of RenderBlockingResource sorted by blockingMs desc
 */
export declare function extractRenderBlockersFromLHR(lhr: LighthouseLHRInput): RenderBlockingResource[];
/**
 * Extracts render-blocking resources from Chrome trace events.
 * Less precise than LHR but available when only a trace is provided.
 *
 * HEURISTIC:
 *   Scripts and stylesheets that have ResourceSendRequest events
 *   BEFORE the firstContentfulPaint timestamp are candidates.
 *   We further filter to those where the network request completes
 *   within the "render-blocked window" (before FCP).
 *
 * @param events    - Pre-filtered trace events
 * @param renderer  - Renderer thread identity
 * @param harEntries - HAR entries for size lookups
 * @returns          - Array of RenderBlockingResource
 */
export declare function extractRenderBlockersFromTrace(events: RawTraceEvent[], renderer: RendererThread, harEntries: HAREntry[]): RenderBlockingResource[];
//# sourceMappingURL=render-blocking.d.ts.map