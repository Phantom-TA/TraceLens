/**
 * @file parser.ts
 * @description Main orchestrator for the trace-parser module.
 *
 * EXECUTION ORDER:
 *   1. Parse + validate input (trace JSON / LHR / HAR)
 *   2. Discover renderer thread + navigationStart reference
 *   3. Filter raw events → keep only relevant events (~5-10% of total)
 *   4. Run all extractors in dependency order:
 *      a. Long tasks + main thread summary
 *      b. LCP candidate
 *      c. Render-blocking resources
 *      d. Hydration signals
 *      e. Scripting bottlenecks
 *      f. Rendering timeline + bundle signals
 *   5. Correlate signals → primary bottleneck diagnosis
 *   6. Build AI signal list
 *   7. Assemble final ParsedTraceBottlenecks output
 *
 * DATA QUALITY LEVELS:
 *   "full"    — Chrome trace + LHR + HAR
 *   "trace"   — Chrome trace only
 *   "lhr"     — Lighthouse LHR only
 *   "partial" — Incomplete, missing key data
 */
import { discoverRendererThread, filterEvents, tsToMs, } from "./filters.js";
import { computeMainThreadSummary, extractLongTasks, } from "./extractors/long-tasks.js";
import { extractLCPFromLHR, extractLCPFromTrace, } from "./extractors/lcp.js";
import { extractRenderBlockersFromLHR, extractRenderBlockersFromTrace, } from "./extractors/render-blocking.js";
import { detectHydration, detectHydrationFromLHR, } from "./extractors/hydration.js";
import { computeBundleSignals, extractRenderingTimeline, extractScriptingBottlenecks, extractScriptingFromLHR, } from "./extractors/scripting.js";
import { correlateSignals } from "./correlator.js";
import { buildAISignals } from "./summarizer.js";
// ─── Public API ────────────────────────────────────────────────────────────────
/**
 * Parses a Chrome trace and/or Lighthouse LHR into a compact,
 * AI-ready ParsedTraceBottlenecks summary.
 *
 * This is the single entry point for the trace-parser module.
 *
 * @param input - ParseInput containing at least one of: traceJson, lhr, harJson
 * @returns     - Complete ParsedTraceBottlenecks summary
 *
 * @throws {Error} If both traceJson and lhr are absent or unparseable
 *
 * @example
 * ```ts
 * import { parse } from "@tracelens/trace-parser";
 * import { readFileSync } from "fs";
 *
 * const result = await parse({
 *   lhr: readFileSync("report.json", "utf-8"),
 * });
 *
 * console.log(result.correlations.primaryBottleneck);
 * console.log(result.aiSignals);
 * ```
 */
export function parse(input) {
    const parsedAt = new Date().toISOString();
    const url = input.url ?? null;
    // ── Step 1: Parse inputs ────────────────────────────────────────────────────
    const trace = resolveTrace(input.traceJson);
    const lhr = resolveLHR(input.lhr);
    const harEntries = resolveHAR(input.harJson);
    if (!trace && !lhr) {
        throw new Error("[trace-parser] parse() requires at least one of: traceJson, lhr. Both are missing or invalid.");
    }
    const dataQuality = resolveDataQuality(!!trace, !!lhr, harEntries.length > 0);
    // ── Step 2: Extract vitals (LHR is the highest-quality source) ─────────────
    const vitals = extractVitals(lhr, trace);
    // ── Mode: LHR-only (no Chrome trace available) ─────────────────────────────
    if (!trace || !trace.traceEvents?.length) {
        return parseLHROnly(lhr, vitals, harEntries, url, parsedAt, dataQuality);
    }
    // ── Step 3: Discover renderer thread ───────────────────────────────────────
    const rawEvents = trace.traceEvents;
    const renderer = discoverRendererThread(rawEvents);
    if (!renderer) {
        // Fallback to LHR-only if we can't find the renderer thread
        if (lhr) {
            return parseLHROnly(lhr, vitals, harEntries, url, parsedAt, "partial");
        }
        throw new Error("[trace-parser] Cannot identify renderer thread in trace. Trace may be incomplete.");
    }
    // Supplement vitals with trace timing markers if LHR missed any
    supplementVitalsFromTrace(vitals, rawEvents, renderer);
    // ── Step 4: Filter events ──────────────────────────────────────────────────
    const filteredEvents = filterEvents(rawEvents, renderer);
    // ── Step 5a: Long tasks + main thread ──────────────────────────────────────
    const longTasks = extractLongTasks(filteredEvents, renderer);
    const mainThread = computeMainThreadSummary(filteredEvents, renderer, longTasks);
    // Build set of script URLs that caused long tasks (for scripting correlation)
    const longTaskScripts = new Set(longTasks.map((t) => t.script).filter((s) => s !== null));
    // ── Step 5b: Render-blocking resources ────────────────────────────────────
    const renderBlockers = lhr
        ? extractRenderBlockersFromLHR(lhr)
        : extractRenderBlockersFromTrace(filteredEvents, renderer, harEntries);
    // ── Step 5c: LCP candidate ─────────────────────────────────────────────────
    const lcpFromTrace = extractLCPFromTrace(filteredEvents, renderer, harEntries, renderBlockers);
    const lcpFromLHR = lhr ? extractLCPFromLHR(lhr) : null;
    // Prefer trace LCP (more precise) but fall back to LHR
    const lcpCandidate = lcpFromTrace ?? lcpFromLHR;
    // ── Step 5d: Hydration ─────────────────────────────────────────────────────
    const fcpMs = vitals.fcp;
    const hydration = detectHydration(filteredEvents, renderer, fcpMs);
    // ── Step 5e: Scripting ─────────────────────────────────────────────────────
    const scriptingBottlenecks = extractScriptingBottlenecks(filteredEvents, renderer, longTaskScripts);
    const rendering = extractRenderingTimeline(filteredEvents, renderer);
    const bundleSignals = computeBundleSignals(filteredEvents, renderer, fcpMs, scriptingBottlenecks);
    // ── Step 6: Correlate ──────────────────────────────────────────────────────
    const correlations = correlateSignals(lcpCandidate, longTasks, renderBlockers, hydration, bundleSignals, vitals.fcp, vitals.ttfb);
    // ── Step 7: AI signals ─────────────────────────────────────────────────────
    const aiSignals = buildAISignals({
        vitals,
        mainThread,
        longTasks,
        lcpCandidate,
        renderBlockers,
        hydration,
        scripting: scriptingBottlenecks,
        rendering,
        bundle: bundleSignals,
        correlations,
    });
    return {
        url,
        parsedAt,
        dataQuality,
        vitals,
        mainThread,
        largestLongTasks: longTasks,
        lcpCandidate,
        renderBlockingResources: renderBlockers,
        hydration,
        scriptingBottlenecks,
        rendering,
        bundleSignals,
        correlations,
        aiSignals,
    };
}
// ─── LHR-Only Mode ─────────────────────────────────────────────────────────────
/**
 * Extracts all available signals from Lighthouse LHR alone.
 * Less precise than trace-backed parsing but still highly useful.
 */
function parseLHROnly(lhr, vitals, harEntries, url, parsedAt, dataQuality) {
    const renderBlockers = extractRenderBlockersFromLHR(lhr);
    const lcpCandidate = extractLCPFromLHR(lhr);
    const hydration = detectHydrationFromLHR(lhr, vitals.fcp);
    const scriptingBottlenecks = extractScriptingFromLHR(lhr);
    // LHR-derived main thread summary from TBT audit
    const tbt = vitals.tbt ?? 0;
    const mainThread = {
        totalBlockingMs: tbt,
        totalMainThreadMs: tbt,
        longTaskCount: tbt > 0 ? Math.ceil(tbt / 100) : 0,
        longestTaskMs: 0,
        categoryBreakdown: {},
    };
    // Estimate long tasks from TBT (rough approximation)
    const longTasks = tbt > 50
        ? [{ script: null, duration: tbt, startTime: vitals.fcp ?? 0, attribution: "scripting", breakdown: { scripting: tbt } }]
        : [];
    const bundleSignals = {
        largeInitialJS: scriptingBottlenecks.some((s) => s.totalExecutionMs > 200),
        heavyEarlyScripts: scriptingBottlenecks.length >= 3,
        jsBeforeFcpMs: scriptingBottlenecks.reduce((s, b) => s + b.totalExecutionMs, 0),
        topScripts: scriptingBottlenecks.slice(0, 5).map((s) => ({ url: s.url, evaluationMs: s.totalExecutionMs })),
    };
    const rendering = {
        firstPaintMs: null,
        firstContentfulPaintMs: vitals.fcp,
        totalLayoutMs: 0,
        totalPaintMs: 0,
        totalStyleRecalcMs: 0,
        forcedLayoutCount: 0,
        paintEventCount: 0,
    };
    const correlations = correlateSignals(lcpCandidate, longTasks, renderBlockers, hydration, bundleSignals, vitals.fcp, vitals.ttfb);
    const aiSignals = buildAISignals({
        vitals,
        mainThread,
        longTasks,
        lcpCandidate,
        renderBlockers,
        hydration,
        scripting: scriptingBottlenecks,
        rendering,
        bundle: bundleSignals,
        correlations,
    });
    return {
        url,
        parsedAt,
        dataQuality,
        vitals,
        mainThread,
        largestLongTasks: longTasks,
        lcpCandidate,
        renderBlockingResources: renderBlockers,
        hydration,
        scriptingBottlenecks,
        rendering,
        bundleSignals,
        correlations,
        aiSignals,
    };
}
// ─── Input Resolvers ───────────────────────────────────────────────────────────
function resolveTrace(input) {
    if (!input)
        return null;
    if (typeof input === "string") {
        try {
            return JSON.parse(input);
        }
        catch {
            return null;
        }
    }
    return input;
}
function resolveLHR(input) {
    if (!input)
        return null;
    if (typeof input === "string") {
        try {
            return JSON.parse(input);
        }
        catch {
            return null;
        }
    }
    return input;
}
function resolveHAR(input) {
    if (!input)
        return [];
    const har = typeof input === "string" ? (() => {
        try {
            return JSON.parse(input);
        }
        catch {
            return {};
        }
    })() : input;
    return har.log?.entries ?? [];
}
function resolveDataQuality(hasTrace, hasLHR, hasHAR) {
    if (hasTrace && hasLHR && hasHAR)
        return "full";
    if (hasTrace && !hasLHR)
        return "trace";
    if (!hasTrace && hasLHR)
        return "lhr";
    return "partial";
}
/**
 * Extracts Core Web Vitals from LHR (primary) and falls back to trace markers.
 * LHR values are more accurate because Lighthouse applies median-run aggregation.
 */
function extractVitals(lhr, trace) {
    if (lhr?.audits) {
        const a = lhr.audits;
        return {
            fcp: roundMs(a["first-contentful-paint"]?.numericValue),
            lcp: roundMs(a["largest-contentful-paint"]?.numericValue),
            tbt: roundMs(a["total-blocking-time"]?.numericValue),
            cls: roundCls(a["cumulative-layout-shift"]?.numericValue),
            tti: roundMs(a["interactive"]?.numericValue),
            ttfb: roundMs(a["server-response-time"]?.numericValue),
            speedIndex: roundMs(a["speed-index"]?.numericValue),
        };
    }
    // Trace-only — will be supplemented later by supplementVitalsFromTrace()
    return { fcp: null, lcp: null, tbt: null, cls: null, tti: null, ttfb: null, speedIndex: null };
}
/**
 * Supplements vitals from trace marker events when LHR is not available.
 */
function supplementVitalsFromTrace(vitals, events, renderer) {
    const { navigationStart } = renderer;
    for (const ev of events) {
        if (ev.pid !== renderer.pid)
            continue;
        if (vitals.fcp === null && (ev.name === "firstContentfulPaint" || ev.name === "first-contentful-paint")) {
            vitals.fcp = tsToMs(ev.ts, navigationStart);
        }
        if (vitals.lcp === null && (ev.name === "LargestContentfulPaint::Candidate" || ev.name === "largestContentfulPaint::candidate")) {
            vitals.lcp = tsToMs(ev.ts, navigationStart);
        }
    }
}
function roundMs(val) {
    return val != null ? Math.round(val) : null;
}
function roundCls(val) {
    return val != null ? Math.round(val * 1000) / 1000 : null;
}
