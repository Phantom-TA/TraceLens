/**
 * @file renderers/json-exporter.ts
 * @description Clean canonical JSON export — deterministic, stable field ordering.
 */

import type { ReportInput } from "../types.js";

export function exportJson(input: ReportInput): string {
  const { intelligenceReport: r, aiResult } = input;

  // Build a canonical, deterministic export object with stable field ordering
  const canonical = {
    exportedAt: new Date().toISOString(),
    engineVersion: "1.0.0",
    session: {
      sessionId:          r.session.sessionId,
      url:                r.session.url,
      label:              r.session.label,
      device:             r.session.device,
      throttle:           r.session.throttle,
      runs:               r.session.runs,
      pipelineDurationMs: r.session.pipelineDurationMs,
      generatedAt:        r.meta.generatedAt,
    },
    coreWebVitals: {
      lcp:              r.coreWebVitals.lcp,
      fcp:              r.coreWebVitals.fcp,
      tbt:              r.coreWebVitals.tbt,
      cls:              r.coreWebVitals.cls,
      tti:              r.coreWebVitals.tti,
      ttfb:             r.coreWebVitals.ttfb,
      speedIndex:       r.coreWebVitals.speedIndex,
      performanceScore: r.coreWebVitals.performanceScore,
      overallRating:    r.coreWebVitals.overallRating,
    },
    primaryBottleneck: r.primaryBottleneck,
    performanceRisks:  r.performanceRisks,
    quickWins:         r.quickWins,
    mainThread: {
      totalBlockingMs:   r.mainThread.totalBlockingMs,
      totalMainThreadMs: r.mainThread.totalMainThreadMs,
      longTaskCount:     r.mainThread.longTaskCount,
      longestTaskMs:     r.mainThread.longestTaskMs,
      categoryBreakdown: r.mainThread.categoryBreakdown,
      topLongTasks:      r.mainThread.topLongTasks,
    },
    scriptingBottlenecks:    r.scriptingBottlenecks,
    renderBlockingResources: r.renderBlockingResources,
    lcpCandidate:            r.lcpCandidate,
    hydration:               r.hydration,
    framework:               r.framework,
    bundle:                  r.bundle,
    dataQuality:             r.dataQuality,
    stabilityMetrics:        r.stabilityMetrics ?? null,
    aiAnalysis: aiResult?.report
      ? {
          status:            aiResult.status,
          summary:           aiResult.report.summary,
          primaryBottleneck: aiResult.report.primaryBottleneck,
          rootCauses:        aiResult.report.rootCauses,
          recommendations:   aiResult.report.recommendations,
          estimatedImpact:   aiResult.report.estimatedImpact,
          confidence:        aiResult.report.confidence,
          provider:          aiResult.meta.provider ?? null,
          model:             aiResult.meta.model ?? null,
          totalTokens:       aiResult.meta.usage?.totalTokens ?? null,
        }
      : null,
  };

  return JSON.stringify(canonical, null, 2);
}
