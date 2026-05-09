/**
 * @file types.ts
 * @description All TypeScript types for @tracelens/pipeline-engine.
 *
 * DESIGN PRINCIPLES:
 *   - One PipelineSession flows through every stage
 *   - All artifact paths are explicit — never searched from disk
 *   - Every stage records timing, status, and its output contract
 *   - The final TraceLensResult is the canonical output consumed by AI/dashboard
 */
import type { RunnerResult as PlaywrightRunnerResult } from "../../playwright-runner/src/types.js";
import type { LighthouseRunnerResult } from "../../lighthouse-runner/src/types.js";
import type { ParsedTraceBottlenecks } from "../../trace-parser/src/types.js";
import type { BundleAnalysisResult, BundleAnalysisInput } from "../../bundle-analyzer/src/types.js";
/** A single route/page target for the pipeline */
export interface PipelineRoute {
    /** Full URL to audit (e.g. "https://example.com/dashboard") */
    url: string;
    /** Optional human-readable label for filenames and reports */
    label?: string;
}
/** Device configuration for the entire pipeline */
export interface PipelineDevice {
    /**
     * Device mode.
     * Controls both Playwright viewport emulation and Lighthouse form factor.
     */
    mode: "desktop" | "mobile";
    /** Network throttle profile */
    throttle: "none" | "4g" | "3g";
}
/** Optional bundle analysis configuration */
export interface BundleConfig {
    /**
     * Path to webpack stats.json (relative to cwd or absolute).
     * If omitted, bundle analysis step is skipped.
     */
    webpackStatsPath?: string;
    /**
     * Path to source-map-explorer JSON output.
     * Used as fallback or supplement if webpackStatsPath is not provided.
     */
    sourceMapExplorerPath?: string;
    /** Frontend framework hint for better route/hydration detection */
    framework?: BundleAnalysisInput["framework"];
    /** Project name for labeling in bundle report */
    projectName?: string;
}
/**
 * Top-level configuration for a TraceLens pipeline run.
 * This is the ONLY thing the user needs to configure.
 */
export interface PipelineConfig {
    /** One or more pages/routes to audit */
    routes: PipelineRoute[];
    /**
     * Device + throttle profile.
     * Defaults to desktop / no throttle.
     */
    device?: PipelineDevice;
    /**
     * Root output directory.
     * All session artifacts will be written under:
     *   <outputDir>/sessions/<sessionId>/<slugifiedUrl>/
     *
     * Default: "./reports"
     */
    outputDir?: string;
    /**
     * Number of audit runs per route for averaging.
     * When > 1, Lighthouse metrics are averaged across runs.
     * Default: 1
     */
    runs?: number;
    /** Bundle analysis configuration (optional) */
    bundle?: BundleConfig;
    /**
     * Whether to capture Playwright artifacts (trace, HAR, screenshot).
     * Default: true
     */
    capturePlaywrightArtifacts?: boolean;
    /**
     * Whether to run Lighthouse audit.
     * Default: true
     */
    runLighthouse?: boolean;
    /**
     * Whether to run trace analysis.
     * Default: true
     */
    runTraceParser?: boolean;
    /**
     * Whether to run bundle analysis.
     * Default: true if bundle config is provided, false otherwise.
     */
    runBundleAnalyzer?: boolean;
    /**
     * Continue pipeline even if a non-critical stage fails.
     * Default: true
     */
    continueOnFailure?: boolean;
    /** Whether to run Playwright in headless mode (default: true) */
    headless?: boolean;
}
/**
 * The canonical runtime context that flows through every pipeline stage.
 * Created once at session initialization, mutated by each stage as it runs.
 * Never search the filesystem — use this context to pass artifact paths.
 */
export interface PipelineContext {
    /** Globally unique session identifier e.g. "trace-session-20260508-123456-ab3f" */
    sessionId: string;
    /** ISO 8601 timestamp when the session was created */
    createdAt: string;
    /** Resolved pipeline configuration */
    config: ResolvedPipelineConfig;
    /**
     * Base output directory for this specific session.
     * Structure: <config.outputDir>/sessions/<sessionId>/
     */
    sessionDir: string;
    /** Runtime state — updated as each stage progresses */
    stages: PipelineStages;
    /** Per-route artifact maps — keyed by route URL */
    routeArtifacts: Map<string, RouteArtifactBundle>;
}
/**
 * All artifacts collected for one route across all pipeline stages.
 * These are passed explicitly between stages — never searched from disk.
 */
export interface RouteArtifactBundle {
    url: string;
    label: string;
    /** Output directory for this route: <sessionDir>/<slugifiedUrl>/ */
    routeDir: string;
    playwright: {
        screenshotPath: string | null;
        tracePath: string | null;
        harPath: string | null;
        timings: {
            domContentLoaded: number;
            load: number;
            ttfb: number;
            firstPaint: number | null;
            firstContentfulPaint: number | null;
        } | null;
    };
    lighthouse: {
        jsonPath: string | null;
        htmlPath: string | null;
        vitals: {
            fcp: number | null;
            lcp: number | null;
            tbt: number | null;
            cls: number | null;
            tti: number | null;
            ttfb: number | null;
            speedIndex: number | null;
        } | null;
        performanceScore: number | null;
    };
    traceParser: {
        outputPath: string | null;
        result: ParsedTraceBottlenecks | null;
    };
    bundleAnalyzer: {
        outputPath: string | null;
        result: BundleAnalysisResult | null;
    };
}
/** Stage execution status */
export type StageStatus = "pending" | "running" | "done" | "failed" | "skipped";
/** Execution record for a single pipeline stage */
export interface StageRecord {
    status: StageStatus;
    startedAt: string | null;
    completedAt: string | null;
    durationMs: number | null;
    error: string | null;
}
/** All pipeline stage statuses */
export interface PipelineStages {
    playwright: StageRecord;
    lighthouse: StageRecord;
    traceParser: StageRecord;
    bundleAnalyzer: StageRecord;
    aggregation: StageRecord;
}
/**
 * The canonical TraceLens result for one pipeline session.
 * This is what the AI engine, report engine, and dashboard consume.
 */
export interface TraceLensResult {
    /** Session identifier */
    sessionId: string;
    /** ISO timestamps */
    startedAt: string;
    completedAt: string;
    durationMs: number;
    /** Overall pipeline success */
    success: boolean;
    /** Pipeline stage execution summary */
    stages: PipelineStages;
    /** Per-route intelligence results */
    routes: RouteIntelligenceResult[];
    /** Resolved config used for this session */
    config: ResolvedPipelineConfig;
    /** Absolute path to this result JSON */
    resultPath: string | null;
}
/** Complete intelligence for one route */
export interface RouteIntelligenceResult {
    /** Route URL */
    url: string;
    /** Route label */
    label: string;
    /** Core Web Vitals (from Lighthouse, most reliable) */
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
    /** Trace parser bottleneck analysis */
    bottlenecks: ParsedTraceBottlenecks | null;
    /** Bundle intelligence */
    bundle: BundleAnalysisResult | null;
    /** All artifact file paths for this route */
    artifacts: {
        screenshotPath: string | null;
        tracePath: string | null;
        harPath: string | null;
        lighthouseJsonPath: string | null;
        lighthouseHtmlPath: string | null;
        bottlenecksJsonPath: string | null;
        bundleJsonPath: string | null;
    };
    /**
     * Merged AI signals from all analysis stages.
     * This is the primary payload for the AI engine.
     * Max 30 items total from all stages.
     */
    aiSignals: string[];
    /** Primary bottleneck diagnosis (from trace-parser correlator) */
    primaryBottleneck: string | null;
}
/** Fully resolved pipeline config after applying defaults */
export interface ResolvedPipelineConfig {
    routes: Required<PipelineRoute>[];
    device: Required<PipelineDevice>;
    outputDir: string;
    runs: number;
    bundle: BundleConfig | null;
    capturePlaywrightArtifacts: boolean;
    runLighthouse: boolean;
    runTraceParser: boolean;
    runBundleAnalyzer: boolean;
    continueOnFailure: boolean;
    headless: boolean;
}
export type { PlaywrightRunnerResult, LighthouseRunnerResult, ParsedTraceBottlenecks, BundleAnalysisResult };
//# sourceMappingURL=types.d.ts.map