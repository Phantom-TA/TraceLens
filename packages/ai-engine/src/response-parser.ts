/**
 * @file response-parser.ts
 * @description Parse and validate the raw AI response into a typed AIRootCauseReport.
 *
 * Handles:
 *   - JSON parse errors (with partial recovery)
 *   - Schema validation (required fields)
 *   - Clamping values (confidence 0–1, severity values)
 *   - Fallback construction if response is malformed
 */

import type { AIRootCauseReport } from "./types.js";

// ─── JSON Extraction ───────────────────────────────────────────────────────────

/** Extract JSON from a raw AI response (handles markdown fences) */
function extractJSON(raw: string): string {
  // Try markdown JSON fence
  const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch?.[1]) return fenceMatch[1].trim();

  // Try to find first { ... } block
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start !== -1 && end > start) return raw.slice(start, end + 1);

  return raw.trim();
}

// ─── Schema Validation ─────────────────────────────────────────────────────────

const VALID_SEVERITIES = new Set(["critical", "high", "medium", "low"]);
const VALID_EFFORTS = new Set(["low", "medium", "high"]);
const VALID_CATEGORIES = new Set(["bundle", "javascript", "network", "server", "images", "rendering"]);

function sanitizeSeverity(v: unknown): "critical" | "high" | "medium" | "low" {
  return VALID_SEVERITIES.has(v as string) ? v as "critical" | "high" | "medium" | "low" : "medium";
}

function sanitizeEffort(v: unknown): "low" | "medium" | "high" {
  return VALID_EFFORTS.has(v as string) ? v as "low" | "medium" | "high" : "medium";
}

function sanitizeCategory(v: unknown): AIRootCauseReport["recommendations"][0]["category"] {
  return VALID_CATEGORIES.has(v as string)
    ? v as AIRootCauseReport["recommendations"][0]["category"]
    : "javascript";
}

function clampConfidence(v: unknown): number {
  const n = typeof v === "number" ? v : parseFloat(String(v));
  if (isNaN(n)) return 0.5;
  return Math.max(0, Math.min(1, n));
}

function ensureString(v: unknown, fallback = ""): string {
  return typeof v === "string" && v.trim() ? v.trim() : fallback;
}

function ensureArray<T>(v: unknown): T[] {
  return Array.isArray(v) ? v : [];
}

// ─── Main Parser ───────────────────────────────────────────────────────────────

export function parseAIResponse(
  raw: string,
  primaryBottleneck: string
): { report: AIRootCauseReport; warnings: string[] } {
  const warnings: string[] = [];
  let parsed: Record<string, unknown>;

  try {
    const jsonStr = extractJSON(raw);
    parsed = JSON.parse(jsonStr);
  } catch {
    warnings.push("AI response was not valid JSON — using fallback report");
    return { report: buildFallbackReport(raw, primaryBottleneck), warnings };
  }

  // ── Parse summary ──────────────────────────────────────────────────────────
  const summary = ensureString(parsed["summary"], "Performance analysis complete. See root causes below.");

  // ── Parse primaryBottleneck ────────────────────────────────────────────────
  const pbRaw = parsed["primaryBottleneck"] as Record<string, unknown> | undefined;
  const pb = {
    type: ensureString(pbRaw?.["type"], primaryBottleneck),
    explanation: ensureString(pbRaw?.["explanation"], "Primary bottleneck identified by intelligence pipeline."),
    evidence: ensureArray<string>(pbRaw?.["evidence"]),
  };

  // ── Parse rootCauses ───────────────────────────────────────────────────────
  const rawCauses = ensureArray<Record<string, unknown>>(parsed["rootCauses"]);
  const rootCauses: AIRootCauseReport["rootCauses"] = rawCauses.slice(0, 5).map((c, i) => ({
    rank: typeof c["rank"] === "number" ? c["rank"] : i + 1,
    issue: ensureString(c["issue"], `Issue ${i + 1}`),
    explanation: ensureString(c["explanation"], ""),
    metrics: (typeof c["metrics"] === "object" && c["metrics"] !== null)
      ? c["metrics"] as Record<string, string | number>
      : {},
    severity: sanitizeSeverity(c["severity"]),
    impact: ensureString(c["impact"], ""),
  }));

  if (rootCauses.length === 0) {
    warnings.push("No root causes returned by AI — report may be incomplete");
  }

  // ── Parse recommendations ──────────────────────────────────────────────────
  const rawRecs = ensureArray<Record<string, unknown>>(parsed["recommendations"]);
  const recommendations: AIRootCauseReport["recommendations"] = rawRecs.slice(0, 7).map((r, i) => ({
    rank: typeof r["rank"] === "number" ? r["rank"] : i + 1,
    action: ensureString(r["action"], `Optimization ${i + 1}`),
    rationale: ensureString(r["rationale"], ""),
    estimatedImpact: ensureString(r["estimatedImpact"], "Unknown impact"),
    effort: sanitizeEffort(r["effort"]),
    priority: sanitizeSeverity(r["priority"]),
    category: sanitizeCategory(r["category"]),
  }));

  // ── Parse estimatedImpact ──────────────────────────────────────────────────
  const impactRaw = parsed["estimatedImpact"] as Record<string, unknown> | undefined;
  const estimatedImpact: AIRootCauseReport["estimatedImpact"] = {
    lcp: ensureString(impactRaw?.["lcp"]) || null,
    fcp: ensureString(impactRaw?.["fcp"]) || null,
    tbt: ensureString(impactRaw?.["tbt"]) || null,
    performanceScore: ensureString(impactRaw?.["performanceScore"]) || null,
    note: ensureString(impactRaw?.["note"], "Estimates based on intelligence pipeline data."),
  };

  // ── Parse confidence ───────────────────────────────────────────────────────
  const confRaw = parsed["confidence"] as Record<string, unknown> | undefined;
  const dataQualityRaw = confRaw?.["dataQuality"];
  const validDQ = new Set(["high", "medium", "low"]);

  const confidence: AIRootCauseReport["confidence"] = {
    overall: clampConfidence(confRaw?.["overall"]),
    dataQuality: validDQ.has(dataQualityRaw as string)
      ? dataQualityRaw as "high" | "medium" | "low"
      : "medium",
    sourcesUsed: ensureArray<string>(confRaw?.["sourcesUsed"]),
    note: ensureString(confRaw?.["note"]) || null,
  };

  return {
    report: { summary, primaryBottleneck: pb, rootCauses, recommendations, estimatedImpact, confidence },
    warnings,
  };
}

// ─── Fallback Report ───────────────────────────────────────────────────────────

function buildFallbackReport(raw: string, primaryBottleneck: string): AIRootCauseReport {
  return {
    summary: "AI analysis completed but response could not be parsed. Review raw output in debug logs.",
    primaryBottleneck: {
      type: primaryBottleneck,
      explanation: "Primary bottleneck identified by TraceLens analytics pipeline.",
      evidence: [],
    },
    rootCauses: [],
    recommendations: [{
      rank: 1,
      action: "Review the TraceLens intelligence report for detailed bottleneck analysis",
      rationale: "AI response parsing failed — intelligence pipeline data is still available",
      estimatedImpact: "Unknown",
      effort: "low",
      priority: "high",
      category: "javascript",
    }],
    estimatedImpact: { lcp: null, fcp: null, tbt: null, performanceScore: null, note: "Could not estimate — AI parsing failed." },
    confidence: {
      overall: 0.3,
      dataQuality: "low",
      sourcesUsed: [],
      note: `AI response parsing failed. Raw response length: ${raw.length} chars.`,
    },
  };
}
