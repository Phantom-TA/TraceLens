/**
 * @file extractors/scripting.ts
 * @description JS execution bottleneck analysis.
 *
 * Groups all EvaluateScript / FunctionCall events by script URL,
 * sums their execution times, and identifies which scripts are the
 * biggest consumers of main-thread time.
 *
 * Also computes BundleSignals: whether heavy JS evaluated before FCP,
 * indicating a bundle-size problem affecting render performance.
 */

import type {
  BundleSignals,
  LighthouseLHRInput,
  RawTraceEvent,
  RendererThread,
  RenderingTimeline,
  ScriptingBottleneck,
} from "../types.js";
import { durToMs, extractScriptUrl, tsToMs } from "../filters.js";

const MAX_SCRIPTING_BOTTLENECKS = 10;
const LARGE_EVAL_THRESHOLD_MS = 200;

/**
 * Extracts scripting bottlenecks from Chrome trace events.
 * Groups by script URL and sums execution time.
 *
 * @param events    - Pre-filtered trace events (main thread)
 * @param renderer  - Renderer thread identity
 * @param longTaskScripts - Script URLs identified as long-task causes
 * @returns         - Array of ScriptingBottleneck sorted by totalExecutionMs desc
 */
export function extractScriptingBottlenecks(
  events: RawTraceEvent[],
  renderer: RendererThread,
  longTaskScripts: Set<string>
): ScriptingBottleneck[] {
  // Accumulate per-script stats
  const scriptMap = new Map<string, {
    totalMs: number;
    evalCount: number;
    largestMs: number;
  }>();

  const mainEvents = events.filter(
    (ev) =>
      ev.pid === renderer.pid &&
      ev.tid === renderer.tid &&
      ev.ph === "X" &&
      (ev.name === "EvaluateScript" || ev.name === "FunctionCall" || ev.name === "v8.execute")
  );

  for (const ev of mainEvents) {
    const url = extractScriptUrl(ev) ?? "unknown";
    const durMs = durToMs(ev.dur ?? 0);
    if (durMs < 1) continue; // skip sub-ms evaluations

    const existing = scriptMap.get(url) ?? { totalMs: 0, evalCount: 0, largestMs: 0 };
    scriptMap.set(url, {
      totalMs: existing.totalMs + durMs,
      evalCount: existing.evalCount + 1,
      largestMs: Math.max(existing.largestMs, durMs),
    });
  }

  const results: ScriptingBottleneck[] = [];
  for (const [url, stats] of scriptMap) {
    results.push({
      url,
      totalExecutionMs: Math.round(stats.totalMs * 10) / 10,
      evaluationCount: stats.evalCount,
      largestEvaluationMs: Math.round(stats.largestMs * 10) / 10,
      causedLongTask: longTaskScripts.has(url),
    });
  }

  return results
    .sort((a, b) => b.totalExecutionMs - a.totalExecutionMs)
    .slice(0, MAX_SCRIPTING_BOTTLENECKS);
}

/**
 * Extracts scripting bottlenecks from Lighthouse LHR bootup-time audit.
 * Used when no raw trace is available.
 */
export function extractScriptingFromLHR(lhr: LighthouseLHRInput): ScriptingBottleneck[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items: any[] = lhr.audits?.["bootup-time"]?.details?.items ?? [];

  return items
    .map((item): ScriptingBottleneck => ({
      url: shortenUrl(item.url ?? "unknown"),
      totalExecutionMs: Math.round((item.total ?? 0) * 10) / 10,
      evaluationCount: 1,
      largestEvaluationMs: Math.round((item.scripting ?? item.total ?? 0) * 10) / 10,
      causedLongTask: false,
    }))
    .sort((a, b) => b.totalExecutionMs - a.totalExecutionMs)
    .slice(0, MAX_SCRIPTING_BOTTLENECKS);
}

/**
 * Computes rendering timeline (paint, layout, style recalc).
 */
export function extractRenderingTimeline(
  events: RawTraceEvent[],
  renderer: RendererThread
): RenderingTimeline {
  const { navigationStart } = renderer;
  let totalLayoutMs = 0, totalPaintMs = 0, totalStyleRecalcMs = 0;
  let forcedLayoutCount = 0, paintEventCount = 0;
  let firstPaintMs: number | null = null;
  let firstContentfulPaintMs: number | null = null;

  // Paint/FCP marker events
  for (const ev of events) {
    if (ev.pid !== renderer.pid) continue;

    if (ev.name === "firstPaint" || ev.name === "first-paint") {
      firstPaintMs = tsToMs(ev.ts, navigationStart);
    }
    if (ev.name === "firstContentfulPaint" || ev.name === "first-contentful-paint") {
      firstContentfulPaintMs = tsToMs(ev.ts, navigationStart);
    }

    if (ev.tid !== renderer.tid || ev.ph !== "X") continue;

    const durMs = durToMs(ev.dur ?? 0);
    if (ev.name === "Layout" || ev.name === "UpdateLayoutTree") {
      totalLayoutMs += durMs;
      if (ev.args?.["beginData"]?.["stackTrace"]?.length > 0) {
        forcedLayoutCount++;
      }
    } else if (ev.name === "Paint" || ev.name === "CompositeLayers") {
      totalPaintMs += durMs;
      paintEventCount++;
    } else if (ev.name === "RecalculateStyles" || ev.name === "UpdateLayoutTree") {
      totalStyleRecalcMs += durMs;
    }
  }

  return {
    firstPaintMs,
    firstContentfulPaintMs,
    totalLayoutMs: Math.round(totalLayoutMs),
    totalPaintMs: Math.round(totalPaintMs),
    totalStyleRecalcMs: Math.round(totalStyleRecalcMs),
    forcedLayoutCount,
    paintEventCount,
  };
}

/**
 * Computes bundle signals from scripting data + FCP timing.
 */
export function computeBundleSignals(
  events: RawTraceEvent[],
  renderer: RendererThread,
  fcpMs: number | null,
  scriptingBottlenecks: ScriptingBottleneck[]
): BundleSignals {
  const { navigationStart } = renderer;
  const fcpTs = fcpMs !== null ? navigationStart + fcpMs * 1000 : Infinity;

  // Sum JS evaluation time before FCP
  let jsBeforeFcpMs = 0;
  const topScriptsBeforeFcp: Array<{ url: string; evaluationMs: number }> = [];
  const preloadScripts = new Map<string, number>();

  const mainEvents = events.filter(
    (ev) =>
      ev.pid === renderer.pid &&
      ev.tid === renderer.tid &&
      ev.ph === "X" &&
      (ev.name === "EvaluateScript" || ev.name === "v8.execute") &&
      ev.ts < fcpTs
  );

  for (const ev of mainEvents) {
    const durMs = durToMs(ev.dur ?? 0);
    jsBeforeFcpMs += durMs;
    const url = extractScriptUrl(ev) ?? "unknown";
    preloadScripts.set(url, (preloadScripts.get(url) ?? 0) + durMs);
  }

  for (const [url, evaluationMs] of preloadScripts) {
    topScriptsBeforeFcp.push({ url, evaluationMs: Math.round(evaluationMs) });
  }
  topScriptsBeforeFcp.sort((a, b) => b.evaluationMs - a.evaluationMs);

  const largeInitialJS =
    scriptingBottlenecks.some((s) => s.largestEvaluationMs >= LARGE_EVAL_THRESHOLD_MS) ||
    jsBeforeFcpMs > 200;

  const heavyEarlyScripts = topScriptsBeforeFcp.length >= 3 || jsBeforeFcpMs > 500;

  return {
    largeInitialJS,
    heavyEarlyScripts,
    jsBeforeFcpMs: Math.round(jsBeforeFcpMs),
    topScripts: topScriptsBeforeFcp.slice(0, 5),
  };
}

function shortenUrl(url: string): string {
  try {
    const p = new URL(url);
    return p.pathname.split("/").pop() ?? p.hostname;
  } catch {
    return url.slice(0, 80);
  }
}
