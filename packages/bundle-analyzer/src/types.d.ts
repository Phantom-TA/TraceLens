/**
 * @file types.ts
 * @description All TypeScript types for @tracelens/bundle-analyzer.
 *
 * DESIGN PRINCIPLES:
 *   - All sizes are in KILOBYTES (KB) in the public output
 *   - Raw byte values from inputs are converted internally
 *   - Output is compact and AI-optimized — no raw dep trees
 *   - Every type maps to a specific performance concern
 */
/**
 * Webpack stats.json shape (generated via: webpack --json > stats.json).
 * We only read the fields we need — the full shape has 200+ fields.
 */
export interface WebpackStatsInput {
    /** Total hash of the compilation */
    hash?: string;
    /** Webpack version */
    version?: string;
    /** Output assets */
    assets?: WebpackAsset[];
    /** All compiled chunks */
    chunks?: WebpackChunk[];
    /** All compiled modules */
    modules?: WebpackModule[];
    /** Entry points keyed by name */
    entrypoints?: Record<string, WebpackEntrypoint>;
    /** Named chunk groups (includes route chunks in Next.js/CRA) */
    namedChunkGroups?: Record<string, WebpackChunkGroup>;
}
export interface WebpackAsset {
    name: string;
    size: number;
    chunks?: (string | number)[];
    chunkNames?: string[];
    /** True if this asset is included in the initial page load */
    isOverSizeLimit?: boolean;
    info?: {
        immutable?: boolean;
        contenthash?: string;
        development?: boolean;
        hotModuleReplacement?: boolean;
    };
}
export interface WebpackChunk {
    id: string | number;
    names: string[];
    size: number;
    /** True if this chunk is included in the initial page load */
    initial: boolean;
    /** True if this is an entry point chunk */
    entry: boolean;
    modules?: WebpackModule[];
    files?: string[];
    parents?: (string | number)[];
    children?: (string | number)[];
    siblings?: (string | number)[];
    origins?: Array<{
        request?: string;
        moduleName?: string;
    }>;
}
export interface WebpackModule {
    id?: string | number;
    /** Module path, e.g. "./node_modules/react/index.js" */
    name: string;
    /** Size in bytes */
    size: number;
    /** Chunk IDs this module belongs to */
    chunks?: (string | number)[];
    /** What imported this module */
    reasons?: Array<{
        moduleName?: string;
        type?: string;
    }>;
    /** Nested modules (for concatenated modules) */
    modules?: WebpackModule[];
    /** Whether this was tree-shaken away */
    usedExports?: boolean | string[];
    issuer?: string;
}
export interface WebpackEntrypoint {
    chunks: (string | number)[];
    assets: string[];
    childAssets?: Record<string, string[]>;
}
export interface WebpackChunkGroup {
    chunks: (string | number)[];
    assets: string[];
    childAssets?: Record<string, string[]>;
}
/**
 * Output of: source-map-explorer --json bundle.js > sme-output.json
 * Or the programmatic API result.
 */
export interface SourceMapExplorerInput {
    results?: SourceMapExplorerBundle[];
    /** Error bundles (failed to parse) */
    errors?: Array<{
        bundleName: string;
        code: string;
        message: string;
    }>;
}
export interface SourceMapExplorerBundle {
    bundleName: string;
    totalBytes: number;
    unmappedBytes: number | null;
    eolBytes?: number;
    sourceMapCommentBytes?: number;
    /** Map of source file path → { size: bytes } */
    files: Record<string, {
        size: number;
    }>;
}
/**
 * Main input to analyze().
 * At least one of webpackStats or sourceMapExplorer must be provided.
 */
export interface BundleAnalysisInput {
    /**
     * Parsed webpack stats.json (or JSON string).
     * Richest source — provides chunk relationships, initial/async split,
     * module reasons, and tree-shaking info.
     */
    webpackStats?: string | WebpackStatsInput;
    /**
     * Parsed source-map-explorer JSON output (or string).
     * More accurate file sizes but fewer structural relationships.
     */
    sourceMapExplorer?: string | SourceMapExplorerInput;
    /**
     * Optional: parsed trace-parser output to cross-correlate
     * bundle size with actual runtime performance impact.
     */
    traceBottlenecks?: {
        vitals?: {
            fcp?: number | null;
            lcp?: number | null;
            tbt?: number | null;
        };
        bundleSignals?: {
            jsBeforeFcpMs?: number;
            largeInitialJS?: boolean;
        };
        scriptingBottlenecks?: Array<{
            url: string;
            totalExecutionMs: number;
        }>;
    };
    /** Framework hint for better route/hydration detection */
    framework?: "next.js" | "react" | "vue" | "angular" | "nuxt" | "sveltekit" | "unknown";
    /** Project name for labeling */
    projectName?: string;
}
/** A resolved dependency with size and performance metadata */
export interface BundleDependency {
    /** Package name (e.g. "react", "lodash", "chart.js") */
    name: string;
    /** Total size in KB (sum of all files from this package) */
    sizeKB: number;
    /** Percentage of total bundle */
    percentage: number;
    /** True if present in the initial (non-lazy) bundle */
    initial: boolean;
    /** Detected category for performance impact classification */
    category: DependencyCategory;
    /** True if this dependency has a lighter known alternative */
    hasLighterAlternative: boolean;
    /** Suggested lighter alternative package name */
    alternative: string | null;
}
export type DependencyCategory = "framework" | "ui-library" | "chart-library" | "analytics" | "ads" | "utility" | "date-library" | "rich-text" | "video-player" | "maps" | "state" | "icons" | "animations" | "other";
/** A duplicate package — same name, multiple versions or nested copies */
export interface DuplicatePackage {
    /** Package name */
    name: string;
    /** All resolved paths/versions found */
    instances: DuplicateInstance[];
    /** Total wasted KB (sum of all instances minus the largest one) */
    wastedKB: number;
    /** Severity based on wasted size */
    severity: "high" | "medium" | "low";
}
export interface DuplicateInstance {
    /** The module path where this copy was found */
    modulePath: string;
    /** Parsed semver version (if detectable) */
    version: string | null;
    /** Size of this specific copy in KB */
    sizeKB: number;
}
/** A route-specific chunk with its bundle composition */
export interface RouteChunk {
    /** Route path (e.g. "/dashboard", "/profile/:id") */
    route: string;
    /** Chunk name as webpack knows it */
    chunkName: string;
    /** Total chunk size in KB */
    sizeKB: number;
    /** Whether this chunk is loaded on every page (initial) */
    initial: boolean;
    /** Whether this is lazily loaded */
    async: boolean;
    /** Top 5 dependencies in this chunk */
    topDependencies: Array<{
        name: string;
        sizeKB: number;
    }>;
}
/** Composition of the initial (above-the-fold) JavaScript bundle */
export interface InitialBundleComposition {
    /** Total initial JS size in KB */
    totalSizeKB: number;
    /** Framework code size (React, Vue, etc.) in KB */
    frameworkKB: number;
    /** Third-party library size in KB */
    thirdPartyKB: number;
    /** App code size (your actual business logic) in KB */
    appCodeKB: number;
    /** Unknown/unmapped size in KB */
    unknownKB: number;
    /** Named categories of notable initial dependencies */
    notableInitialDeps: string[];
}
/** Hydration-specific risk signals */
export interface HydrationRisk {
    /** True if initial bundle likely causes significant hydration time */
    isHigh: boolean;
    /** Estimated additional interactivity delay due to JS size (ms estimate) */
    estimatedJsParseMs: number;
    /** Dependencies most likely to slow hydration */
    heavyDeps: string[];
    /** True if any known hydration-heavy patterns detected */
    hasRenderBlockingDeps: boolean;
}
/** Performance signals derived from bundle analysis */
export interface BundlePerformanceSignals {
    /** True if initial JS > 200KB */
    largeInitialJS: boolean;
    /** True if estimated parse time could delay interactivity */
    hydrationRisk: boolean;
    /** True if analytics/ads SDKs are in the initial bundle */
    thirdPartyInInitialBundle: boolean;
    /** True if a date library like moment.js (full build) is detected */
    heavyDateLibrary: boolean;
    /** True if a large chart library is in the initial bundle */
    chartLibraryInInitial: boolean;
    /** True if lodash full build (not lodash-es) is detected */
    unoptimizedLodash: boolean;
    /** True if duplicate packages add >50KB wasted size */
    significantDuplication: boolean;
    /** True if any route chunk exceeds 500KB */
    oversizedRouteChunks: boolean;
    /** Estimated parse+eval time for initial bundle (ms) — based on 1KB = ~1ms heuristic */
    estimatedParseMs: number;
}
/** Cross-signal correlation insights */
export interface BundleCorrelationInsights {
    /** Whether large initial JS is likely causing poor FCP/LCP */
    bundleCausingSlowFcp: boolean;
    /** Whether bundle size correlates with high TBT */
    bundleCausingHighTbt: boolean;
    /** Primary diagnosed issue */
    primaryIssue: BundleIssueCategory;
    /** Human-readable explanation for AI context */
    explanation: string;
}
export type BundleIssueCategory = "oversized-initial-bundle" | "duplicate-packages" | "unoptimized-dependencies" | "heavy-third-party" | "oversized-route-chunks" | "poor-code-splitting" | "well-optimized";
/**
 * The compact, AI-ready bundle analysis result.
 * This is what gets passed to the AI engine.
 */
export interface BundleAnalysisResult {
    /** Project name (if provided) */
    projectName: string | null;
    /** ISO timestamp */
    analyzedAt: string;
    /**
     * Data quality:
     *   "webpack-stats"  — richest, from webpack stats.json
     *   "source-map"     — from source-map-explorer
     *   "combined"       — both sources merged
     *   "partial"        — incomplete data
     */
    dataQuality: "webpack-stats" | "source-map" | "combined" | "partial";
    /** Total initial bundle size in KB */
    initialBundleSizeKB: number;
    /** Total async/lazy bundle size in KB */
    asyncBundleSizeKB: number;
    /** Total bundle size (initial + async) in KB */
    totalBundleSizeKB: number;
    /** Composition breakdown of the initial bundle */
    initialComposition: InitialBundleComposition;
    /**
     * Top dependencies by size, sorted desc.
     * Capped at 15 — only the most impactful.
     */
    largestDependencies: BundleDependency[];
    /**
     * Duplicate packages — same package included multiple times.
     * Sorted by wastedKB desc. Capped at 10.
     */
    duplicatePackages: DuplicatePackage[];
    /**
     * Route-specific chunks, sorted by sizeKB desc.
     * Capped at 10.
     */
    routeChunks: RouteChunk[];
    /** Hydration risk assessment */
    hydrationRisk: HydrationRisk;
    /** Derived performance signals */
    performanceSignals: BundlePerformanceSignals;
    /** Cross-signal correlation */
    correlations: BundleCorrelationInsights;
    /**
     * AI-ready signal list.
     * Each string is one concise, factual, actionable performance insight.
     * Max 20 items.
     */
    aiSignals: string[];
}
//# sourceMappingURL=types.d.ts.map