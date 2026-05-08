/**
 * @file types.ts
 * @description All TypeScript types for @tracelens/analytics-engine.
 *
 * This defines the canonical TraceLens Intelligence Report —
 * the single normalized output consumed by the AI engine, dashboard, and CI/CD.
 *
 * DESIGN PRINCIPLES:
 *   - All time values are in MILLISECONDS
 *   - All size values are in KILOBYTES
 *   - All scores are 0–100 integers (not 0–1 floats)
 *   - All rating strings use the standard: "good" | "needs-improvement" | "poor" | "unknown"
 *   - Output is deterministic and stable (safe for snapshot/regression testing)
 */

// ─── Rating Scales ─────────────────────────────────────────────────────────────

export type MetricRating = "good" | "needs-improvement" | "poor" | "unknown";
export type Severity = "low" | "medium" | "high" | "critical";
export type ConfidenceLevel = "high" | "medium" | "low";

// ─── Normalized Core Web Vitals ────────────────────────────────────────────────

export interface NormalizedVital {
  value: number | null;
  unit: "ms" | "score" | "unitless";
  rating: MetricRating;
}

export interface NormalizedCoreWebVitals {
  /** Largest Contentful Paint (ms) */
  lcp: NormalizedVital;
  /** First Contentful Paint (ms) */
  fcp: NormalizedVital;
  /** Total Blocking Time (ms) */
  tbt: NormalizedVital;
  /** Cumulative Layout Shift (unitless) */
  cls: NormalizedVital;
  /** Time to Interactive (ms) */
  tti: NormalizedVital;
  /** Time to First Byte (ms) */
  ttfb: NormalizedVital;
  /** Speed Index (ms) */
  speedIndex: NormalizedVital;
  /** Lighthouse performance score (0–100) */
  performanceScore: number | null;
  /** Overall rating across all vitals */
  overallRating: MetricRating;
}

// ─── Main Thread Analysis ──────────────────────────────────────────────────────

export interface NormalizedLongTask {
  /** Script URL (cleaned, shortened) */
  script: string | null;
  /** All attributed script URLs for this task */
  attributedScripts?: string[];
  /** Task duration (ms) */
  durationMs: number;
  /** Task start time relative to navigation (ms) */
  startTimeMs: number;
  /** Task category */
  attribution: string;
  /** Computed severity based on duration */
  severity: Severity;
  /** Whether this task overlapped with LCP render window */
  lcpOverlap?: boolean;
}

export interface NormalizedMainThread {
  /** Total blocking time (ms) — sum of all tasks >50ms */
  totalBlockingMs: number;
  /** Total main thread time (ms) */
  totalMainThreadMs: number;
  /** Number of long tasks (>50ms) */
  longTaskCount: number;
  /** Longest single task duration (ms) */
  longestTaskMs: number;
  /** Category breakdown: { scripting: 1200, layout: 300 } */
  categoryBreakdown: Record<string, number>;
  /** Top long tasks (capped at 5) */
  topLongTasks: NormalizedLongTask[];
}

// ─── Scripting Bottlenecks ─────────────────────────────────────────────────────

export interface NormalizedScriptingBottleneck {
  /** Cleaned script URL */
  url: string;
  /** Total JS execution time (ms) */
  totalExecutionMs: number;
  /** Whether this script caused a long task */
  causedLongTask: boolean;
  /** Severity classification */
  severity: Severity;
}

// ─── Render-Blocking Resources ─────────────────────────────────────────────────

export interface NormalizedRenderBlockingResource {
  /** Resource URL (cleaned) */
  url: string;
  /** Resource type */
  type: "script" | "stylesheet" | "font" | "unknown";
  /** Estimated blocking time savings (ms) */
  blockingMs: number | null;
  /** Transfer size (KB) */
  sizeKB: number | null;
}

// ─── LCP Intelligence ──────────────────────────────────────────────────────────

export interface NormalizedLCPCandidate {
  /** Element description */
  element: string | null;
  /** Resource URL if LCP is image */
  resourceUrl: string | null;
  /** LCP render time (ms) */
  renderTimeMs: number;
  /** Resource size (KB) */
  sizeKB: number | null;
  /** Whether it was blocked by render-blocking resources */
  wasRenderBlocked: boolean;
  /** Data source */
  source: "trace" | "lhr";
}

// ─── Hydration Analysis ────────────────────────────────────────────────────────

export interface NormalizedHydration {
  /** Whether hydration was detected */
  detected: boolean;
  /** Detected framework */
  framework: string | null;
  /** Hydration duration (ms) */
  durationMs: number | null;
  /** FCP to hydration complete gap (ms) — the interaction gap */
  fcpToHydrationMs: number | null;
  /** Whether large initial JS was detected */
  largeInitialJS: boolean;
  /** JS evaluated before FCP (ms) */
  jsBeforeFcpMs: number;
  /** Severity of hydration risk */
  severity: Severity;
  /** Confidence score 0–1 (from trace-parser probabilistic detection) */
  confidence: number;
  /** How hydration was detected */
  detectionMethod: string | null;
  /** Human-readable confidence note */
  confidenceNote: string | null;
}

// ─── Bundle Intelligence ───────────────────────────────────────────────────────

export interface NormalizedBundleDep {
  name: string;
  sizeKB: number;
  initial: boolean;
  category: string | null;
  alternative: string | null;
}

export interface NormalizedBundle {
  /** Initial JS bundle size (KB) */
  initialBundleKB: number | null;
  /** Total bundle size (KB) */
  totalBundleKB: number | null;
  /** Estimated parse time (ms) */
  estimatedParseMs: number | null;
  /** Top largest dependencies (capped at 5) */
  largestDeps: NormalizedBundleDep[];
  /** Packages with multiple copies and wasted KB */
  duplicates: Array<{ name: string; wastedKB: number; severity: Severity }>;
  /** Whether hydration risk is high */
  hydrationRisk: boolean;
}

// ─── Performance Risks ─────────────────────────────────────────────────────────

/** Bottleneck category identifiers */
export type BottleneckType =
  | "heavy-javascript"
  | "render-blocking-resources"
  | "slow-server"
  | "hydration-delay"
  | "oversized-bundle"
  | "duplicate-packages"
  | "unoptimized-images"
  | "long-tasks"
  | "layout-instability"
  | "slow-lcp-resource"
  | "analytics-in-initial-bundle"
  | "missing-code-splitting";

export interface PerformanceRisk {
  /** Bottleneck category */
  type: BottleneckType;
  /** Human-readable label */
  label: string;
  /** Severity of this risk */
  severity: Severity;
  /** Confidence score 0–1 (based on how many data sources confirm this) */
  confidence: number;
  /** Which analysis sources detected this (e.g., ["lighthouse", "trace-parser"]) */
  sources: string[];
  /** Estimated performance impact description */
  impact: string;
  /** Specific, actionable fix */
  recommendation: string;
  /** Priority rank (1 = highest priority) */
  priority: number;
  /** Attribution metadata: which scripts caused this bottleneck */
  attributionMetadata?: {
    attributedScripts: string[];
    attributionConfidence: number;
    thirdPartyOrigins?: string[];
  };
  /** Heuristic-based estimated gain from fixing this */
  impactEstimate?: {
    lcpMs: number | null;
    tbtMs: number | null;
    fcpMs: number | null;
    scorePoints: number | null;
  };
}

// ─── Quick Wins ────────────────────────────────────────────────────────────────

export interface QuickWin {
  /** Short action description */
  action: string;
  /** Estimated FCP/LCP savings in ms */
  estimatedSavingsMs: number | null;
  /** Priority rank (1 = highest) */
  priority: number;
  /** Category */
  category: "bundle" | "network" | "javascript" | "images" | "server";
}

// ─── Data Quality ──────────────────────────────────────────────────────────────

export interface DataQualityReport {
  /** Which analysis sources are available */
  sources: string[];
  hasLighthouse: boolean;
  hasTraceParser: boolean;
  hasBundleAnalysis: boolean;
  hasPlaywright: boolean;
  /** Overall data confidence level */
  confidence: ConfidenceLevel;
  /** Data quality note (e.g., "No Chrome trace — trace analysis estimated from LHR") */
  note: string | null;
}

// ─── Session Context ───────────────────────────────────────────────────────────

export interface SessionContext {
  sessionId: string;
  url: string;
  label: string;
  device: string;
  throttle: string;
  runs: number;
  pipelineDurationMs: number;
}

// ─── Stability Metrics ──────────────────────────────────────────────────────

/** Multi-run stability and variance tracking */
export interface StabilityMetrics {
  /** Number of audit runs that contributed to this report */
  runs: number;
  /** Coefficient of variation (%) per metric — lower is more stable */
  variance: {
    lcp: number | null;
    fcp: number | null;
    tbt: number | null;
    cls: number | null;
  };
  /** Averaged metrics across all runs */
  averaged: {
    lcp: number | null;
    fcp: number | null;
    tbt: number | null;
  };
  /** Overall stability confidence */
  stabilityConfidence: "high" | "medium" | "low";
  /** Human-readable stability note */
  stabilityNote: string | null;
}

// ─── Aggregation Metadata ────────────────────────────────────────────────────

export interface AggregationMeta {
  /** When this intelligence report was generated */
  generatedAt: string;
  /** Time taken to aggregate (ms) */
  aggregationMs: number;
  /** Analytics engine version */
  engineVersion: string;
}

// ─── The Canonical Output ──────────────────────────────────────────────────────

/**
 * TraceLensIntelligenceReport — the canonical normalized output.
 *
 * This is what the AI engine, dashboard, CLI, and CI/CD consume.
 * It is deterministic, stable, and optimized for LLM reasoning.
 *
 * Everything is in consistent units (ms, KB, 0–100 scores).
 * Everything is rated, prioritized, and correlated.
 */
export interface TraceLensIntelligenceReport {
  /** Report metadata */
  meta: AggregationMeta;

  /** Session and route context */
  session: SessionContext;

  /** Normalized Core Web Vitals from Lighthouse (most reliable source) */
  coreWebVitals: NormalizedCoreWebVitals;

  /** Main thread blocking analysis */
  mainThread: NormalizedMainThread;

  /** Top scripting bottlenecks by execution time */
  scriptingBottlenecks: NormalizedScriptingBottleneck[];

  /** Render-blocking resources sorted by impact */
  renderBlockingResources: NormalizedRenderBlockingResource[];

  /** LCP candidate details */
  lcpCandidate: NormalizedLCPCandidate | null;

  /** Hydration and JS initialization analysis with confidence scoring */
  hydration: NormalizedHydration;

  /**
   * Framework detection result.
   * Primary: trace runtime signals. Secondary: LHR script signatures.
   * null if no framework detected.
   */
  framework: import("../../trace-parser/src/types.js").FrameworkDetectionResult | null;

  /**
   * Bundle intelligence (null if bundle analysis was not run).
   * Available only for local/owned apps that provide webpack stats.
   */
  bundle: NormalizedBundle | null;

  /**
   * Cross-correlated, deduplicated performance risks.
   * Sorted by priority (1 = highest impact).
   * Max 10 risks.
   */
  performanceRisks: PerformanceRisk[];

  /** The single highest-confidence primary bottleneck */
  primaryBottleneck: BottleneckType;

  /**
   * Quick wins sorted by estimated savings.
   * Max 7 items.
   */
  quickWins: QuickWin[];

  /**
   * Merged, deduplicated, normalized AI signals from all sources.
   * Optimized for LLM prompt injection.
   * Max 20 items, ordered by impact.
   */
  aiSignals: string[];

  /** Data availability and confidence */
  dataQuality: DataQualityReport;

  /**
   * Multi-run stability metrics (null for single-run audits).
   * Available when pipeline runs with runs > 1.
   */
  stabilityMetrics: StabilityMetrics | null;
}

// ─── Input Type ────────────────────────────────────────────────────────────────

/**
 * Input to the analytics aggregator.
 * This is the TraceLensResult from the pipeline engine,
 * restricted to a single route for per-route intelligence.
 */
export interface AggregatorInput {
  /** Session metadata from the pipeline */
  sessionId: string;
  startedAt: string;
  durationMs: number;
  config: {
    device: { mode: string; throttle: string };
    runs: number;
  };
  /** The single route to aggregate */
  route: {
    url: string;
    label: string;
    vitals: {
      fcp: number | null;
      lcp: number | null;
      tbt: number | null;
      cls: number | null;
      tti: number | null;
      ttfb: number | null;
      speedIndex: number | null;
      performanceScore: number | null;
    };
    bottlenecks: import("../../trace-parser/src/types.js").ParsedTraceBottlenecks | null;
    bundle: import("../../bundle-analyzer/src/types.js").BundleAnalysisResult | null;
  };
}
