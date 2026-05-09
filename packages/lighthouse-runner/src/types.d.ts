/**
 * @file types.ts
 * @description All TypeScript types and interfaces for the lighthouse-runner module.
 * These are the public contracts consumed by other TraceLens packages.
 */
/** Audit form factor — mirrors Lighthouse's own config option */
export type FormFactor = "desktop" | "mobile";
/** Named preset that bundles form factor, throttle, and screen emulation */
export type AuditPreset = "desktop" | "mobile" | "ci";
/** A single URL to run Lighthouse against */
export interface LighthouseRoute {
    /** Full URL to audit */
    url: string;
    /** Optional human-readable label used in output filenames (auto-derived if omitted) */
    label?: string;
    /**
     * Additional Lighthouse config overrides for this specific route.
     * Merged on top of the resolved preset config.
     */
    configOverrides?: Partial<LighthouseConfig>;
}
/** Output format(s) to generate per route */
export type OutputFormat = "json" | "html";
/**
 * Top-level configuration for a LighthouseRunner session.
 * All fields have sensible defaults — only `routes` is required.
 */
export interface LighthouseRunnerConfig {
    /** One or more URLs to audit */
    routes: LighthouseRoute[];
    /**
     * Named audit preset (default: "desktop").
     * Controls form factor, throttle, and screen emulation.
     */
    preset?: AuditPreset;
    /**
     * Output formats to generate (default: ["json", "html"]).
     * At least one must be specified.
     */
    formats?: OutputFormat[];
    /**
     * Root directory for reports (default: "../../reports/lighthouse").
     * Resolved relative to the package root if a relative path is supplied.
     */
    outputDir?: string;
    /**
     * Number of audit runs per route for averaging (default: 1).
     * All individual run JSON results are stored; a summary is written at the end.
     */
    runs?: number;
    /**
     * Chrome/Chromium executable path.
     * If omitted, Lighthouse will attempt to find Chrome automatically.
     */
    chromePath?: string;
    /**
     * Additional Chrome flags passed to the launched browser instance.
     * These are appended to the preset's default flags.
     */
    chromeFlags?: string[];
    /** Port for the Chrome remote debugging protocol (default: 0 = auto-assign) */
    port?: number;
    /** Timeout for each individual Lighthouse audit in ms (default: 60000) */
    timeout?: number;
    /**
     * Lighthouse categories to include in the audit.
     * Defaults to all five: performance, accessibility, best-practices, seo, pwa.
     */
    categories?: LighthouseCategory[];
    /**
     * Locale for the Lighthouse report (default: "en").
     * Affects display strings inside the HTML report.
     */
    locale?: string;
    /**
     * If true, each run's JSON is written but no aggregate summary is produced.
     * Useful when runs === 1 (default: false).
     */
    skipSummary?: boolean;
}
/** Available Lighthouse audit categories */
export type LighthouseCategory = "performance" | "accessibility" | "best-practices" | "seo";
/**
 * Subset of the Lighthouse configuration object.
 * This matches the shape passed to `lighthouse(url, flags, config)`.
 */
export interface LighthouseConfig {
    extends?: string;
    settings?: {
        formFactor?: FormFactor;
        throttlingMethod?: "simulate" | "devtools" | "provided";
        throttling?: ThrottlingSettings;
        screenEmulation?: ScreenEmulation;
        onlyCategories?: LighthouseCategory[];
        locale?: string;
        maxWaitForLoad?: number;
        skipAudits?: string[];
        output?: OutputFormat | OutputFormat[];
    };
}
/** Lighthouse network/CPU throttle settings */
export interface ThrottlingSettings {
    rttMs?: number;
    throughputKbps?: number;
    cpuSlowdownMultiplier?: number;
    requestLatencyMs?: number;
    downloadThroughputKbps?: number;
    uploadThroughputKbps?: number;
}
/** Screen emulation for Lighthouse */
export interface ScreenEmulation {
    mobile?: boolean;
    width?: number;
    height?: number;
    deviceScaleFactor?: number;
    disabled?: boolean;
}
/**
 * Extracted Core Web Vitals and key performance metrics from a Lighthouse run.
 * All numeric values are in milliseconds unless otherwise noted.
 */
export interface CoreWebVitals {
    /** First Contentful Paint (ms) */
    fcp: number | null;
    /** Largest Contentful Paint (ms) */
    lcp: number | null;
    /** Total Blocking Time (ms) */
    tbt: number | null;
    /** Cumulative Layout Shift (unitless score) */
    cls: number | null;
    /** Speed Index (ms) */
    speedIndex: number | null;
    /** Time to Interactive (ms) */
    tti: number | null;
    /** Time to First Byte (ms) — from server-timing if available */
    ttfb: number | null;
}
/** Paths to output artifacts for a single Lighthouse run */
export interface LighthouseArtifacts {
    /** Directory containing all artifacts for this route run */
    outputDir: string;
    /** Absolute path to the JSON report (null if not requested) */
    jsonPath: string | null;
    /** Absolute path to the HTML report (null if not requested) */
    htmlPath: string | null;
}
/** Category score from a Lighthouse run (0–1 or null if category was skipped) */
export interface CategoryScore {
    score: number | null;
    /** Human-readable rating: "pass" | "average" | "fail" | "error" */
    rating: "pass" | "average" | "fail" | "error";
}
/** Full result for a single Lighthouse run against one route */
export interface LighthouseRouteResult {
    /** The route that was audited */
    route: LighthouseRoute;
    /** Preset used for this audit */
    preset: AuditPreset;
    /** ISO 8601 timestamp when the run started */
    startedAt: string;
    /** ISO 8601 timestamp when the run completed */
    completedAt: string;
    /** Total duration of the Lighthouse run in ms */
    durationMs: number;
    /** 0-based index when runs > 1 */
    runIndex: number;
    /** Lighthouse category scores (0–1) */
    scores: {
        performance: CategoryScore;
        accessibility: CategoryScore;
        bestPractices: CategoryScore;
        seo: CategoryScore;
    };
    /** Extracted Core Web Vitals */
    vitals: CoreWebVitals;
    /** File artifacts written to disk */
    artifacts: LighthouseArtifacts;
    /** Whether the audit completed without error */
    success: boolean;
    /** Error message if the audit failed */
    error?: string;
}
/**
 * Averaged metric summary when runs > 1.
 * Each value is the arithmetic mean across all successful runs.
 */
export interface AveragedMetrics {
    performanceScore: number | null;
    fcp: number | null;
    lcp: number | null;
    tbt: number | null;
    cls: number | null;
    speedIndex: number | null;
    tti: number | null;
    ttfb: number | null;
}
/** Per-route summary after all runs complete */
export interface LighthouseRouteSummary {
    route: LighthouseRoute;
    totalRuns: number;
    successfulRuns: number;
    averages: AveragedMetrics;
    /** Individual run results (ordered by runIndex) */
    runs: LighthouseRouteResult[];
}
/** Full result for an entire LighthouseRunner session */
export interface LighthouseRunnerResult {
    /** Unique session identifier (e.g. "20260507-143022-ab3f1") */
    sessionId: string;
    /** Session start timestamp (ISO 8601) */
    startedAt: string;
    /** Session end timestamp (ISO 8601) */
    completedAt: string;
    /** Total session duration in ms */
    durationMs: number;
    /** Preset used for this session */
    preset: AuditPreset;
    /** Per-route summaries (one entry per route in config.routes) */
    routes: LighthouseRouteSummary[];
    /** Resolved configuration used for this session */
    config: ResolvedLighthouseConfig;
    /** True if every route had at least one successful run */
    success: boolean;
    /** Absolute path to the session summary JSON */
    summaryPath: string | null;
}
/**
 * Fully resolved configuration after applying preset defaults.
 * Used internally by the runner — not part of the public input API.
 */
export interface ResolvedLighthouseConfig {
    routes: LighthouseRoute[];
    preset: AuditPreset;
    formats: OutputFormat[];
    outputDir: string;
    runs: number;
    chromePath: string | undefined;
    chromeFlags: string[];
    port: number;
    timeout: number;
    categories: LighthouseCategory[];
    locale: string;
    skipSummary: boolean;
}
//# sourceMappingURL=types.d.ts.map