/**
 * @file types.ts
 * @description All TypeScript types for @tracelens/report-engine.
 *
 * The Report Engine is STRICTLY rendering-only.
 * It consumes canonical TraceLensIntelligenceReport + AIEngineResult
 * and produces static artifacts (HTML, Markdown, JSON, Comparison).
 *
 * DESIGN PRINCIPLES:
 *   - ReportInput is the single entry point — always typed
 *   - ReportOutput captures all written artifact paths
 *   - No analysis logic, no orchestration, no pipeline imports
 */

import type { TraceLensIntelligenceReport } from "../../analytics-engine/src/types.js";
import type { AIRootCauseReport, AIEngineObservability } from "../../ai-engine/src/types.js";

// ─── Input ────────────────────────────────────────────────────────────────────

/**
 * The canonical input to the Report Engine.
 * Sourced from disk-written JSON artifacts — never recomputed.
 */
export interface ReportInput {
  /** The canonical normalized intelligence report from analytics-engine */
  intelligenceReport: TraceLensIntelligenceReport;

  /**
   * Optional AI result bundle.
   * Present if AI analysis ran successfully during the audit.
   */
  aiResult?: {
    status: "success" | "skipped" | "failed";
    message?: string;
    report: AIRootCauseReport | null;
    meta: Partial<AIEngineObservability>;
  } | null;

  /**
   * Artifact file paths for this session route.
   * Used to generate links in the Artifact References section.
   * All paths are absolute or relative to outputDir.
   */
  artifacts?: {
    screenshotPath?: string | null;
    tracePath?: string | null;
    harPath?: string | null;
    lighthouseJsonPath?: string | null;
    lighthouseHtmlPath?: string | null;
    bottlenecksJsonPath?: string | null;
    bundleJsonPath?: string | null;
  } | null;
}

// ─── Comparison Input ─────────────────────────────────────────────────────────

/** Input for generating a before/after comparison report */
export interface ComparisonInput {
  before: ReportInput;
  after: ReportInput;
  /** Optional label for the baseline (e.g. "main branch") */
  beforeLabel?: string;
  /** Optional label for the new report (e.g. "feature/new-homepage") */
  afterLabel?: string;
}

// ─── Options ──────────────────────────────────────────────────────────────────

/** Output format flags */
export type ReportFormat = "html" | "markdown" | "json" | "all";

export interface ReportOptions {
  /**
   * Output directory for generated reports.
   * Default: reports/intelligence/
   */
  outputDir?: string;

  /**
   * Report format(s) to generate.
   * Default: ["html", "markdown"]
   */
  formats?: ReportFormat[];

  /**
   * Custom title for the report.
   * Default: "TraceLens Performance Report"
   */
  title?: string;

  /**
   * Session ID used in file naming.
   * If omitted, extracted from intelligenceReport.session.sessionId
   */
  sessionId?: string;
}

// ─── Output ───────────────────────────────────────────────────────────────────

/** Paths to all generated report artifacts */
export interface ReportOutput {
  /** Path to the generated HTML report (null if not requested) */
  htmlPath: string | null;
  /** Path to the generated Markdown report (null if not requested) */
  markdownPath: string | null;
  /** Path to the generated JSON export (null if not requested) */
  jsonPath: string | null;
  /** Path to the generated comparison HTML report (null for non-comparison) */
  comparisonHtmlPath: string | null;
  /** Session ID associated with this report */
  sessionId: string;
}

// ─── Severity / Rating helpers ────────────────────────────────────────────────

export type RatingClass = "good" | "needs-improvement" | "poor" | "unknown";
export type SeverityClass = "critical" | "high" | "medium" | "low";
