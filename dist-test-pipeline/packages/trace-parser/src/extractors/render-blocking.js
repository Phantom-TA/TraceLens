"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractRenderBlockersFromLHR = extractRenderBlockersFromLHR;
exports.extractRenderBlockersFromTrace = extractRenderBlockersFromTrace;
const filters_js_1 = require("../filters.js");
/** Max render-blocking resources to return */
const MAX_BLOCKERS = 10;
/**
 * Extracts render-blocking resources from a Lighthouse LHR.
 * This is the highest-quality source — Lighthouse uses Chrome DevTools
 * Protocol internally to measure actual blocking time.
 *
 * @param lhr - Parsed Lighthouse LHR
 * @returns   - Array of RenderBlockingResource sorted by blockingMs desc
 */
function extractRenderBlockersFromLHR(lhr) {
    const audit = lhr.audits?.["render-blocking-resources"];
    if (!audit?.details?.items)
        return [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const items = audit.details.items;
    return items
        .map((item) => {
        const url = item.url ?? "";
        const blockingMs = typeof item.wastedMs === "number" ? Math.round(item.wastedMs) : null;
        const transferSizeKB = typeof item.totalBytes === "number"
            ? Math.round(item.totalBytes / 1024)
            : typeof item.blockingTime === "number"
                ? null
                : null;
        return {
            url: shortenUrl(url),
            type: classifyResourceType(url),
            blockingMs,
            transferSizeKB,
        };
    })
        .sort((a, b) => (b.blockingMs ?? 0) - (a.blockingMs ?? 0))
        .slice(0, MAX_BLOCKERS);
}
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
function extractRenderBlockersFromTrace(events, renderer, harEntries) {
    const { navigationStart } = renderer;
    // Find FCP timestamp to define the "blocking window"
    const fcpEvent = events.find((ev) => ev.pid === renderer.pid &&
        (ev.name === "firstContentfulPaint" || ev.name === "firstPaint") &&
        (ev.cat?.includes("loading") || ev.cat?.includes("blink.user_timing")));
    const fcpTs = fcpEvent?.ts ?? Infinity;
    // Find all ResourceSendRequest events before FCP
    const networkRequests = events.filter((ev) => ev.pid === renderer.pid &&
        ev.name === "ResourceSendRequest" &&
        ev.ts < fcpTs);
    const blockers = [];
    for (const req of networkRequests) {
        const data = req.args?.["data"] ?? {};
        const url = data["url"] ?? "";
        const resourceType = (data["resourceType"] ?? "").toLowerCase();
        // Only scripts and stylesheets can be render-blocking
        if (resourceType !== "script" && resourceType !== "stylesheet")
            continue;
        // Skip preloaded resources (they don't block by definition)
        if (data["isLinkPreload"] === true)
            continue;
        // Check if the resource finished loading before FCP
        const finishEvent = events.find((ev) => ev.pid === renderer.pid &&
            ev.name === "ResourceFinish" &&
            ev.args?.["data"]?.["requestId"] === data["requestId"]);
        const finishTs = finishEvent?.ts ?? Infinity;
        const blockingMs = finishTs < fcpTs
            ? Math.round((0, filters_js_1.tsToMs)(finishTs, navigationStart) - (0, filters_js_1.tsToMs)(req.ts, navigationStart))
            : null;
        const sizeKB = lookupResourceSizeKB(url, harEntries);
        blockers.push({
            url: shortenUrl(url),
            type: resourceType === "script" ? "script" : "stylesheet",
            blockingMs,
            transferSizeKB: sizeKB,
        });
    }
    return blockers
        .sort((a, b) => (b.blockingMs ?? 0) - (a.blockingMs ?? 0))
        .slice(0, MAX_BLOCKERS);
}
// ─── Helpers ───────────────────────────────────────────────────────────────────
function classifyResourceType(url) {
    const lower = url.toLowerCase();
    if (lower.includes(".css") || lower.includes("stylesheet"))
        return "stylesheet";
    if (lower.includes(".js") || lower.includes("script"))
        return "script";
    if (lower.includes("font") || lower.includes(".woff") || lower.includes(".ttf"))
        return "font";
    return "unknown";
}
function shortenUrl(url) {
    try {
        const parsed = new URL(url);
        const path = parsed.pathname;
        const filename = path.split("/").pop() ?? "";
        return filename ? `${parsed.hostname}/.../${filename}` : parsed.hostname;
    }
    catch {
        return url.slice(0, 100);
    }
}
function lookupResourceSizeKB(url, harEntries) {
    for (const entry of harEntries) {
        if (entry.request?.url === url) {
            const s = entry.response?._transferSize ?? entry.response?.content?.size;
            return s ? Math.round(s / 1024) : null;
        }
    }
    return null;
}
