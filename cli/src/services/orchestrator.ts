/**
 * @file services/orchestrator.ts
 * @description Pipeline orchestration service — the CLI's only connection to the packages.
 *
 * ARCHITECTURE CONTRACT:
 *   - This service is the SOLE bridge between the CLI and all packages.
 *   - CLI commands call this service; they NEVER import packages directly.
 *   - All business logic stays inside packages — never bleeds into the CLI.
 *   - Each method maps 1:1 to a pipeline stage, making flow easy to follow.
 *
 * PIPELINE FLOW:
 *   1. runPipeline()     → report-engine (playwright + lighthouse + trace + bundle)
 *   2. runAnalytics()    → analytics-engine (normalize + correlate + aggregate)
 *   3. runAIAnalysis()   → ai-engine (LLM root-cause reasoning)
 *   4. saveAIReport()    → write JSON + Markdown reports
 *   5. compareReports()  → diff two session results
 */

import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";

// Package imports — CLI never calls lower-level packages, only via this orchestrator
import { runPipeline } from "../../../packages/pipeline-engine/src/pipeline.js";
import { aggregate } from "../../../packages/analytics-engine/src/index.js";
import { analyzeWithAI } from "../../../packages/ai-engine/src/index.js";
import { writeReports, writeComparisonReport } from "../../../packages/report-engine/src/exporters/file-writer.js";

import type { PipelineConfig, TraceLensResult, RouteIntelligenceResult } from "../../../packages/pipeline-engine/src/types.js";
import type { AggregatorInput, TraceLensIntelligenceReport } from "../../../packages/analytics-engine/src/index.js";
import type { AIRootCauseReport } from "../../../packages/ai-engine/src/index.js";
import type { TraceLensConfig, AuditSummary, ComparisonResult, VitalComparison, SessionMetadata } from "../types/index.js";
import type { ReportInput, ReportOutput } from "../../../packages/report-engine/src/types.js";

import { log } from "../utils/logger.js";
import { ensureDir, getAIReportPath, getAIMarkdownPath } from "../utils/paths.js";

export const CLI_VERSION = "2.0.0";

// ─── Pipeline Stage ───────────────────────────────────────────────────────────

/**
 * Stage 1–4: Run the full data collection pipeline.
 * Delegates to @tracelens/report-engine which orchestrates:
 * Playwright → Lighthouse → Trace Parser → Bundle Analyzer
 */
export async function runTraceLensPipeline(
  url: string,
  config: TraceLensConfig,
  options: {
    verbose: boolean;
    bundlePath?: string;
  }
): Promise<TraceLensResult> {
  const pipelineConfig: PipelineConfig = {
    routes: [{ url, label: url }],
    device: {
      mode: config.device,
      throttle: config.throttle,
    },
    outputDir: config.outputDir,
    runs: config.runs,
    capturePlaywrightArtifacts: true,
    runLighthouse: true,
    runTraceParser: true,
    runBundleAnalyzer: !!options.bundlePath || !!config.bundle?.webpackStatsPath,
    continueOnFailure: true,
    headless: true,
    ...(options.bundlePath || config.bundle
      ? {
          bundle: {
            webpackStatsPath: options.bundlePath || config.bundle?.webpackStatsPath,
            framework: config.bundle?.framework as any,
          },
        }
      : {}),
  };

  log.debug(`Pipeline config: ${JSON.stringify({ device: pipelineConfig.device, runs: pipelineConfig.runs }, null, 2)}`);

  const result = await runPipeline(pipelineConfig);
  return result;
}

// ─── Analytics Stage ──────────────────────────────────────────────────────────

/**
 * Stage 5: Run analytics aggregation on a single route result.
 * Produces the canonical TraceLensIntelligenceReport.
 */
export function runAnalyticsForRoute(
  pipelineResult: TraceLensResult,
  routeResult: RouteIntelligenceResult
): TraceLensIntelligenceReport {
  const input: AggregatorInput = {
    sessionId: pipelineResult.sessionId,
    startedAt: pipelineResult.startedAt,
    durationMs: pipelineResult.durationMs,
    config: pipelineResult.config,
    route: {
      url: routeResult.url,
      label: routeResult.label,
      vitals: routeResult.vitals,
      bottlenecks: routeResult.bottlenecks,
      bundle: routeResult.bundle,
    },
  };

  return aggregate(input);
}

// ─── AI Stage ─────────────────────────────────────────────────────────────────

/**
 * Stage 6: Run AI root-cause analysis on the intelligence report.
 * Returns null if no AI provider is configured (graceful skip).
 */
export async function runAIAnalysis(
  report: TraceLensIntelligenceReport,
  options: { saveDebugLogs: boolean; debugLogDir: string }
): Promise<{ status: string; report: AIRootCauseReport | null; meta: Record<string, unknown> }> {
  const result = await analyzeWithAI(report, {
    logPrompts: false,
    saveDebugLogs: options.saveDebugLogs,
    debugLogDir: options.debugLogDir,
  });

  return {
    status: result.status,
    report: result.report ?? null,
    meta: {
      provider: result.meta?.provider,
      model: result.meta?.model,
      durationMs: result.meta?.durationMs,
      tokens: result.meta?.usage?.totalTokens,
    },
  };
}

// ─── Report Saving ────────────────────────────────────────────────────────────

/**
 * Save the full audit bundle: intelligence JSON + AI Markdown report.
 */
export function saveAuditReports(
  outputDir: string,
  sessionId: string,
  intelligenceReport: TraceLensIntelligenceReport,
  aiResult: { status: string; report: AIRootCauseReport | null; meta: Record<string, unknown> } | null
): { jsonPath: string; markdownPath: string | null } {
  const jsonPath = getAIReportPath(outputDir, sessionId);
  const markdownPath = aiResult?.report ? getAIMarkdownPath(outputDir, sessionId) : null;

  ensureDir(join(outputDir, "intelligence"));

  // Always save the full JSON bundle
  writeFileSync(
    jsonPath,
    JSON.stringify({ intelligenceReport, aiResult }, null, 2),
    "utf-8"
  );

  // Save human-readable Markdown if AI analysis succeeded
  if (aiResult?.report && markdownPath) {
    const md = buildAIMarkdown(intelligenceReport, aiResult.report);
    writeFileSync(markdownPath, md, "utf-8");
  }

  return { jsonPath, markdownPath };
}

// ─── Report Generation ────────────────────────────────────────────────────────

/**
 * Generate HTML + Markdown reports using the report-engine.
 * This is the primary visual output layer — called after analytics + AI stages.
 */
export function generateReports(
  outputDir: string,
  sessionId: string,
  intelligenceReport: TraceLensIntelligenceReport,
  aiResult: { status: string; report: AIRootCauseReport | null; meta: Record<string, unknown> } | null,
  artifacts?: Record<string, string | null> | null,
  formats: Array<"html" | "markdown" | "json" | "all"> = ["html", "markdown"]
): ReportOutput {
  const input: ReportInput = {
    intelligenceReport,
    aiResult: aiResult ? {
      status: aiResult.status as "success" | "skipped" | "failed",
      report: aiResult.report,
      meta: aiResult.meta as any,
    } : null,
    artifacts: artifacts ?? null,
  };
  return writeReports(input, { outputDir: `${outputDir}/intelligence`, formats, sessionId });
}

/**
 * Generate a before/after comparison HTML report using the report-engine.
 */
export function generateComparisonReport(
  outputDir: string,
  beforeInput: ReportInput,
  afterInput: ReportInput,
  labels?: { before?: string; after?: string }
): ReportOutput {
  return writeComparisonReport(
    { before: beforeInput, after: afterInput, beforeLabel: labels?.before, afterLabel: labels?.after },
    { outputDir: `${outputDir}/intelligence` }
  );
}

/**
 * Load a canonical intelligence JSON bundle from disk.
 * Supports both: raw intelligence report OR saved bundle {intelligenceReport, aiResult}.
 */
export function loadIntelligenceBundle(reportPath: string): ReportInput {
  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(readFileSync(reportPath, "utf-8")) as Record<string, unknown>;
  } catch (err) {
    throw new Error(`Cannot read report: ${reportPath} — ${err instanceof Error ? err.message : String(err)}`);
  }
  const intelligenceReport = (raw.intelligenceReport ?? raw) as TraceLensIntelligenceReport;
  if (!intelligenceReport?.session?.url) {
    throw new Error(`File does not look like a TraceLens intelligence report: ${reportPath}`);
  }
  return {
    intelligenceReport,
    aiResult: (raw.aiResult as any) ?? null,
    artifacts: null,
  };
}

// ─── Summary Builder ──────────────────────────────────────────────────────────

/**
 * Build a compact AuditSummary from a pipeline result — used for CLI display.
 */
export function buildAuditSummary(
  pipelineResult: TraceLensResult,
  intelligenceReports: Map<string, TraceLensIntelligenceReport>
): AuditSummary {
  return {
    sessionId: pipelineResult.sessionId,
    url: pipelineResult.routes[0]?.url ?? "",
    device: pipelineResult.config.device.mode,
    durationMs: pipelineResult.durationMs,
    success: pipelineResult.success,
    outputDir: pipelineResult.config.outputDir,
    routes: pipelineResult.routes.map((route: any) => {
      const intel = intelligenceReports.get(route.url);
      return {
        url: route.url,
        label: route.label,
        vitals: {
          lcp: intel?.coreWebVitals.lcp.value ?? route.vitals.lcp,
          fcp: intel?.coreWebVitals.fcp.value ?? route.vitals.fcp,
          tbt: intel?.coreWebVitals.tbt.value ?? route.vitals.tbt,
          cls: intel?.coreWebVitals.cls.value ?? route.vitals.cls,
          ttfb: intel?.coreWebVitals.ttfb.value ?? route.vitals.ttfb,
          score: intel?.coreWebVitals.performanceScore ?? route.vitals.performanceScore,
        },
        primaryBottleneck: route.primaryBottleneck,
        risksCount: intel?.performanceRisks.length ?? 0,
        artifactPaths: {
          json: route.artifacts.lighthouseJsonPath,
          html: route.artifacts.lighthouseHtmlPath,
          screenshot: route.artifacts.screenshotPath,
        },
      };
    }),
  };
}

// ─── Session Metadata ─────────────────────────────────────────────────────────

/**
 * Persist full session metadata for --save-session mode.
 * Captures config snapshot, stage timings, AI metadata, and artifact paths.
 */
export function saveSessionMetadata(
  outputDir: string,
  sessionId: string,
  url: string,
  config: TraceLensConfig,
  pipelineResult: TraceLensResult,
  aiResult: { status: string; meta: Record<string, unknown> } | null,
  artifactPaths: string[]
): string {
  const metadata: SessionMetadata = {
    sessionId,
    generatedAt: new Date().toISOString(),
    cliVersion: CLI_VERSION,
    command: "audit",
    url,
    config: config as unknown as Record<string, unknown>,
    stages: Object.fromEntries(
      Object.entries(pipelineResult.stages).map(([name, record]: [string, any]) => [
        name,
        { status: record.status, durationMs: record.durationMs },
      ])
    ),
    ai: aiResult ? {
      provider: aiResult.meta.provider,
      model: aiResult.meta.model,
      durationMs: aiResult.meta.durationMs,
      tokens: aiResult.meta.tokens,
      status: aiResult.status,
    } : null,
    artifacts: artifactPaths,
    totalDurationMs: pipelineResult.durationMs,
  };

  const metaDir = join(outputDir, "sessions", sessionId);
  ensureDir(metaDir);
  const metaPath = join(metaDir, "session-metadata.json");
  writeFileSync(metaPath, JSON.stringify(metadata, null, 2), "utf-8");
  return metaPath;
}

// ─── Analyze Existing Report ──────────────────────────────────────────────────

/**
 * Re-run AI analysis on an existing intelligence report JSON.
 * Used by `tracelens analyze` — does NOT re-run Playwright/Lighthouse/trace.
 */
export async function rerunAIOnExistingReport(
  reportPath: string,
  options: { saveDebugLogs: boolean; debugLogDir: string }
): Promise<{
  intelligenceReport: TraceLensIntelligenceReport;
  aiResult: { status: string; report: AIRootCauseReport | null; meta: Record<string, unknown> };
}> {
  let rawBundle: Record<string, unknown>;
  try {
    rawBundle = JSON.parse(readFileSync(reportPath, "utf-8")) as Record<string, unknown>;
  } catch (err) {
    throw new Error(
      `Cannot read report: ${reportPath} — ${err instanceof Error ? err.message : String(err)}`
    );
  }

  // Support both: raw intelligence report OR the saved bundle {intelligenceReport, aiResult}
  const intelligenceReport = (rawBundle.intelligenceReport ?? rawBundle) as TraceLensIntelligenceReport;
  if (!intelligenceReport?.session?.url) {
    throw new Error(
      `File does not look like a TraceLens intelligence report: ${reportPath}`
    );
  }

  const aiResult = await runAIAnalysis(intelligenceReport, options);
  return { intelligenceReport, aiResult };
}

// ─── Comparison ───────────────────────────────────────────────────────────────

/**
 * Compare two TraceLens result JSON files.
 * Produces a structured comparison with regression/improvement detection.
 */
export function compareResults(
  beforePath: string,
  afterPath: string
): ComparisonResult[] {
  const before = loadResultFile(beforePath);
  const after = loadResultFile(afterPath);

  // Build a map of route URL → route for each report
  const beforeRoutes = new Map(before.routes.map((r: RouteIntelligenceResult) => [r.url, r]));
  const results: ComparisonResult[] = [];

  for (const afterRoute of after.routes as RouteIntelligenceResult[]) {
    const beforeRoute = beforeRoutes.get(afterRoute.url) as RouteIntelligenceResult | undefined;
    if (!beforeRoute) continue;

    const vitals = compareVitals(beforeRoute.vitals, afterRoute.vitals);
    const regressions = vitals.filter((v) => v.trend === "regressed").map((v) => v.metric);
    const improvements = vitals.filter((v) => v.trend === "improved").map((v) => v.metric);

    results.push({
      url: afterRoute.url,
      before: { sessionId: before.sessionId, reportPath: beforePath },
      after: { sessionId: after.sessionId, reportPath: afterPath },
      vitals,
      regressions,
      improvements,
      summary: buildComparisonSummary(regressions, improvements),
    });
  }

  return results;
}

// ─── Private Helpers ──────────────────────────────────────────────────────────

function loadResultFile(path: string): TraceLensResult {
  try {
    return JSON.parse(readFileSync(path, "utf-8")) as TraceLensResult;
  } catch (err) {
    throw new Error(
      `Cannot read report: ${path} — ${err instanceof Error ? err.message : String(err)}`
    );
  }
}

function compareVitals(
  before: Record<string, number | null>,
  after: Record<string, number | null>
): VitalComparison[] {
  // For most metrics, lower is better. CLS is also lower-is-better.
  const metrics: Array<{ key: string; label: string; threshold: "good" | "needs-improvement" | "poor" }> = [
    { key: "lcp", label: "LCP", threshold: "good" },
    { key: "fcp", label: "FCP", threshold: "good" },
    { key: "tbt", label: "TBT", threshold: "good" },
    { key: "cls", label: "CLS", threshold: "good" },
    { key: "ttfb", label: "TTFB", threshold: "good" },
    { key: "performanceScore", label: "Score", threshold: "good" },
  ];

  return metrics.map(({ key, label, threshold }) => {
    const bVal = before[key] ?? null;
    const aVal = after[key] ?? null;
    let diffMs: number | null = null;
    let diffPct: number | null = null;
    let trend: "improved" | "regressed" | "unchanged" = "unchanged";

    if (bVal !== null && aVal !== null) {
      diffMs = Math.round(aVal - bVal);
      diffPct = bVal !== 0 ? Math.round(((aVal - bVal) / bVal) * 100) : null;

      const REGRESSION_THRESHOLD = 0.05; // 5% change is meaningful
      const changeRatio = Math.abs(diffMs) / (bVal || 1);

      if (changeRatio > REGRESSION_THRESHOLD) {
        // For score: higher is better. For all others: lower is better.
        if (key === "performanceScore") {
          trend = diffMs > 0 ? "improved" : "regressed";
        } else {
          trend = diffMs < 0 ? "improved" : "regressed";
        }
      }
    }

    return { metric: label, before: bVal, after: aVal, diffMs, diffPct, trend, threshold };
  });
}

function buildComparisonSummary(regressions: string[], improvements: string[]): string {
  if (regressions.length === 0 && improvements.length === 0) {
    return "No significant changes detected across all Core Web Vitals.";
  }
  const parts: string[] = [];
  if (improvements.length > 0) {
    parts.push(`Improved: ${improvements.join(", ")}`);
  }
  if (regressions.length > 0) {
    parts.push(`Regressed: ${regressions.join(", ")}`);
  }
  return parts.join(" | ");
}

function buildAIMarkdown(
  intel: TraceLensIntelligenceReport,
  ai: AIRootCauseReport
): string {
  const lines: string[] = [
    `# TraceLens AI Analysis Report`,
    ``,
    `**URL:** ${intel.session.url}`,
    `**Device:** ${intel.session.device}`,
    `**Generated:** ${intel.meta.generatedAt}`,
    ``,
    `## Summary`,
    ``,
    ai.summary,
    ``,
    `## Core Web Vitals`,
    ``,
    `| Metric | Value | Rating |`,
    `|--------|-------|--------|`,
    `| LCP | ${intel.coreWebVitals.lcp.value ?? "n/a"}ms | ${intel.coreWebVitals.lcp.rating} |`,
    `| FCP | ${intel.coreWebVitals.fcp.value ?? "n/a"}ms | ${intel.coreWebVitals.fcp.rating} |`,
    `| TBT | ${intel.coreWebVitals.tbt.value ?? "n/a"}ms | ${intel.coreWebVitals.tbt.rating} |`,
    `| CLS | ${intel.coreWebVitals.cls.value ?? "n/a"} | ${intel.coreWebVitals.cls.rating} |`,
    `| TTFB | ${intel.coreWebVitals.ttfb.value ?? "n/a"}ms | ${intel.coreWebVitals.ttfb.rating} |`,
    ``,
    `## Primary Bottleneck`,
    ``,
    `**${ai.primaryBottleneck.type}** — ${ai.primaryBottleneck.explanation}`,
    ``,
    `*Evidence:* ${ai.primaryBottleneck.evidence.join(" · ")}`,
    ``,
    `## Root Causes`,
    ``,
  ];

  for (const cause of ai.rootCauses) {
    lines.push(`### ${cause.rank}. ${cause.issue} [${cause.severity.toUpperCase()}]`);
    lines.push(``, cause.explanation, ``);
    lines.push(`**Impact:** ${cause.impact}`, ``);
  }

  lines.push(`## Recommendations`, ``);
  for (const rec of ai.recommendations) {
    lines.push(`### ${rec.rank}. ${rec.action}`);
    lines.push(``, `**Priority:** ${rec.priority} | **Effort:** ${rec.effort}`);
    lines.push(``, rec.rationale);
    lines.push(``, `**Estimated Impact:** ${rec.estimatedImpact}`, ``);
  }

  lines.push(`## Estimated Improvements`, ``);
  if (ai.estimatedImpact.lcp) lines.push(`- **LCP:** ${ai.estimatedImpact.lcp}`);
  if (ai.estimatedImpact.fcp) lines.push(`- **FCP:** ${ai.estimatedImpact.fcp}`);
  if (ai.estimatedImpact.tbt) lines.push(`- **TBT:** ${ai.estimatedImpact.tbt}`);
  if (ai.estimatedImpact.performanceScore) lines.push(`- **Score:** ${ai.estimatedImpact.performanceScore}`);
  lines.push(``, `> ${ai.estimatedImpact.note}`);
  lines.push(``, `---`, ``, `*Generated by TraceLens AI Engine v2.0.0*`);

  return lines.join("\n");
}
