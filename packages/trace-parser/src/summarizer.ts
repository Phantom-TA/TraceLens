/**
 * @file summarizer.ts
 * @description AI-signal builder.
 *
 * Converts extracted bottleneck data into a concise, human-readable list
 * of performance facts optimized for LLM prompt injection.
 *
 * RULES:
 *   - Max 20 signals
 *   - Each signal is a single sentence
 *   - Most impactful signals listed first
 *   - No redundant data (don't repeat the same issue twice)
 *   - No raw arrays or nested objects in signal strings
 */

import type {
  BundleSignals,
  CorrelationInsights,
  HydrationSignal,
  LCPCandidate,
  LongTask,
  MainThreadSummary,
  RenderBlockingResource,
  RenderingTimeline,
  ScriptingBottleneck,
} from "./types.js";

const MAX_SIGNALS = 20;

/**
 * Builds the aiSignals array from all parsed bottleneck data.
 * Each signal is a concise, factual performance statement.
 */
export function buildAISignals(params: {
  vitals: Record<string, number | null>;
  mainThread: MainThreadSummary;
  longTasks: LongTask[];
  lcpCandidate: LCPCandidate | null;
  renderBlockers: RenderBlockingResource[];
  hydration: HydrationSignal;
  scripting: ScriptingBottleneck[];
  rendering: RenderingTimeline;
  bundle: BundleSignals;
  correlations: CorrelationInsights;
}): string[] {
  const signals: string[] = [];

  const {
    vitals, mainThread, longTasks, lcpCandidate,
    renderBlockers, hydration, scripting, rendering,
    bundle, correlations,
  } = params;

  // ── Primary diagnosis first ────────────────────────────────────────────────
  signals.push(`Primary bottleneck: ${correlations.primaryBottleneck.replace(/-/g, " ")}.`);

  // ── Core Web Vitals ────────────────────────────────────────────────────────
  if (vitals.lcp !== null) {
    const rating = vitals.lcp <= 2500 ? "Good" : vitals.lcp <= 4000 ? "Needs Improvement" : "Poor";
    signals.push(`LCP is ${vitals.lcp}ms (${rating}).`);
  }
  if (vitals.fcp !== null) {
    const rating = vitals.fcp <= 1800 ? "Good" : vitals.fcp <= 3000 ? "Needs Improvement" : "Poor";
    signals.push(`FCP is ${vitals.fcp}ms (${rating}).`);
  }
  if (vitals.tbt !== null) {
    const rating = vitals.tbt <= 200 ? "Good" : vitals.tbt <= 600 ? "Needs Improvement" : "Poor";
    signals.push(`TBT is ${vitals.tbt}ms (${rating}).`);
  }
  if (vitals.cls !== null && vitals.cls > 0) {
    signals.push(`CLS score is ${vitals.cls} (${vitals.cls <= 0.1 ? "Good" : vitals.cls <= 0.25 ? "Needs Improvement" : "Poor"}).`);
  }
  if (vitals.ttfb !== null && vitals.ttfb > 200) {
    signals.push(`TTFB is ${vitals.ttfb}ms — server response is ${vitals.ttfb > 800 ? "critically slow" : "slow"}.`);
  }

  // ── Main Thread ────────────────────────────────────────────────────────────
  if (mainThread.totalBlockingMs > 0) {
    signals.push(`Total blocking time: ${mainThread.totalBlockingMs}ms across ${mainThread.longTaskCount} long task(s).`);
  }
  if (mainThread.longestTaskMs > 100) {
    signals.push(`Longest single task: ${mainThread.longestTaskMs}ms.`);
  }

  // ── Long Tasks ─────────────────────────────────────────────────────────────
  if (longTasks.length > 0) {
    const top = longTasks[0]!;
    signals.push(
      `Worst long task: ${top.duration}ms of ${top.attribution}` +
      (top.script ? ` in "${top.script}"` : "") + ` at t=${top.startTime}ms.`
    );
  }

  // ── LCP ───────────────────────────────────────────────────────────────────
  if (lcpCandidate) {
    const el = lcpCandidate.element ?? "unknown element";
    signals.push(`LCP element: "${el}" rendered at ${lcpCandidate.renderTime}ms.`);
    if (lcpCandidate.sizeKB) {
      signals.push(`LCP resource size: ${lcpCandidate.sizeKB}KB.`);
    }
    if (lcpCandidate.wasRenderBlocked) {
      signals.push("LCP resource was delayed by render-blocking dependencies.");
    }
  }
  if (correlations.lcpBlockedByLongTask) {
    signals.push("A long task on the main thread overlapped with the LCP render window.");
  }

  // ── Render Blocking ───────────────────────────────────────────────────────
  if (renderBlockers.length > 0) {
    const top = renderBlockers[0]!;
    signals.push(
      `${renderBlockers.length} render-blocking resource(s). Worst: "${top.url}" blocks ~${top.blockingMs ?? "?"}ms.`
    );
  }

  // ── Hydration ─────────────────────────────────────────────────────────────
  if (hydration.detected) {
    const fw = hydration.framework ?? "unknown framework";
    signals.push(
      `${fw} hydration detected: ${hydration.durationMs}ms` +
      (hydration.fcpToHydrationMs !== null ? `, ${hydration.fcpToHydrationMs}ms after FCP` : "") + `.`
    );
  }

  // ── Scripting ─────────────────────────────────────────────────────────────
  if (scripting.length > 0) {
    const top = scripting[0]!;
    signals.push(`Heaviest script: "${top.url}" with ${top.totalExecutionMs}ms total execution.`);
  }
  if (bundle.jsBeforeFcpMs > 100) {
    signals.push(`${bundle.jsBeforeFcpMs}ms of JavaScript executed before FCP.`);
  }
  if (bundle.largeInitialJS) {
    signals.push("Large initial JavaScript bundle detected — consider code splitting.");
  }

  // ── Rendering ─────────────────────────────────────────────────────────────
  if (rendering.totalLayoutMs > 50) {
    signals.push(`Total layout work: ${rendering.totalLayoutMs}ms.`);
  }
  if (rendering.forcedLayoutCount > 0) {
    signals.push(`${rendering.forcedLayoutCount} forced layout/reflow(s) detected.`);
  }

  return signals.slice(0, MAX_SIGNALS);
}
