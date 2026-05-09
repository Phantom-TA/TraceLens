/**
 * @file index.ts
 * @description Public API for @tracelens/report-engine.
 *
 * ARCHITECTURE:
 *   - This package is STRICTLY rendering-only
 *   - It consumes TraceLensIntelligenceReport + AIEngineResult
 *   - It produces HTML, Markdown, JSON, and comparison reports
 *   - It does NOT run Playwright, Lighthouse, AI analysis, or pipeline stages
 */

// ── Types ─────────────────────────────────────────────────────────────────────
export type {
  ReportInput,
  ComparisonInput,
  ReportOptions,
  ReportOutput,
  ReportFormat,
} from "./types.js";

// ── Primary API ───────────────────────────────────────────────────────────────

/** Generate all requested report formats and write to disk. Returns artifact paths. */
export { writeReports as generateReport } from "./exporters/file-writer.js";

/** Generate a before/after comparison report and write to disk. */
export { writeComparisonReport as generateComparison } from "./exporters/file-writer.js";

// ── String renderers (no file I/O) ────────────────────────────────────────────

/** Render the full HTML report as a string (no file written). */
export { renderHtmlReport as generateHtml } from "./renderers/html-renderer.js";

/** Render a full Markdown report as a string. */
export { renderMarkdownReport as generateMarkdown } from "./renderers/markdown-renderer.js";

/** Render a compact CI-friendly Markdown summary. */
export { renderCIMarkdown as generateCISummary } from "./renderers/markdown-renderer.js";

/** Export a canonical deterministic JSON string. */
export { exportJson as generateJson } from "./renderers/json-exporter.js";

/** Render a comparison report HTML string. */
export { renderComparisonReport as generateComparisonHtml } from "./renderers/comparison-renderer.js";

// ── CI helpers ────────────────────────────────────────────────────────────────

/** Write a GitHub Actions step summary (writes to GITHUB_STEP_SUMMARY env file). */
export { writeGitHubStepSummary } from "./exporters/ci-summary.js";

/** Return a compact ANSI-free CI log text block. */
export { getCISummaryText } from "./exporters/ci-summary.js";
