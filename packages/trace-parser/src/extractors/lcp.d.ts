/**
 * @file extractors/lcp.ts
 * @description LCP candidate detection and analysis.
 *
 * DETECTION STRATEGY:
 *   1. Chrome Trace: Look for "LargestContentfulPaint::Candidate" events.
 *      The last (latest) candidate event is the final LCP.
 *   2. Lighthouse LHR: Read the pre-computed LCP audit + element description.
 *   3. Cross-reference with network/HAR to get resource size in KB.
 *
 * LCP ANATOMY:
 *   For an image LCP:
 *     navigationStart → request sent → response received → decoded → rendered
 *   For a text LCP:
 *     navigationStart → HTML parsed → FCP → text rendered
 *
 * BLOCKING DETECTION:
 *   If any render-blocking resource was still loading when LCP rendered,
 *   we flag it as render-blocked.
 */
import type { HAREntry, LCPCandidate, LighthouseLHRInput, RawTraceEvent, RendererThread, RenderBlockingResource } from "../types.js";
/**
 * Extracts the LCP candidate from trace events.
 *
 * @param events              - Pre-filtered trace events (cross-process included)
 * @param renderer            - Renderer thread identity
 * @param harEntries          - Optional HAR entries for size lookups
 * @param renderBlockers      - Already-detected render-blocking resources
 * @returns                   - Best LCP candidate, or null
 */
export declare function extractLCPFromTrace(events: RawTraceEvent[], renderer: RendererThread, harEntries: HAREntry[], renderBlockers: RenderBlockingResource[]): LCPCandidate | null;
/**
 * Extracts LCP data from a Lighthouse LHR.
 * Used when no Chrome trace is available, or to supplement trace data.
 *
 * @param lhr - Parsed Lighthouse result
 * @returns   - LCP candidate from LHR audits, or null
 */
export declare function extractLCPFromLHR(lhr: LighthouseLHRInput): LCPCandidate | null;
//# sourceMappingURL=lcp.d.ts.map