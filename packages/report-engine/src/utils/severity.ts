/**
 * @file utils/severity.ts
 * @description Severity and rating → CSS class / color token mapping for the Report Engine.
 */

/** Map a MetricRating to a CSS class name */
export function ratingClass(rating: string): string {
  switch (rating) {
    case "good":              return "rating-good";
    case "needs-improvement": return "rating-needs-improvement";
    case "poor":              return "rating-poor";
    default:                  return "rating-unknown";
  }
}

/** Map a Severity string to a CSS class name */
export function severityClass(severity: string): string {
  switch (severity) {
    case "critical": return "severity-critical";
    case "high":     return "severity-high";
    case "medium":   return "severity-medium";
    case "low":      return "severity-low";
    default:         return "severity-low";
  }
}

/** Map a MetricRating to a CSS color variable */
export function ratingColor(rating: string): string {
  switch (rating) {
    case "good":              return "var(--color-good)";
    case "needs-improvement": return "var(--color-warning)";
    case "poor":              return "var(--color-poor)";
    default:                  return "var(--color-muted)";
  }
}

/** Map a Severity to a CSS color variable */
export function severityColor(severity: string): string {
  switch (severity) {
    case "critical": return "var(--color-critical)";
    case "high":     return "var(--color-poor)";
    case "medium":   return "var(--color-warning)";
    case "low":      return "var(--color-good)";
    default:         return "var(--color-muted)";
  }
}

/** Map a Lighthouse score (0–100) to a rating string */
export function scoreToRating(score: number | null): "good" | "needs-improvement" | "poor" | "unknown" {
  if (score === null) return "unknown";
  if (score >= 90) return "good";
  if (score >= 50) return "needs-improvement";
  return "poor";
}

/** Map a Lighthouse score to a hex color (matching Lighthouse's own palette) */
export function scoreColor(score: number | null): string {
  if (score === null) return "#94a3b8"; // slate-400
  if (score >= 90) return "#0cce6b";   // Lighthouse green
  if (score >= 50) return "#ffa400";   // Lighthouse orange
  return "#ff4e42";                     // Lighthouse red
}

/** Map a confidence (0–1) to a badge class */
export function confidenceClass(confidence: number): string {
  if (confidence >= 0.8) return "confidence-high";
  if (confidence >= 0.5) return "confidence-medium";
  return "confidence-low";
}

/** Map a trend direction to CSS class */
export function trendClass(trend: "improved" | "regressed" | "unchanged"): string {
  switch (trend) {
    case "improved":  return "trend-improved";
    case "regressed": return "trend-regressed";
    default:          return "trend-unchanged";
  }
}

/** Map a priority category to a CSS class */
export function categoryClass(category: string): string {
  switch (category) {
    case "bundle":     return "cat-bundle";
    case "javascript": return "cat-javascript";
    case "network":    return "cat-network";
    case "server":     return "cat-server";
    case "images":     return "cat-images";
    case "rendering":  return "cat-rendering";
    default:           return "cat-other";
  }
}
