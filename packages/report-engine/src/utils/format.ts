/**
 * @file utils/format.ts
 * @description Number, time, rating, and metric formatters for the Report Engine.
 */

/** Format a millisecond value to a human-readable string */
export function formatMs(value: number | null | undefined, decimals = 0): string {
  if (value === null || value === undefined) return "n/a";
  if (value >= 1000) {
    return `${(value / 1000).toFixed(decimals === 0 ? 1 : decimals)}s`;
  }
  return `${Math.round(value)}ms`;
}

/** Format a kilobyte value */
export function formatKB(value: number | null | undefined): string {
  if (value === null || value === undefined) return "n/a";
  if (value >= 1024) return `${(value / 1024).toFixed(1)} MB`;
  return `${Math.round(value)} KB`;
}

/** Format a 0–1 float as a percentage string */
export function formatPct(value: number | null | undefined, decimals = 0): string {
  if (value === null || value === undefined) return "n/a";
  return `${(value * 100).toFixed(decimals)}%`;
}

/** Format a 0–100 integer score */
export function formatScore(value: number | null | undefined): string {
  if (value === null || value === undefined) return "n/a";
  return `${Math.round(value)}`;
}

/** Format a CWV metric value with its unit */
export function formatVital(value: number | null, unit: "ms" | "score" | "unitless"): string {
  if (value === null) return "n/a";
  if (unit === "ms") return formatMs(value);
  if (unit === "score") return formatScore(value);
  if (unit === "unitless") return value.toFixed(3);
  return String(value);
}

/** Convert a MetricRating to a display label */
export function ratingLabel(rating: string): string {
  switch (rating) {
    case "good": return "Good";
    case "needs-improvement": return "Needs Improvement";
    case "poor": return "Poor";
    default: return "Unknown";
  }
}

/** Convert a severity string to a display label */
export function severityLabel(severity: string): string {
  switch (severity) {
    case "critical": return "Critical";
    case "high": return "High";
    case "medium": return "Medium";
    case "low": return "Low";
    default: return severity;
  }
}

/** Format an effort level */
export function effortLabel(effort: string): string {
  switch (effort) {
    case "low": return "Low Effort";
    case "medium": return "Medium Effort";
    case "high": return "High Effort";
    default: return effort;
  }
}

/** Format a delta as a +/- string with sign */
export function formatDelta(delta: number | null, unit: "ms" | "%" = "ms"): string {
  if (delta === null) return "—";
  const sign = delta > 0 ? "+" : "";
  if (unit === "ms") return `${sign}${Math.round(delta)}ms`;
  return `${sign}${Math.round(delta)}%`;
}

/** Truncate a URL for display */
export function truncateUrl(url: string, maxLen = 60): string {
  if (url.length <= maxLen) return url;
  try {
    const parsed = new URL(url);
    const short = `${parsed.hostname}${parsed.pathname}`;
    if (short.length <= maxLen) return short;
    return short.slice(0, maxLen - 1) + "…";
  } catch {
    return url.slice(0, maxLen - 1) + "…";
  }
}

/** Format an ISO timestamp to a human-readable date string */
export function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short",
    });
  } catch {
    return iso;
  }
}

/** Escape HTML special characters */
export function escHtml(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Format a file path to be relative and readable */
export function formatPath(path: string | null | undefined): string {
  if (!path) return "n/a";
  // Show just the filename + one parent dir for readability
  const parts = path.replace(/\\/g, "/").split("/");
  if (parts.length <= 2) return path;
  return `…/${parts.slice(-2).join("/")}`;
}
