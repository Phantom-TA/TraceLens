/**
 * @file stability.ts
 * @description Multi-run stability engine for TraceLens.
 *
 * Accepts multiple AggregatorInput runs and computes:
 *   - Metric averages across runs
 *   - Coefficient of variation (CV) per metric
 *   - Stability confidence classification
 *
 * CONFIDENCE MODEL:
 *   CV < 5%  → "high"   (very stable runs)
 *   CV < 15% → "medium" (moderate variance — acceptable for CI)
 *   CV ≥ 15% → "low"    (noisy runs — results may be unreliable)
 *
 * USAGE:
 *   Enabled automatically when pipeline runs with runs > 1.
 *   The pipeline engine calls computeStabilityMetrics() with
 *   all run results before assembling the final report.
 */

import type { StabilityMetrics } from "./types.js";
import type { AggregatorInput } from "./types.js";

// ─── Main Export ──────────────────────────────────────────────────────────────

/**
 * Compute multi-run stability metrics from multiple audit runs.
 *
 * @param runs - Array of AggregatorInput, one per audit run
 * @returns    - StabilityMetrics with averages, variance, and confidence
 */
export function computeStabilityMetrics(runs: AggregatorInput[]): StabilityMetrics {
  if (runs.length === 0) {
    return emptyStability(0);
  }
  if (runs.length === 1) {
    return emptyStability(1);
  }

  const lcpValues = runs.map((r) => r.route.vitals.lcp).filter((v): v is number => v !== null);
  const fcpValues = runs.map((r) => r.route.vitals.fcp).filter((v): v is number => v !== null);
  const tbtValues = runs.map((r) => r.route.vitals.tbt).filter((v): v is number => v !== null);
  const clsValues = runs.map((r) => r.route.vitals.cls).filter((v): v is number => v !== null);

  const lcpAvg = average(lcpValues);
  const fcpAvg = average(fcpValues);
  const tbtAvg = average(tbtValues);

  const lcpCV = coefficientOfVariation(lcpValues);
  const fcpCV = coefficientOfVariation(fcpValues);
  const tbtCV = coefficientOfVariation(tbtValues);
  const clsCV = coefficientOfVariation(clsValues);

  // Overall stability = worst metric's CV
  const maxCV = Math.max(lcpCV ?? 0, fcpCV ?? 0, tbtCV ?? 0, clsCV ?? 0);
  const stabilityConfidence = maxCV < 5 ? "high" : maxCV < 15 ? "medium" : "low";

  const stabilityNote = buildStabilityNote(stabilityConfidence, maxCV, runs.length);

  return {
    runs: runs.length,
    variance: {
      lcp: lcpCV !== null ? Math.round(lcpCV * 10) / 10 : null,
      fcp: fcpCV !== null ? Math.round(fcpCV * 10) / 10 : null,
      tbt: tbtCV !== null ? Math.round(tbtCV * 10) / 10 : null,
      cls: clsCV !== null ? Math.round(clsCV * 10) / 10 : null,
    },
    averaged: {
      lcp: lcpAvg !== null ? Math.round(lcpAvg) : null,
      fcp: fcpAvg !== null ? Math.round(fcpAvg) : null,
      tbt: tbtAvg !== null ? Math.round(tbtAvg) : null,
    },
    stabilityConfidence,
    stabilityNote,
  };
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

function standardDeviation(values: number[]): number | null {
  if (values.length < 2) return null;
  const avg = average(values)!;
  const variance = values.reduce((s, v) => s + Math.pow(v - avg, 2), 0) / (values.length - 1);
  return Math.sqrt(variance);
}

/** Coefficient of Variation as a percentage (stdev/mean * 100) */
function coefficientOfVariation(values: number[]): number | null {
  if (values.length < 2) return null;
  const avg = average(values);
  const sd = standardDeviation(values);
  if (!avg || !sd || avg === 0) return null;
  return (sd / avg) * 100;
}

function emptyStability(runCount: number): StabilityMetrics {
  return {
    runs: runCount,
    variance: { lcp: null, fcp: null, tbt: null, cls: null },
    averaged: { lcp: null, fcp: null, tbt: null },
    stabilityConfidence: runCount === 0 ? "low" : "high",
    stabilityNote: runCount <= 1
      ? "Single-run audit — multi-run stability not available. Run with runs: 3 for stable CI results."
      : null,
  };
}

function buildStabilityNote(
  confidence: StabilityMetrics["stabilityConfidence"],
  maxCV: number,
  runCount: number
): string {
  const cv = Math.round(maxCV * 10) / 10;
  switch (confidence) {
    case "high":
      return `Stable results across ${runCount} runs (max CV: ${cv}%). Suitable for CI regression testing.`;
    case "medium":
      return `Moderate variance across ${runCount} runs (max CV: ${cv}%). Results may vary slightly. Consider running 5 times for CI gates.`;
    case "low":
      return `High variance across ${runCount} runs (max CV: ${cv}%). Results are noisy — check for external network or CPU interference. Increase run count or audit in a stable environment.`;
  }
}
