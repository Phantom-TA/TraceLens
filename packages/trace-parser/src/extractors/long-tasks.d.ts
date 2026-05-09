/**
 * @file extractors/long-tasks.ts
 * @description Long task detection and attribution engine.
 *
 * DEFINITION: A long task is any synchronous work on the main thread that
 * exceeds 50ms. These are the primary cause of poor INP and TBT scores.
 *
 * DETECTION STRATEGY:
 *   Chrome traces expose tasks via "Task" events (cat: "toplevel") on the
 *   main thread. Their sub-events (EvaluateScript, Layout, etc.) reveal
 *   what work was done inside the task.
 *
 *   For each Task event with dur > 50ms:
 *     1. Collect child events within the task's time window
 *     2. Sum durations by category (scripting, layout, painting, etc.)
 *     3. Identify the dominant category
 *     4. Extract the script URL of the longest EvaluateScript child
 */
import type { LongTask, RawTraceEvent, RendererThread } from "../types.js";
/**
 * Extracts and characterizes all long tasks from the filtered trace.
 *
 * @param events    - Pre-filtered events (main thread only)
 * @param renderer  - Renderer thread identity with navigationStart
 * @param lcpMs     - LCP time in ms (optional) — used to flag lcpOverlap
 * @returns         - Array of LongTask, sorted by duration desc, capped at MAX_LONG_TASKS
 */
export declare function extractLongTasks(events: RawTraceEvent[], renderer: RendererThread, lcpMs?: number | null): LongTask[];
/**
 * Computes the overall main thread blocking summary from all task events.
 * This includes both long tasks and shorter tasks for the category breakdown.
 *
 * @param events    - Pre-filtered events
 * @param renderer  - Renderer thread
 * @param longTasks - Already-extracted long tasks
 */
export declare function computeMainThreadSummary(events: RawTraceEvent[], renderer: RendererThread, longTasks: LongTask[]): import("../types.js").MainThreadSummary;
//# sourceMappingURL=long-tasks.d.ts.map