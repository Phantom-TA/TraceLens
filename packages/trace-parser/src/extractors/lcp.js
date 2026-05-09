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
import { tsToMs } from "../filters.js";
/**
 * Extracts the LCP candidate from trace events.
 *
 * @param events              - Pre-filtered trace events (cross-process included)
 * @param renderer            - Renderer thread identity
 * @param harEntries          - Optional HAR entries for size lookups
 * @param renderBlockers      - Already-detected render-blocking resources
 * @returns                   - Best LCP candidate, or null
 */
export function extractLCPFromTrace(events, renderer, harEntries, renderBlockers) {
    const { navigationStart } = renderer;
    // Collect all LCP candidate events — filter to same pid as renderer
    const lcpEvents = events.filter((ev) => ev.pid === renderer.pid &&
        (ev.name === "LargestContentfulPaint::Candidate" ||
            ev.name === "largestContentfulPaint::candidate"));
    if (lcpEvents.length === 0)
        return null;
    // The last candidate event is the authoritative LCP
    const lastCandidate = lcpEvents.reduce((prev, cur) => cur.ts > prev.ts ? cur : prev);
    const data = lastCandidate.args?.["data"] ?? lastCandidate.args ?? {};
    const renderTime = tsToMs(lastCandidate.ts, navigationStart);
    // Extract element description
    const elementType = data["type"] ?? "unknown";
    const resourceUrl = data["url"] ?? null;
    const nodeLabel = data["nodeLabel"] ?? data["id"] ?? null;
    const pixelSize = data["size"] ?? 0;
    // Element description — human-readable label
    let element = null;
    if (resourceUrl) {
        element = shortenUrl(resourceUrl);
    }
    else if (nodeLabel) {
        element = nodeLabel;
    }
    else if (elementType) {
        element = elementType;
    }
    // Look up resource size in HAR
    const sizeKB = resourceUrl ? lookupResourceSizeKB(resourceUrl, harEntries) : null;
    // Estimate size from pixel area if we have no HAR data (very rough)
    // pixelSize is pixel area, not bytes — don't use as KB
    const finalSizeKB = sizeKB ?? (pixelSize > 0 ? null : null);
    // Check if any render-blocking resource was active at LCP time
    const wasRenderBlocked = renderBlockers.length > 0 && renderTime > 0;
    return {
        element,
        resourceUrl,
        renderTime,
        sizeKB: finalSizeKB,
        initiatorUrl: null, // would need full network event correlation
        wasRenderBlocked,
        source: "trace",
    };
}
/**
 * Extracts LCP data from a Lighthouse LHR.
 * Used when no Chrome trace is available, or to supplement trace data.
 *
 * @param lhr - Parsed Lighthouse result
 * @returns   - LCP candidate from LHR audits, or null
 */
export function extractLCPFromLHR(lhr) {
    if (!lhr.audits)
        return null;
    // LCP timing
    const lcpAudit = lhr.audits["largest-contentful-paint"];
    const lcpMs = lcpAudit?.numericValue ?? null;
    if (!lcpMs)
        return null;
    // LCP element
    const lcpElementAudit = lhr.audits["largest-contentful-paint-element"];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const items = lcpElementAudit?.details?.items ?? [];
    let element = null;
    let resourceUrl = null;
    if (items.length > 0) {
        const item = items[0];
        // LHR element items have: { node: { nodeLabel, snippet, selector } }
        const node = item?.node ?? item;
        element = node?.nodeLabel ?? node?.snippet ?? null;
        // Some LHR versions include url in the item
        resourceUrl = item?.url ?? null;
    }
    // Render-blocking resources
    const rbAudit = lhr.audits["render-blocking-resources"];
    const wasRenderBlocked = (rbAudit?.details?.items?.length ?? 0) > 0;
    return {
        element,
        resourceUrl,
        renderTime: Math.round(lcpMs),
        sizeKB: null, // LHR doesn't provide image size for LCP
        initiatorUrl: null,
        wasRenderBlocked,
        source: "lhr",
    };
}
// ─── Helpers ───────────────────────────────────────────────────────────────────
/**
 * Looks up a resource's transfer size in KB from HAR entries.
 * Returns null if not found.
 */
function lookupResourceSizeKB(url, harEntries) {
    // Normalize URL for comparison
    const targetPath = normalizeUrl(url);
    for (const entry of harEntries) {
        const entryUrl = entry.request?.url ?? "";
        if (normalizeUrl(entryUrl) === targetPath) {
            const transferSize = entry.response?._transferSize;
            const contentSize = entry.response?.content?.size;
            const sizeBytes = transferSize ?? contentSize;
            if (sizeBytes != null && sizeBytes > 0) {
                return Math.round((sizeBytes / 1024) * 10) / 10;
            }
        }
    }
    return null;
}
function normalizeUrl(url) {
    try {
        const parsed = new URL(url);
        return `${parsed.hostname}${parsed.pathname}`;
    }
    catch {
        return url;
    }
}
function shortenUrl(url) {
    try {
        const parsed = new URL(url);
        const path = parsed.pathname;
        const filename = path.split("/").pop() ?? path;
        return filename || parsed.hostname;
    }
    catch {
        return url.slice(0, 80);
    }
}
//# sourceMappingURL=lcp.js.map