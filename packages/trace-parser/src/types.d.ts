/**
 * @file types.ts
 * @description All TypeScript types for @tracelens/trace-parser.
 *
 * These types define:
 *   1. Raw input formats (Chrome trace JSON, Lighthouse LHR subset)
 *   2. Intermediate extracted signals per domain
 *   3. The final AI-ready ParsedTraceBottlenecks output
 *
 * DESIGN PRINCIPLE:
 *   All timestamps in the public API are in MILLISECONDS relative to
 *   navigationStart (t=0). Raw µs values from Chrome traces are converted
 *   internally and never surfaced in the output.
 */
/**
 * A single Chrome DevTools Protocol trace event.
 * Timestamps (ts, tts) are in microseconds since an arbitrary epoch.
 * Durations (dur, tdur) are in microseconds.
 *
 * Reference: https://docs.google.com/document/d/1CvAClvFfyA5R-PhYUmn5OOQtYMH4h6I0nSsKchNAySU
 */
export interface RawTraceEvent {
    /** Process ID */
    pid: number;
    /** Thread ID */
    tid: number;
    /** Timestamp in microseconds */
    ts: number;
    /**
     * Phase:
     *   B=begin  E=end  X=complete  I=instant  M=metadata
     *   b=async-begin  e=async-end  n=async-instant
     */
    ph: "B" | "E" | "X" | "I" | "M" | "b" | "e" | "n" | "s" | "f" | "p" | "R" | "O" | "D";
    /** Category (comma-separated) */
    cat: string;
    /** Event name */
    name: string;
    /** Duration in microseconds (only for ph="X") */
    dur?: number;
    /** Thread-level duration in microseconds */
    tdur?: number;
    /** Thread timestamp */
    tts?: number;
    /** Event arguments (structure varies by event type) */
    args?: Record<string, any>;
    /** Scope for instant events */
    s?: string;
    /** ID for async events */
    id?: string | number;
}
/** Top-level shape of a Chrome DevTools trace JSON file */
export interface RawChromeTrace {
    traceEvents: RawTraceEvent[];
    /** Metadata fields (optional, present in some trace formats) */
    metadata?: Record<string, unknown>;
}
/**
 * Subset of a Lighthouse Result (LHR) used by the parser.
 * We only read from these fields — never the full LHR.
 */
export interface LighthouseLHRInput {
    /** Category scores keyed by category ID */
    categories?: {
        performance?: {
            score: number | null;
        };
        [key: string]: {
            score: number | null;
        } | undefined;
    };
    /**
     * Audit results keyed by audit ID.
     * We read: metrics, render-blocking-resources, network-requests,
     * largest-contentful-paint-element, long-tasks, main-thread-tasks.
     */
    audits?: Record<string, LHRAudit>;
    /** Timing data for the overall LH run */
    timing?: {
        total: number;
    };
}
export interface LHRAudit {
    id?: string;
    score: number | null;
    numericValue?: number;
    displayValue?: string;
    details?: {
        items?: any[];
        type?: string;
        [key: string]: any;
    };
    title?: string;
}
/** Supported trace input types */
export type TraceInputType = "chrome-trace" | "lighthouse-lhr" | "auto";
/**
 * Input to the main parse() function.
 * At least one of traceJson or lhr must be provided.
 * When both are provided, the parser cross-references them for richer analysis.
 */
export interface ParseInput {
    /**
     * Raw Chrome DevTools trace JSON string or already-parsed object.
     * Must contain a `traceEvents` array.
     */
    traceJson?: string | RawChromeTrace;
    /**
     * Parsed Lighthouse LHR JSON (or string).
     * Used to extract pre-computed audit results and supplement trace data.
     */
    lhr?: string | LighthouseLHRInput;
    /**
     * HAR network log (optional).
     * Used to supplement resource sizes when not available in the trace.
     */
    harJson?: string | HARLog;
    /**
     * URL of the audited page (optional, used for labeling).
     */
    url?: string;
}
/** Minimal HAR log shape */
export interface HARLog {
    log?: {
        entries?: HAREntry[];
    };
}
export interface HAREntry {
    request?: {
        url?: string;
    };
    response?: {
        content?: {
            size?: number;
            mimeType?: string;
        };
        _transferSize?: number;
    };
    timings?: {
        wait?: number;
        receive?: number;
        send?: number;
    };
    time?: number;
}
/**
 * Process + thread identity for the renderer main thread.
 * All performance analysis is scoped to this thread.
 */
export interface RendererThread {
    pid: number;
    tid: number;
    navigationStart: number;
}
/** A single long task (>50ms) on the main thread */
export interface LongTask {
    /** Primary script URL attributed to this task (if any) */
    script: string | null;
    /** ALL script URLs that contributed to this task (multi-attribution) */
    attributedScripts: string[];
    /** Attribution confidence: 1.0 = script URL found, 0.5 = inferred from task type */
    attributionConfidence: number;
    /** Whether this long task overlapped with the LCP render window */
    lcpOverlap: boolean;
    /** Task duration in ms */
    duration: number;
    /** Task start time relative to navigationStart (ms) */
    startTime: number;
    /** Dominant sub-task type driving this task */
    attribution: LongTaskAttribution;
    /** Child event breakdown: { "EvaluateScript": 120, "Layout": 40, ... } */
    breakdown: Record<string, number>;
}
export type LongTaskAttribution = "scripting" | "layout" | "style-recalc" | "painting" | "parsing" | "other";
/** LCP candidate extracted from the trace or LHR */
export interface LCPCandidate {
    /** Element description or resource URL */
    element: string | null;
    /** Resource URL (if LCP is an image/video) */
    resourceUrl: string | null;
    /** LCP render time in ms relative to navigationStart */
    renderTime: number;
    /** Resource size in KB (from network/HAR data if available) */
    sizeKB: number | null;
    /** Initiator URL that caused this resource to load */
    initiatorUrl: string | null;
    /** Whether the LCP resource was render-blocked */
    wasRenderBlocked: boolean;
    /** Source of this data: "trace" | "lhr" */
    source: "trace" | "lhr";
}
/** A render-blocking resource detected in the trace or LHR */
export interface RenderBlockingResource {
    /** Resource URL */
    url: string;
    /** Resource type */
    type: "script" | "stylesheet" | "font" | "unknown";
    /** Estimated time savings from eliminating this block (ms) */
    blockingMs: number | null;
    /** Transfer size in KB */
    transferSizeKB: number | null;
}
/** Hydration delay signal */
export interface HydrationSignal {
    /** Whether hydration was detected at all */
    detected: boolean;
    /** Detected framework (primary + secondary signals combined) */
    framework: "react" | "next.js" | "vue" | "nuxt" | "angular" | "astro" | "remix" | "svelte" | "sveltekit" | "unknown" | null;
    /** Hydration start time relative to navigationStart (ms) */
    startTime: number | null;
    /** Hydration end time relative to navigationStart (ms) */
    endTime: number | null;
    /** Total hydration duration (ms) */
    durationMs: number | null;
    /** Time from FCP to hydration complete (ms) — the "interaction gap" */
    fcpToHydrationMs: number | null;
    /** Confidence score 0–1: how certain we are this is a real hydration signal */
    confidence: number;
    /** How the hydration was detected */
    detectionMethod: "user-timing" | "bundle-signature" | "post-fcp-scripting" | "lhr-bootup" | "inferred";
    /** Human-readable note explaining confidence level */
    confidenceNote: string | null;
}
/** JS scripting bottleneck summary per script URL */
export interface ScriptingBottleneck {
    /** Script URL (shortened for readability) */
    url: string;
    /** Total JS execution time attributed to this script (ms) */
    totalExecutionMs: number;
    /** Number of evaluation events for this script */
    evaluationCount: number;
    /** Largest single evaluation duration (ms) */
    largestEvaluationMs: number;
    /** Whether this script was responsible for a long task */
    causedLongTask: boolean;
}
/** Paint and layout timing signals */
export interface RenderingTimeline {
    /** Time of first paint in ms (relative to navStart) */
    firstPaintMs: number | null;
    /** Time of FCP in ms */
    firstContentfulPaintMs: number | null;
    /** Total time spent in Layout phase (ms) */
    totalLayoutMs: number;
    /** Total time spent in Paint phase (ms) */
    totalPaintMs: number;
    /** Total time spent in StyleRecalc (ms) */
    totalStyleRecalcMs: number;
    /** Number of forced layout/reflow events */
    forcedLayoutCount: number;
    /** Number of paint events */
    paintEventCount: number;
}
/** Main-thread blocking summary */
export interface MainThreadSummary {
    /** Total blocking time (sum of all task time > 50ms threshold, ms) */
    totalBlockingMs: number;
    /** Total time spent on the main thread (all tasks, ms) */
    totalMainThreadMs: number;
    /** Count of long tasks (>50ms) */
    longTaskCount: number;
    /** Duration of the longest single task (ms) */
    longestTaskMs: number;
    /** Time breakdown by category (ms): { scripting, layout, painting, ... } */
    categoryBreakdown: Record<string, number>;
}
/** Bundle-level signals derived from scripting analysis */
export interface BundleSignals {
    /** Whether a large initial JS bundle was detected (>200ms evaluation) */
    largeInitialJS: boolean;
    /** Whether multiple large JS files were evaluated before FCP */
    heavyEarlyScripts: boolean;
    /** Estimated total JS parse+evaluate time before FCP (ms) */
    jsBeforeFcpMs: number;
    /** Top script URLs by evaluation time */
    topScripts: Array<{
        url: string;
        evaluationMs: number;
    }>;
}
/** Cross-signal correlation results */
export interface CorrelationInsights {
    /** True if any long task overlaps with the LCP window */
    lcpBlockedByLongTask: boolean;
    /** True if render-blocking resources pushed FCP out */
    fcpBlockedByResources: boolean;
    /** True if hydration delay contributed to LCP delay */
    hydrationDelayedLcp: boolean;
    /** True if heavy JS before FCP is the dominant bottleneck */
    heavyJsBeforeFcp: boolean;
    /** Primary diagnosed bottleneck category */
    primaryBottleneck: BottleneckCategory;
    /** Explanation string for AI context */
    explanation: string;
}
/**
 * Result from the multi-signal framework detection engine.
 * Combines trace-parser runtime signals (primary) with LHR script signatures (secondary).
 */
export interface FrameworkDetectionResult {
    /** Detected framework (null if none detected) */
    framework: "react" | "next.js" | "vue" | "nuxt" | "angular" | "astro" | "remix" | "svelte" | "sveltekit" | "unknown" | null;
    /** Combined confidence score 0–1 */
    confidence: number;
    /** Which detection methods fired */
    detectionMethods: Array<"trace-user-timing" | "trace-scripting" | "lhr-bootup" | "script-url-signature" | "post-fcp-heuristic">;
    /** Human-readable explanation */
    confidenceNote: string | null;
    /** Detected framework version string if available */
    runtimeVersion: string | null;
}
export type BottleneckCategory = "render-blocking-resources" | "long-tasks" | "heavy-javascript" | "slow-server" | "hydration-delay" | "image-optimization" | "unknown";
/**
 * The compact, structured bottleneck summary produced by the parser.
 * This is what gets sent to the AI engine — never raw trace data.
 *
 * All values are in milliseconds unless explicitly noted.
 */
export interface ParsedTraceBottlenecks {
    /** Source URL of the audited page */
    url: string | null;
    /** ISO 8601 timestamp of when the parse was run */
    parsedAt: string;
    /**
     * Data quality indicator:
     *   "full"    — Chrome trace + LHR + HAR all provided
     *   "trace"   — Chrome trace only
     *   "lhr"     — Lighthouse LHR only
     *   "partial" — Incomplete data, some signals estimated
     */
    dataQuality: "full" | "trace" | "lhr" | "partial";
    /** Core Web Vitals snapshot (ms, or null if unavailable) */
    vitals: {
        fcp: number | null;
        lcp: number | null;
        tbt: number | null;
        cls: number | null;
        tti: number | null;
        ttfb: number | null;
        speedIndex: number | null;
    };
    /** Main-thread blocking summary */
    mainThread: MainThreadSummary;
    /**
     * Top long tasks sorted by duration desc.
     * Capped at 10 to keep AI context compact.
     */
    largestLongTasks: LongTask[];
    /** Best LCP candidate found */
    lcpCandidate: LCPCandidate | null;
    /**
     * Render-blocking resources sorted by blockingMs desc.
     * Capped at 10 items.
     */
    renderBlockingResources: RenderBlockingResource[];
    /** Hydration delay analysis with confidence scoring */
    hydration: HydrationSignal;
    /**
     * Top scripting bottlenecks sorted by totalExecutionMs desc.
     * Capped at 10 items.
     */
    scriptingBottlenecks: ScriptingBottleneck[];
    /** Paint and layout rendering timeline */
    rendering: RenderingTimeline;
    /** Bundle composition signals */
    bundleSignals: BundleSignals;
    /** Cross-signal correlation and primary bottleneck diagnosis */
    correlations: CorrelationInsights;
    /**
     * Multi-signal framework detection result.
     * Primary: trace runtime signals. Secondary: LHR script URL signatures.
     */
    frameworkDetection: FrameworkDetectionResult;
    /**
     * Structured signal list for AI prompt injection.
     * Each string is a single, concise, human-readable performance fact.
     * Max 20 items.
     */
    aiSignals: string[];
}
//# sourceMappingURL=types.d.ts.map