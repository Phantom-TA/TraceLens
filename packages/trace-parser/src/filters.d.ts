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
import type { RawTraceEvent, RendererThread } from "./types.js";
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
export declare function discoverRendererThread(events: RawTraceEvent[]): RendererThread | null;
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
export declare function filterEvents(events: RawTraceEvent[], renderer: RendererThread): RawTraceEvent[];
/**
 * Returns the duration of a trace event in microseconds.
 * For B/E pairs, this is computed from the pair. For X events, use dur directly.
 * Returns 0 if duration cannot be determined.
 */
export declare function getEventDurationUs(ev: RawTraceEvent): number;
/**
 * Converts a raw trace timestamp (µs) to milliseconds relative to navigationStart.
 *
 * @param ts          - Raw trace timestamp in microseconds
 * @param navStartUs  - Navigation start timestamp in microseconds
 * @returns           - Relative time in milliseconds (rounded to 1 decimal)
 */
export declare function tsToMs(ts: number, navStartUs: number): number;
/**
 * Converts a duration in microseconds to milliseconds.
 */
export declare function durToMs(durUs: number): number;
/**
 * Classifies an event's primary work category for breakdown reporting.
 */
export declare function classifyEventCategory(ev: RawTraceEvent): string;
/**
 * Extracts a script URL from an EvaluateScript or FunctionCall event's args.
 * Returns null if no URL is present.
 */
export declare function extractScriptUrl(ev: RawTraceEvent): string | null;
//# sourceMappingURL=filters.d.ts.map