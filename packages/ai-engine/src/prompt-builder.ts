/**
 * @file prompt-builder.ts
 * @description Builds compact, deterministic prompts from TraceLensIntelligenceReport.
 *
 * DESIGN GOALS:
 *   1. Token-efficient   — sends only the signals the AI needs, not the full report
 *   2. Deterministic     — same input always produces same prompt structure
 *   3. Context-rich      — includes actual metric values, severity scores, confidence
 *   4. Noise-filtered    — excludes raw arrays, verbose diagnostics, redundant data
 *
 * PROMPT STRATEGY:
 *   - System prompt: defines role, output format, constraints
 *   - User prompt:   compact JSON payload (~300–500 tokens input)
 *   - Output format: strict JSON schema specified in system prompt
 *
 * The LLM is NOT asked to discover bottlenecks.
 * The intelligence pipeline already did that.
 * The LLM is asked to EXPLAIN, PRIORITIZE, and RECOMMEND.
 */

import type { TraceLensIntelligenceReport } from "../../analytics-engine/src/types.js";

// ─── System Prompt ─────────────────────────────────────────────────────────────

export const SYSTEM_PROMPT = `You are TraceLens, a frontend performance intelligence analyst.
You receive structured, pre-analyzed performance intelligence from TraceLens's analytics pipeline.
The pipeline has already identified bottlenecks, severity scores, and correlated signals.

YOUR ROLE:
- Explain WHY the frontend is slow in developer-friendly language
- Prioritize issues by real-world user impact
- Reference actual metrics (LCP, FCP, TBT, ms values, KB sizes)
- Generate specific, actionable recommendations — not generic advice
- Estimate realistic performance improvements

STRICT RULES:
- Do NOT invent bottlenecks. Only explain what the data shows.
- Do NOT give generic advice ("optimize JavaScript"). Be specific.
- Reference actual numbers from the input data (ms, KB, script names).
- When attributedScripts are provided, NAME THEM in your analysis.
- When framework is detected, make recommendations framework-specific.
- When impactEstimate is provided, reference those projected gains.
- Focus ONLY on frontend rendering performance.
- Ignore backend, database, and infrastructure concerns.
- Keep explanations concise and developer-focused.
- If confidence is below 70%, clearly state the uncertainty.

OUTPUT FORMAT:
Respond with ONLY valid JSON matching this exact schema:
{
  "summary": "2-3 sentence executive summary of overall performance health",
  "primaryBottleneck": {
    "type": "string — the primary bottleneck type",
    "explanation": "1-2 sentences explaining the root cause with specific metrics",
    "evidence": ["metric/signal 1", "metric/signal 2", "metric/signal 3"]
  },
  "rootCauses": [
    {
      "rank": 1,
      "issue": "short issue label",
      "explanation": "developer-friendly explanation with specific metric values",
      "metrics": { "key": "value" },
      "severity": "critical|high|medium|low",
      "impact": "impact on user experience"
    }
  ],
  "recommendations": [
    {
      "rank": 1,
      "action": "specific action with code/tool reference",
      "rationale": "why this helps, referencing the data",
      "estimatedImpact": "e.g. ~700ms LCP improvement",
      "effort": "low|medium|high",
      "priority": "critical|high|medium|low",
      "category": "bundle|javascript|network|server|images|rendering"
    }
  ],
  "estimatedImpact": {
    "lcp": "e.g. ~500ms improvement or null",
    "fcp": "e.g. ~300ms improvement or null",
    "tbt": "e.g. ~150ms reduction or null",
    "performanceScore": "e.g. ~15 point improvement or null",
    "note": "brief overall impact note"
  },
  "confidence": {
    "overall": 0.0-1.0,
    "dataQuality": "high|medium|low",
    "sourcesUsed": ["lighthouse", "trace-parser"],
    "note": "any caveats about data completeness"
  }
}

Limit rootCauses to 5. Limit recommendations to 7. Be concise.`;

// ─── Compact Payload Builder ───────────────────────────────────────────────────

/**
 * Build a compact JSON payload from the full TraceLensIntelligenceReport.
 * This is what gets sent to the LLM as the user prompt.
 *
 * Token budget: ~400–600 tokens for this payload.
 */
export function buildUserPrompt(report: TraceLensIntelligenceReport): string {
  const { session, coreWebVitals: v, mainThread, hydration, bundle,
    performanceRisks, scriptingBottlenecks, renderBlockingResources,
    primaryBottleneck, aiSignals, dataQuality } = report;

  // Build compact vitals
  const vitals: Record<string, string> = {};
  if (v.lcp.value !== null) vitals.lcp = `${v.lcp.value}ms [${v.lcp.rating}]`;
  if (v.fcp.value !== null) vitals.fcp = `${v.fcp.value}ms [${v.fcp.rating}]`;
  if (v.tbt.value !== null) vitals.tbt = `${v.tbt.value}ms [${v.tbt.rating}]`;
  if (v.cls.value !== null) vitals.cls = `${v.cls.value} [${v.cls.rating}]`;
  if (v.tti.value !== null) vitals.tti = `${v.tti.value}ms [${v.tti.rating}]`;
  if (v.ttfb.value !== null) vitals.ttfb = `${v.ttfb.value}ms [${v.ttfb.rating}]`;
  if (v.performanceScore !== null) vitals.score = `${v.performanceScore}/100`;

  // Top 5 performance risks with attribution and impact estimates
  const topRisks = performanceRisks.slice(0, 5).map((r) => ({
    type: r.type,
    label: r.label,
    severity: r.severity,
    confidence: Math.round(r.confidence * 100) + "%",
    impact: r.impact,
    recommendation: r.recommendation,
    sources: r.sources.join(", "),
    ...(r.attributionMetadata?.attributedScripts?.length ? {
      attributedScripts: r.attributionMetadata.attributedScripts.slice(0, 3)
        .map((s) => s.split("/").pop() ?? s),
    } : {}),
    ...(r.impactEstimate ? {
      estimatedGain: {
        ...(r.impactEstimate.lcpMs ? { lcpMs: `~${r.impactEstimate.lcpMs}ms` } : {}),
        ...(r.impactEstimate.tbtMs ? { tbtMs: `~${r.impactEstimate.tbtMs}ms` } : {}),
        ...(r.impactEstimate.fcpMs ? { fcpMs: `~${r.impactEstimate.fcpMs}ms` } : {}),
        ...(r.impactEstimate.scorePoints ? { score: `~${r.impactEstimate.scorePoints} pts` } : {}),
      }
    } : {}),
  }));

  // Top 5 scripting bottlenecks
  const topScripts = scriptingBottlenecks.slice(0, 5).map((s) => ({
    script: s.url,
    executionMs: s.totalExecutionMs,
    severity: s.severity,
  }));

  // Render-blocking (if any)
  const blocking = renderBlockingResources.slice(0, 4).map((r) => ({
    url: r.url,
    type: r.type,
    blockingMs: r.blockingMs,
  }));

  // Compact hydration signals with confidence
  const hydrationSignals = {
    largeInitialJS: hydration.largeInitialJS,
    jsBeforeFcpMs: hydration.jsBeforeFcpMs,
    hydrationDetected: hydration.detected,
    hydrationDurationMs: hydration.durationMs,
    confidence: hydration.confidence !== undefined ? Math.round(hydration.confidence * 100) + "%" : "unknown",
    detectionMethod: hydration.detectionMethod,
    severity: hydration.severity,
    note: hydration.confidenceNote,
  };

  // Compact bundle summary
  const bundleSummary = bundle ? {
    initialBundleKB: bundle.initialBundleKB,
    estimatedParseMs: bundle.estimatedParseMs,
    topDeps: bundle.largestDeps.slice(0, 4).map((d) => ({
      name: d.name,
      sizeKB: d.sizeKB,
      initial: d.initial,
    })),
    duplicates: bundle.duplicates.length > 0
      ? bundle.duplicates.map((d) => `${d.name} (wasted ${d.wastedKB}KB)`).join(", ")
      : null,
    hydrationRisk: bundle.hydrationRisk,
  } : null;

  // Top 6 pre-processed AI signals (highest priority first)
  const signals = aiSignals.slice(0, 6);

  // Main thread summary
  const mainThreadSummary = {
    totalBlockingMs: mainThread.totalBlockingMs,
    longTaskCount: mainThread.longTaskCount,
    longestTaskMs: mainThread.longestTaskMs,
  };

  // Top 3 long tasks with LCP overlap and attributed scripts
  const topLongTasksWithAttribution = mainThread.topLongTasks.slice(0, 3).map((t) => ({
    durationMs: t.durationMs,
    attribution: t.attribution,
    lcpOverlap: t.lcpOverlap ?? false,
    ...(t.attributedScripts?.length ? {
      attributedScripts: t.attributedScripts.slice(0, 2).map((s) => s.split("/").pop() ?? s),
    } : t.script ? { primaryScript: t.script.split("/").pop() ?? t.script } : {}),
  }));

  // Framework detection
  const frameworkInfo = report.framework?.framework ? {
    framework: report.framework.framework,
    confidence: Math.round((report.framework.confidence ?? 0) * 100) + "%",
    detectionMethods: report.framework.detectionMethods,
  } : null;

  const payload = {
    url: session.url,
    device: session.device,
    throttle: session.throttle,
    framework: frameworkInfo,
    vitals,
    mainThread: mainThreadSummary,
    topLongTasks: topLongTasksWithAttribution.length > 0 ? topLongTasksWithAttribution : undefined,
    primaryBottleneck,
    hydration: hydrationSignals,
    topRisks,
    topScripts: topScripts.length > 0 ? topScripts : undefined,
    renderBlocking: blocking.length > 0 ? blocking : undefined,
    bundle: bundleSummary,
    preCorrelatedSignals: signals,
    dataQuality: {
      confidence: dataQuality.confidence,
      sources: dataQuality.sources,
      note: dataQuality.note,
    },
  };

  return `Analyze this frontend performance intelligence report and generate the root-cause analysis:

${JSON.stringify(payload, null, 2)}`;
}

/** Estimate prompt token count (rough: 4 chars ≈ 1 token) */
export function estimateTokens(prompt: string): number {
  return Math.ceil(prompt.length / 4);
}
