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

import type { LongTask, LongTaskAttribution, RawTraceEvent, RendererThread } from "../types.js";
import {
  classifyEventCategory,
  durToMs,
  extractScriptUrl,
  tsToMs,
} from "../filters.js";

/** Minimum task duration to qualify as a "long task" (µs) */
const LONG_TASK_THRESHOLD_US = 50_000;

/** Maximum long tasks to return (keeps AI context bounded) */
const MAX_LONG_TASKS = 10;

/**
 * Extracts and characterizes all long tasks from the filtered trace.
 *
 * @param events    - Pre-filtered events (main thread only)
 * @param renderer  - Renderer thread identity with navigationStart
 * @returns         - Array of LongTask, sorted by duration desc, capped at MAX_LONG_TASKS
 */
export function extractLongTasks(
  events: RawTraceEvent[],
  renderer: RendererThread
): LongTask[] {
  const { navigationStart } = renderer;

  // Collect task boundaries from "Task" (toplevel) and "RunTask" events
  // ph="X" complete events with dur > threshold
  const taskEvents = events.filter(
    (ev) =>
      ev.pid === renderer.pid &&
      ev.tid === renderer.tid &&
      ev.ph === "X" &&
      (ev.name === "Task" ||
        ev.name === "RunTask" ||
        ev.name === "ThreadControllerImpl::RunTask" ||
        ev.name === "TaskQueueManager::ProcessTaskFromWorkQueue") &&
      (ev.dur ?? 0) >= LONG_TASK_THRESHOLD_US
  );

  if (taskEvents.length === 0) {
    // Fallback: try to reconstruct tasks from B/E pairs
    return extractLongTasksFromBEPairs(events, renderer);
  }

  const longTasks: LongTask[] = taskEvents.map((taskEv) => {
    const taskStart = taskEv.ts;
    const taskEnd = taskStart + (taskEv.dur ?? 0);
    const durationMs = durToMs(taskEv.dur ?? 0);
    const startMs = tsToMs(taskStart, navigationStart);

    // Collect all child events within this task's time window
    const children = events.filter(
      (ev) =>
        ev.pid === renderer.pid &&
        ev.tid === renderer.tid &&
        ev.ph === "X" &&
        ev !== taskEv &&
        ev.ts >= taskStart &&
        ev.ts + (ev.dur ?? 0) <= taskEnd + 1000 // +1ms tolerance
    );

    // Build category breakdown
    const breakdown: Record<string, number> = {};
    let topScriptUrl: string | null = null;
    let longestScriptDur = 0;

    for (const child of children) {
      const cat = classifyEventCategory(child);
      const dur = durToMs(child.dur ?? 0);
      breakdown[cat] = (breakdown[cat] ?? 0) + dur;

      // Track the longest EvaluateScript to attribute the task
      if (
        (child.name === "EvaluateScript" || child.name === "FunctionCall") &&
        (child.dur ?? 0) > longestScriptDur
      ) {
        longestScriptDur = child.dur ?? 0;
        const url = extractScriptUrl(child);
        if (url) topScriptUrl = url;
      }
    }

    // If no child events found, the task itself may be the attribution unit
    if (Object.keys(breakdown).length === 0) {
      const selfCat = classifyEventCategory(taskEv);
      breakdown[selfCat] = durationMs;
      if (!topScriptUrl) topScriptUrl = extractScriptUrl(taskEv);
    }

    const attribution = dominantCategory(breakdown);

    return {
      script: topScriptUrl,
      duration: durationMs,
      startTime: startMs,
      attribution,
      breakdown,
    };
  });

  return longTasks
    .sort((a, b) => b.duration - a.duration)
    .slice(0, MAX_LONG_TASKS);
}

/**
 * Fallback: reconstruct long tasks from B/E begin/end event pairs.
 * Used when top-level "Task" X-events are absent (older Chrome versions,
 * some trace formats).
 */
function extractLongTasksFromBEPairs(
  events: RawTraceEvent[],
  renderer: RendererThread
): LongTask[] {
  const { navigationStart } = renderer;
  const mainEvents = events.filter(
    (ev) => ev.pid === renderer.pid && ev.tid === renderer.tid
  );

  // Find all EvaluateScript X-events > 50ms (each is its own long task segment)
  const longScripts = mainEvents.filter(
    (ev) =>
      ev.ph === "X" &&
      (ev.name === "EvaluateScript" || ev.name === "v8.execute" || ev.name === "FunctionCall") &&
      (ev.dur ?? 0) >= LONG_TASK_THRESHOLD_US
  );

  return longScripts
    .map((ev) => ({
      script: extractScriptUrl(ev),
      duration: durToMs(ev.dur ?? 0),
      startTime: tsToMs(ev.ts, navigationStart),
      attribution: "scripting" as LongTaskAttribution,
      breakdown: { scripting: durToMs(ev.dur ?? 0) },
    }))
    .sort((a, b) => b.duration - a.duration)
    .slice(0, MAX_LONG_TASKS);
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Returns the category with the highest accumulated duration.
 */
function dominantCategory(breakdown: Record<string, number>): LongTaskAttribution {
  let topCat = "other";
  let topVal = 0;
  for (const [cat, val] of Object.entries(breakdown)) {
    if (val > topVal) {
      topVal = val;
      topCat = cat;
    }
  }
  const map: Record<string, LongTaskAttribution> = {
    scripting: "scripting",
    layout: "layout",
    "style-recalc": "style-recalc",
    painting: "painting",
    parsing: "parsing",
  };
  return map[topCat] ?? "other";
}

// ─── Main Thread Summary ───────────────────────────────────────────────────────

/**
 * Computes the overall main thread blocking summary from all task events.
 * This includes both long tasks and shorter tasks for the category breakdown.
 *
 * @param events    - Pre-filtered events
 * @param renderer  - Renderer thread
 * @param longTasks - Already-extracted long tasks
 */
export function computeMainThreadSummary(
  events: RawTraceEvent[],
  renderer: RendererThread,
  longTasks: LongTask[]
): import("../types.js").MainThreadSummary {
  // Total blocking time = sum of (task_duration - 50ms) for each long task
  let totalBlockingMs = 0;
  let longestTaskMs = 0;

  for (const task of longTasks) {
    totalBlockingMs += Math.max(0, task.duration - 50);
    if (task.duration > longestTaskMs) longestTaskMs = task.duration;
  }

  // Category breakdown from all main-thread X-events
  const categoryBreakdown: Record<string, number> = {};
  let totalMainThreadMs = 0;

  const mainEvents = events.filter(
    (ev) =>
      ev.pid === renderer.pid &&
      ev.tid === renderer.tid &&
      ev.ph === "X"
  );

  for (const ev of mainEvents) {
    const durMs = durToMs(ev.dur ?? 0);
    if (durMs < 0.5) continue; // skip sub-ms noise
    const cat = classifyEventCategory(ev);
    categoryBreakdown[cat] = (categoryBreakdown[cat] ?? 0) + durMs;
    totalMainThreadMs += durMs;
  }

  return {
    totalBlockingMs: Math.round(totalBlockingMs * 10) / 10,
    totalMainThreadMs: Math.round(totalMainThreadMs * 10) / 10,
    longTaskCount: longTasks.length,
    longestTaskMs,
    categoryBreakdown,
  };
}
