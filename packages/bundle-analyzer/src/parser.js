/**
 * @file parser.ts
 * @description Main orchestrator for the bundle-analyzer module.
 *
 * EXECUTION ORDER:
 *   1. Parse + validate input (webpack stats / SME / both)
 *   2. Normalize into unified internal representation
 *   3. Run all analyzers:
 *      a. Dependency sizes + classification
 *      b. Duplicate package detection
 *      c. Route chunk analysis
 *      d. Performance signal computation
 *      e. Hydration risk assessment
 *   4. Correlate with trace-parser data (if provided)
 *   5. Build AI signal list
 *   6. Assemble final BundleAnalysisResult
 *
 * DATA QUALITY:
 *   "webpack-stats" → richest, chunk relationships + module reasons
 *   "source-map"    → accurate sizes, no chunk info
 *   "combined"      → both merged (sizes from SME, structure from stats)
 *   "partial"       → only partial data available
 */
import { parseWebpackStats } from "./adapters/webpack-stats.js";
import { bytesToKB } from "./analyzers/dependencies.js";
import { parseSourceMapExplorer } from "./adapters/source-map-explorer.js";
import { extractLargestDependencies, computeInitialComposition } from "./analyzers/dependencies.js";
import { detectDuplicatePackages } from "./analyzers/duplicates.js";
import { extractRouteChunks } from "./analyzers/routes.js";
import { computePerformanceSignals, assessHydrationRisk } from "./analyzers/performance.js";
import { correlateBundleSignals } from "./correlator.js";
import { buildBundleAISignals } from "./summarizer.js";
// ─── Public API ────────────────────────────────────────────────────────────────
/**
 * Analyzes a JavaScript bundle and produces a compact, AI-ready
 * BundleAnalysisResult summary.
 *
 * @param input - BundleAnalysisInput with at least one of webpackStats / sourceMapExplorer
 * @returns     - Complete BundleAnalysisResult
 *
 * @throws {Error} If no valid input is provided
 *
 * @example
 * ```ts
 * import { analyze } from "@tracelens/bundle-analyzer";
 * import { readFileSync } from "fs";
 *
 * const result = analyze({
 *   webpackStats: readFileSync("stats.json", "utf-8"),
 *   framework: "next.js",
 * });
 *
 * console.log(result.correlations.primaryIssue);
 * console.log(result.aiSignals);
 * ```
 */
export function analyze(input) {
    const analyzedAt = new Date().toISOString();
    // ── Step 1: Parse inputs ────────────────────────────────────────────────────
    const stats = resolveWebpackStats(input.webpackStats);
    const sme = resolveSourceMapExplorer(input.sourceMapExplorer);
    if (!stats && !sme) {
        throw new Error("[bundle-analyzer] analyze() requires at least one of: webpackStats, sourceMapExplorer.");
    }
    const dataQuality = resolveDataQuality(!!stats, !!sme);
    // ── Step 2: Normalize ───────────────────────────────────────────────────────
    let initialSizeKB = 0;
    let asyncSizeKB = 0;
    let totalSizeKB = 0;
    let allDeps = [];
    if (stats) {
        // Primary path: webpack stats
        const normalized = parseWebpackStats(stats);
        initialSizeKB = bytesToKB(normalized.initialSizeBytes);
        asyncSizeKB = bytesToKB(normalized.asyncSizeBytes);
        totalSizeKB = bytesToKB(normalized.totalSizeBytes);
        // ── Step 3a: Dependencies ───────────────────────────────────────────────
        allDeps = extractLargestDependencies(normalized.modules, normalized.totalSizeBytes);
        // ── Step 3b: Duplicates ─────────────────────────────────────────────────
        const duplicatePackages = detectDuplicatePackages(normalized.modules);
        // ── Step 3c: Route chunks ───────────────────────────────────────────────
        const routeChunks = extractRouteChunks(normalized.chunks, normalized.modules);
        // ── Step 3d: Initial composition ────────────────────────────────────────
        const initialComposition = computeInitialComposition(normalized.modules, normalized.initialSizeBytes, allDeps);
        // ── Step 3e: Performance signals ────────────────────────────────────────
        const performanceSignals = computePerformanceSignals(initialSizeKB, allDeps, duplicatePackages, routeChunks);
        // ── Step 3f: Hydration risk ─────────────────────────────────────────────
        const hydrationRisk = assessHydrationRisk(initialSizeKB, allDeps);
        // ── Step 4: Correlate ───────────────────────────────────────────────────
        const correlations = correlateBundleSignals(initialSizeKB, performanceSignals, allDeps, duplicatePackages, input.traceBottlenecks);
        // ── Step 5: AI signals ──────────────────────────────────────────────────
        const partial = {
            projectName: input.projectName ?? null,
            analyzedAt,
            dataQuality,
            initialBundleSizeKB: initialSizeKB,
            asyncBundleSizeKB: asyncSizeKB,
            totalBundleSizeKB: totalSizeKB,
            initialComposition,
            largestDependencies: allDeps,
            duplicatePackages,
            routeChunks,
            hydrationRisk,
            performanceSignals,
            correlations,
        };
        return { ...partial, aiSignals: buildBundleAISignals(partial) };
    }
    // ── SME-only path ───────────────────────────────────────────────────────────
    return analyzeSMEOnly(sme, input, analyzedAt, dataQuality);
}
// ─── SME-Only Mode ─────────────────────────────────────────────────────────────
function analyzeSMEOnly(sme, input, analyzedAt, dataQuality) {
    const bundles = parseSourceMapExplorer(sme);
    let initialBytes = 0;
    let asyncBytes = 0;
    const mergedPackageSizes = new Map();
    for (const bundle of bundles) {
        const isInitial = bundle.isInitialGuess;
        if (isInitial)
            initialBytes += bundle.totalBytes;
        else
            asyncBytes += bundle.totalBytes;
        for (const [pkg, bytes] of bundle.packageSizes) {
            const existing = mergedPackageSizes.get(pkg) ?? { bytes: 0, initial: false };
            mergedPackageSizes.set(pkg, {
                bytes: existing.bytes + bytes,
                initial: existing.initial || isInitial,
            });
        }
    }
    const totalBytes = initialBytes + asyncBytes;
    const initialSizeKB = bytesToKB(initialBytes);
    const asyncSizeKB = bytesToKB(asyncBytes);
    // Build fake NormalizedModule array for dependency extraction
    const fakeModules = [...mergedPackageSizes.entries()].map(([pkg, { bytes, initial }]) => ({
        path: `./node_modules/${pkg}/index.js`,
        packageName: pkg,
        nestedPath: null,
        sizeBytes: bytes,
        chunkIds: [],
        isInitial: initial,
    }));
    const allDeps = extractLargestDependencies(fakeModules, totalBytes);
    const duplicatePackages = []; // Can't detect from SME alone
    const routeChunks = [];
    const initialComposition = computeInitialComposition(fakeModules, initialBytes, allDeps);
    const performanceSignals = computePerformanceSignals(initialSizeKB, allDeps, duplicatePackages, routeChunks);
    const hydrationRisk = assessHydrationRisk(initialSizeKB, allDeps);
    const correlations = correlateBundleSignals(initialSizeKB, performanceSignals, allDeps, duplicatePackages, input.traceBottlenecks);
    const partial = {
        projectName: input.projectName ?? null,
        analyzedAt,
        dataQuality,
        initialBundleSizeKB: initialSizeKB,
        asyncBundleSizeKB: asyncSizeKB,
        totalBundleSizeKB: bytesToKB(totalBytes),
        initialComposition,
        largestDependencies: allDeps,
        duplicatePackages,
        routeChunks,
        hydrationRisk,
        performanceSignals,
        correlations,
    };
    return { ...partial, aiSignals: buildBundleAISignals(partial) };
}
// ─── Input Resolvers ───────────────────────────────────────────────────────────
function resolveWebpackStats(input) {
    if (!input)
        return null;
    if (typeof input === "string") {
        try {
            return JSON.parse(input);
        }
        catch {
            return null;
        }
    }
    return input;
}
function resolveSourceMapExplorer(input) {
    if (!input)
        return null;
    if (typeof input === "string") {
        try {
            return JSON.parse(input);
        }
        catch {
            return null;
        }
    }
    return input;
}
function resolveDataQuality(hasStats, hasSME) {
    if (hasStats && hasSME)
        return "combined";
    if (hasStats)
        return "webpack-stats";
    if (hasSME)
        return "source-map";
    return "partial";
}
//# sourceMappingURL=parser.js.map