/**
 * @file correlator.ts
 * @description Cross-signal correlation engine.
 *
 * PURPOSE:
 *   Takes all extracted signals and produces a unified diagnosis.
 *   The correlator answers: "WHY is the frontend slow?" by finding
 *   causal relationships between bottleneck signals.
 *
 * CORRELATION RULES:
 *
 *   1. lcpBlockedByLongTask:
 *      A long task overlaps with or precedes the LCP window (LCP - 200ms to LCP).
 *
 *   2. fcpBlockedByResources:
 *      Render-blocking resources exist (blockingMs > 0).
 *
 *   3. hydrationDelayedLcp:
 *      Hydration end time is later than or close to LCP render time.
 *      (Text LCP can be delayed by hydration — the DOM exists but is
 *      not rendered until the framework takes control.)
 *
 *   4. heavyJsBeforeFcp:
 *      More than 200ms of JS evaluated before FCP.
 *
 *   PRIMARY BOTTLENECK DIAGNOSIS:
 *      Pick the highest-impact root cause based on severity ordering:
 *        render-blocking-resources > heavy-javascript > hydration-delay
 *        > long-tasks > slow-server > image-optimization > unknown
 */

import type {
  BottleneckCategory,
  BundleSignals,
  CorrelationInsights,
  HydrationSignal,
  LCPCandidate,
  LongTask,
  RenderBlockingResource,
} from "./types.js";

/**
 * Correlates all extracted signals into a unified bottleneck diagnosis.
 *
 * @param lcpCandidate        - Detected LCP candidate (or null)
 * @param longTasks           - Top long tasks
 * @param renderBlockers      - Render-blocking resources
 * @param hydration           - Hydration signal
 * @param bundleSignals       - Bundle composition signals
 * @param fcpMs               - First Contentful Paint (ms)
 * @param ttfbMs              - Time to First Byte (ms)
 * @returns                   - CorrelationInsights
 */
export function correlateSignals(
  lcpCandidate: LCPCandidate | null,
  longTasks: LongTask[],
  renderBlockers: RenderBlockingResource[],
  hydration: HydrationSignal,
  bundleSignals: BundleSignals,
  fcpMs: number | null,
  ttfbMs: number | null
): CorrelationInsights {
  const lcpMs = lcpCandidate?.renderTime ?? null;

  // ── 1. LCP blocked by long task ──────────────────────────────────────────────
  let lcpBlockedByLongTask = false;
  if (lcpMs !== null && longTasks.length > 0) {
    const lcpWindowStart = lcpMs - 500; // 500ms look-back window
    lcpBlockedByLongTask = longTasks.some(
      (t) =>
        t.startTime + t.duration >= lcpWindowStart &&
        t.startTime <= lcpMs
    );
  }

  // ── 2. FCP blocked by render-blocking resources ───────────────────────────
  const fcpBlockedByResources =
    renderBlockers.length > 0 &&
    renderBlockers.some((r) => (r.blockingMs ?? 0) > 50);

  // ── 3. Hydration delayed LCP ──────────────────────────────────────────────
  let hydrationDelayedLcp = false;
  if (hydration.detected && hydration.endTime !== null && lcpMs !== null) {
    // If hydration ends after LCP or within 100ms before it, it likely contributed
    hydrationDelayedLcp = hydration.endTime >= lcpMs - 100;
  }

  // ── 4. Heavy JS before FCP ────────────────────────────────────────────────
  const heavyJsBeforeFcp = bundleSignals.jsBeforeFcpMs > 200;

  // ── Primary bottleneck diagnosis ──────────────────────────────────────────
  const primaryBottleneck = diagnosePrimaryBottleneck({
    renderBlockers,
    bundleSignals,
    hydration,
    longTasks,
    ttfbMs,
    lcpCandidate,
    lcpBlockedByLongTask,
    fcpBlockedByResources,
    heavyJsBeforeFcp,
    hydrationDelayedLcp,
  });

  const explanation = buildExplanation({
    primaryBottleneck,
    lcpBlockedByLongTask,
    fcpBlockedByResources,
    hydrationDelayedLcp,
    heavyJsBeforeFcp,
    lcpMs,
    fcpMs,
    ttfbMs,
    hydration,
    renderBlockers,
    bundleSignals,
    longTasks,
    lcpCandidate,
  });

  return {
    lcpBlockedByLongTask,
    fcpBlockedByResources,
    hydrationDelayedLcp,
    heavyJsBeforeFcp,
    primaryBottleneck,
    explanation,
  };
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

interface DiagnoseInput {
  renderBlockers: RenderBlockingResource[];
  bundleSignals: BundleSignals;
  hydration: HydrationSignal;
  longTasks: LongTask[];
  ttfbMs: number | null;
  lcpCandidate: LCPCandidate | null;
  lcpBlockedByLongTask: boolean;
  fcpBlockedByResources: boolean;
  heavyJsBeforeFcp: boolean;
  hydrationDelayedLcp: boolean;
}

function diagnosePrimaryBottleneck(input: DiagnoseInput): BottleneckCategory {
  const {
    renderBlockers, bundleSignals, hydration, longTasks,
    ttfbMs, lcpCandidate, fcpBlockedByResources, heavyJsBeforeFcp, hydrationDelayedLcp,
  } = input;

  // Slow server is the most fundamental bottleneck
  if (ttfbMs !== null && ttfbMs > 800) return "slow-server";

  // Render-blocking CSS/JS directly delays FCP
  if (fcpBlockedByResources && renderBlockers.some((r) => (r.blockingMs ?? 0) > 200)) {
    return "render-blocking-resources";
  }

  // Heavy JS before FCP → bundle problem
  if (heavyJsBeforeFcp && bundleSignals.jsBeforeFcpMs > 500) return "heavy-javascript";

  // Hydration delay causing interaction gap
  if (hydrationDelayedLcp && (hydration.durationMs ?? 0) > 300) return "hydration-delay";

  // Image LCP that is large
  if (lcpCandidate?.sizeKB && lcpCandidate.sizeKB > 500 && lcpCandidate.resourceUrl) {
    return "image-optimization";
  }

  // Long tasks blocking the thread
  if (longTasks.length > 0 && longTasks[0]!.duration > 200) return "long-tasks";

  // Moderate render blocking
  if (fcpBlockedByResources) return "render-blocking-resources";

  // Moderate JS
  if (heavyJsBeforeFcp) return "heavy-javascript";

  return "unknown";
}

interface ExplanationInput extends DiagnoseInput {
  primaryBottleneck: BottleneckCategory;
  lcpMs: number | null;
  fcpMs: number | null;
  longTasks: LongTask[];
}

function buildExplanation(input: ExplanationInput): string {
  const { primaryBottleneck, lcpMs, fcpMs, ttfbMs, renderBlockers, bundleSignals, longTasks, hydration } = input;
  const parts: string[] = [];

  switch (primaryBottleneck) {
    case "slow-server":
      parts.push(`Server is slow (TTFB: ${ttfbMs}ms). The browser is waiting for the server before it can render anything.`);
      break;
    case "render-blocking-resources": {
      const top = renderBlockers[0];
      parts.push(
        `Render-blocking resource detected: "${top?.url}" blocks FCP by ~${top?.blockingMs ?? "?"}ms. ` +
        `The browser cannot paint until this resource is fully loaded.`
      );
      break;
    }
    case "heavy-javascript":
      parts.push(
        `Heavy JavaScript (${bundleSignals.jsBeforeFcpMs}ms) evaluated before FCP. ` +
        `The main thread is occupied with JS parsing/execution, delaying first paint.`
      );
      break;
    case "hydration-delay":
      parts.push(
        `Framework hydration delay detected (${hydration.durationMs}ms). ` +
        `The page is visually rendered but non-interactive until hydration completes.`
      );
      break;
    case "image-optimization":
      parts.push(`LCP image is large (${input.lcpCandidate?.sizeKB}KB). Compress/resize or use modern formats (WebP/AVIF).`);
      break;
    case "long-tasks": {
      const top = longTasks[0];
      parts.push(
        `Long task blocking main thread: ${top?.duration}ms ${top?.attribution} work` +
        (top?.script ? ` in "${top.script}"` : "") + `.`
      );
      break;
    }
    default:
      parts.push("No dominant performance bottleneck identified. Site appears well-optimized.");
  }

  if (lcpMs !== null) parts.push(`LCP: ${lcpMs}ms.`);
  if (fcpMs !== null) parts.push(`FCP: ${fcpMs}ms.`);
  if (hydration.detected && hydration.durationMs) parts.push(`Hydration: ${hydration.durationMs}ms.`);

  return parts.join(" ");
}
