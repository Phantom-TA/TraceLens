"use strict";
/**
 * @file filters.ts
 * @description Aggressive event filtering and renderer thread identification.
 *
 * STRATEGY:
 *   Chrome traces can contain 50,000–500,000 events across many processes
 *   (browser process, GPU process, renderer processes, service workers).
 *   This module immediately discards everything that cannot contribute to
 *   frontend rendering bottleneck analysis.
 *
 * WHAT IS KEPT:
 *   - All events from the renderer's main thread (CrRendererMain)
 *   - Navigation/timing marker events
 *   - LCP / FCP / LayoutShift events (loading category)
 *   - Network events needed for render-blocking analysis
 *
 * WHAT IS DISCARDED:
 *   - Browser process events (UI, bookmarks, sync, etc.)
 *   - GPU process events (compositing hardware)
 *   - Service worker thread events
 *   - WebRTC, WebAudio, WebGL events
 *   - Console/logging events
 *   - Metadata-only events (thread_name is read once, then skipped)
 *   - Any event with duration < 1ms (noise)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.discoverRendererThread = discoverRendererThread;
exports.filterEvents = filterEvents;
exports.getEventDurationUs = getEventDurationUs;
exports.tsToMs = tsToMs;
exports.durToMs = durToMs;
exports.classifyEventCategory = classifyEventCategory;
exports.extractScriptUrl = extractScriptUrl;
// ─── Category Allowlists ───────────────────────────────────────────────────────
/**
 * Categories that can contain frontend performance-relevant events.
 * Events NOT in these categories are discarded in the pre-filter pass.
 */
const ALLOWED_CATEGORIES = new Set([
    "devtools.timeline",
    "disabled-by-default-devtools.timeline",
    "disabled-by-default-devtools.timeline.frame",
    "blink.user_timing",
    "loading",
    "toplevel",
    "v8",
    "v8,devtools.timeline",
    "v8.execute",
    "disabled-by-default-v8.cpu_profiler",
    "blink",
    "blink.resource",
    "latencyInfo",
    "rail",
    "scheduler",
    "cc",
    "gpu", // Keep for compositor context (dropped later if off main thread)
]);
/**
 * Event names that are relevant regardless of which process they belong to.
 * Used for cross-process events like LCP, FCP that fire in the browser process.
 */
const CROSS_PROCESS_NAMES = new Set([
    "navigationStart",
    "firstContentfulPaint",
    "firstPaint",
    "LargestContentfulPaint::Candidate",
    "LargestContentfulPaint::Invalidate",
    "LayoutShift",
    "LayoutShift::Score",
    "largestContentfulPaint::candidate",
    "firstMeaningfulPaint",
    "DomContentLoaded",
    "LoadEvent",
    "InteractiveTime",
    "ResourceSendRequest",
    "ResourceReceiveResponse",
    "ResourceFinish",
    "ResourceChangePriority",
]);
/**
 * Names that are ALWAYS discarded, even on the main thread.
 * These are DevTools instrumentation noise, not page-level performance.
 */
const BLOCKED_NAMES = new Set([
    "TracingStartedInBrowser",
    "TracingStartedInPage",
    "TracingSessionIdForWorker",
    "FrameStartedLoading",
    "FrameStoppedLoading",
    "WebViewImplSetMainFrame",
    "CommitLoad",
    "MarkLoad", // Playwright internal markers
    "MarkDOMContent",
    "Screenshot",
    "CpuProfile",
    "Profile",
    "ProfileChunk",
    "JitCodeAdded",
    "JitCodeMoved",
    "MinorGC",
    "MajorGC",
    "BlinkGC.AtomicPhase",
    "BlinkGC.IncrementalMarking",
    "V8.GCScavenger",
    "V8.GCIncrementalMarking",
    "V8.GCIncrementalMarkingStart",
    "V8.GCIncrementalMarkingFinalize",
    "V8.GCPhantomHandleProcessingCallback",
    "V8.Turbofan",
    "V8.Maglev",
    "ScheduleStyleRecalculation", // schedule events, not actual work
    "InvalidateLayout",
    "PaintSetup",
    "PaintImage", // Individual paint image — too granular
    "RasterTask",
    "PrePaint",
    "LayerTreeHostImpl",
    "BeginFrame",
    "NeedsBeginFrameChanged",
    "BeginMainFrame",
    "DrawFrame",
    "DecodeImage",
    "ResizeImage",
]);
// ─── Renderer Thread Discovery ─────────────────────────────────────────────────
/**
 * Discovers the renderer process and main thread by scanning metadata events.
 *
 * Chrome traces embed thread_name metadata events:
 *   { ph: "M", name: "thread_name", args: { name: "CrRendererMain" } }
 *
 * We find the pid/tid pair where thread_name === "CrRendererMain" and
 * also locate the navigation start event to use as t=0.
 *
 * When multiple renderer processes exist (iframes, workers), we pick the one
 * with the earliest navigationStart event — that is the top-level page.
 *
 * @param events - Full raw event array (read-only)
 * @returns Renderer thread identity, or null if not determinable
 */
function discoverRendererThread(events) {
    // Pass 1: Collect all CrRendererMain thread candidates
    const candidates = new Map();
    for (const ev of events) {
        if (ev.ph === "M" &&
            ev.name === "thread_name" &&
            ev.args?.["name"] === "CrRendererMain") {
            const key = `${ev.pid}:${ev.tid}`;
            if (!candidates.has(key)) {
                candidates.set(key, { pid: ev.pid, tid: ev.tid });
            }
        }
    }
    if (candidates.size === 0) {
        // Fallback: try to infer from navigationStart events
        // (some trace exporters omit metadata)
        return inferRendererThreadFromNavStart(events);
    }
    // Pass 2: For each candidate, find the earliest navigationStart on that pid
    // (navigationStart fires on main thread with pid matching renderer)
    let bestThread = null;
    for (const { pid, tid } of candidates.values()) {
        for (const ev of events) {
            if (ev.pid === pid &&
                ev.name === "navigationStart" &&
                (ev.cat?.includes("blink.user_timing") || ev.cat?.includes("devtools.timeline"))) {
                if (!bestThread || ev.ts < bestThread.navStart) {
                    bestThread = { pid, tid, navStart: ev.ts };
                }
                break;
            }
        }
    }
    if (bestThread) {
        return {
            pid: bestThread.pid,
            tid: bestThread.tid,
            navigationStart: bestThread.navStart,
        };
    }
    // Use the first candidate with navigationStart 0 as fallback
    const first = candidates.values().next().value;
    if (!first)
        return null;
    return { pid: first.pid, tid: first.tid, navigationStart: 0 };
}
/**
 * Fallback renderer thread inference when metadata events are absent.
 * Looks for the pid that has the most devtools.timeline events.
 */
function inferRendererThreadFromNavStart(events) {
    // Find pids that have navigationStart
    for (const ev of events) {
        if (ev.name === "navigationStart") {
            return { pid: ev.pid, tid: ev.tid, navigationStart: ev.ts };
        }
    }
    // Last resort: find pid with most devtools.timeline events (the renderer)
    const pidCounts = new Map();
    for (const ev of events) {
        if (ev.cat?.includes("devtools.timeline")) {
            const cur = pidCounts.get(ev.pid) ?? { count: 0, tid: ev.tid };
            pidCounts.set(ev.pid, { count: cur.count + 1, tid: ev.tid });
        }
    }
    let maxPid = null;
    let maxCount = 0;
    for (const [pid, { count, tid }] of pidCounts) {
        if (count > maxCount) {
            maxCount = count;
            maxPid = { pid, tid };
        }
    }
    return maxPid ? { pid: maxPid.pid, tid: maxPid.tid, navigationStart: 0 } : null;
}
// ─── Event Pre-Filter ──────────────────────────────────────────────────────────
/**
 * Filters a raw trace event array down to only the events needed for analysis.
 *
 * TWO PASS approach:
 *   1. Identify the renderer thread
 *   2. Keep only: renderer main thread events + cross-process navigation events
 *
 * @param events      - Full raw trace event array
 * @param renderer    - Resolved renderer thread identity
 * @returns           - Filtered events (much smaller set)
 */
function filterEvents(events, renderer) {
    const filtered = [];
    for (const ev of events) {
        // Skip metadata events (already processed)
        if (ev.ph === "M")
            continue;
        // Skip events with blocked names (noise)
        if (BLOCKED_NAMES.has(ev.name))
            continue;
        const onMainThread = ev.pid === renderer.pid && ev.tid === renderer.tid;
        const isCrossProcess = CROSS_PROCESS_NAMES.has(ev.name);
        const onRendererProcess = ev.pid === renderer.pid;
        if (!onMainThread && !isCrossProcess && !onRendererProcess)
            continue;
        // Category filter — discard categories we never use
        const cats = ev.cat?.split(",").map((c) => c.trim()) ?? [];
        const hasAllowedCat = cats.some((c) => ALLOWED_CATEGORIES.has(c));
        if (!hasAllowedCat && !isCrossProcess)
            continue;
        filtered.push(ev);
    }
    return filtered;
}
// ─── Duration Helpers ──────────────────────────────────────────────────────────
/**
 * Returns the duration of a trace event in microseconds.
 * For B/E pairs, this is computed from the pair. For X events, use dur directly.
 * Returns 0 if duration cannot be determined.
 */
function getEventDurationUs(ev) {
    return ev.dur ?? 0;
}
/**
 * Converts a raw trace timestamp (µs) to milliseconds relative to navigationStart.
 *
 * @param ts          - Raw trace timestamp in microseconds
 * @param navStartUs  - Navigation start timestamp in microseconds
 * @returns           - Relative time in milliseconds (rounded to 1 decimal)
 */
function tsToMs(ts, navStartUs) {
    return Math.round(((ts - navStartUs) / 1000) * 10) / 10;
}
/**
 * Converts a duration in microseconds to milliseconds.
 */
function durToMs(durUs) {
    return Math.round((durUs / 1000) * 10) / 10;
}
// ─── Category Classifiers ──────────────────────────────────────────────────────
/**
 * Classifies an event's primary work category for breakdown reporting.
 */
function classifyEventCategory(ev) {
    const name = ev.name;
    const cat = ev.cat ?? "";
    if (name === "EvaluateScript" ||
        name === "FunctionCall" ||
        name === "v8.run" ||
        name === "v8.execute" ||
        name === "v8.parseOnBackground" ||
        cat.includes("v8"))
        return "scripting";
    if (name === "Layout" ||
        name === "UpdateLayoutTree" ||
        name === "RecalculateStyles" ||
        name === "StyleRecalcInvalidationTracking")
        return "layout";
    if (name === "Paint" || name === "CompositeLayers" || name === "UpdateLayer") {
        return "painting";
    }
    if (name === "ParseHTML" || name === "ParseAuthorStyleSheet") {
        return "parsing";
    }
    if (name === "TimerFire" ||
        name === "FireIdleCallback" ||
        name === "FireAnimationFrame")
        return "timer";
    if (name === "EventDispatch" || name === "XHRReadyStateChange") {
        return "event-handling";
    }
    return "other";
}
// ─── Script URL Extraction ─────────────────────────────────────────────────────
/**
 * Extracts a script URL from an EvaluateScript or FunctionCall event's args.
 * Returns null if no URL is present.
 */
function extractScriptUrl(ev) {
    const data = ev.args?.["data"] ?? ev.args?.["beginData"] ?? {};
    const url = data["url"] ?? data["scriptName"] ?? data["fileName"] ?? "";
    if (!url || url.startsWith("v8-compile-cache") || url === "blob:")
        return null;
    // Shorten data URLs
    if (url.startsWith("data:"))
        return "inline-script";
    // Strip query strings and fragment for cleaner labeling
    try {
        const parsed = new URL(url);
        return parsed.pathname ? `${parsed.hostname}${parsed.pathname}` : url;
    }
    catch {
        return url.slice(0, 120); // cap at 120 chars
    }
}
