"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyze = analyze;
const webpack_stats_js_1 = require("./adapters/webpack-stats.js");
const dependencies_js_1 = require("./analyzers/dependencies.js");
const source_map_explorer_js_1 = require("./adapters/source-map-explorer.js");
const dependencies_js_2 = require("./analyzers/dependencies.js");
const duplicates_js_1 = require("./analyzers/duplicates.js");
const routes_js_1 = require("./analyzers/routes.js");
const performance_js_1 = require("./analyzers/performance.js");
const correlator_js_1 = require("./correlator.js");
const summarizer_js_1 = require("./summarizer.js");
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
function analyze(input) {
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
        const normalized = (0, webpack_stats_js_1.parseWebpackStats)(stats);
        initialSizeKB = (0, dependencies_js_1.bytesToKB)(normalized.initialSizeBytes);
        asyncSizeKB = (0, dependencies_js_1.bytesToKB)(normalized.asyncSizeBytes);
        totalSizeKB = (0, dependencies_js_1.bytesToKB)(normalized.totalSizeBytes);
        // ── Step 3a: Dependencies ───────────────────────────────────────────────
        allDeps = (0, dependencies_js_2.extractLargestDependencies)(normalized.modules, normalized.totalSizeBytes);
        // ── Step 3b: Duplicates ─────────────────────────────────────────────────
        const duplicatePackages = (0, duplicates_js_1.detectDuplicatePackages)(normalized.modules);
        // ── Step 3c: Route chunks ───────────────────────────────────────────────
        const routeChunks = (0, routes_js_1.extractRouteChunks)(normalized.chunks, normalized.modules);
        // ── Step 3d: Initial composition ────────────────────────────────────────
        const initialComposition = (0, dependencies_js_2.computeInitialComposition)(normalized.modules, normalized.initialSizeBytes, allDeps);
        // ── Step 3e: Performance signals ────────────────────────────────────────
        const performanceSignals = (0, performance_js_1.computePerformanceSignals)(initialSizeKB, allDeps, duplicatePackages, routeChunks);
        // ── Step 3f: Hydration risk ─────────────────────────────────────────────
        const hydrationRisk = (0, performance_js_1.assessHydrationRisk)(initialSizeKB, allDeps);
        // ── Step 4: Correlate ───────────────────────────────────────────────────
        const correlations = (0, correlator_js_1.correlateBundleSignals)(initialSizeKB, performanceSignals, allDeps, duplicatePackages, input.traceBottlenecks);
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
        return { ...partial, aiSignals: (0, summarizer_js_1.buildBundleAISignals)(partial) };
    }
    // ── SME-only path ───────────────────────────────────────────────────────────
    return analyzeSMEOnly(sme, input, analyzedAt, dataQuality);
}
// ─── SME-Only Mode ─────────────────────────────────────────────────────────────
function analyzeSMEOnly(sme, input, analyzedAt, dataQuality) {
    const bundles = (0, source_map_explorer_js_1.parseSourceMapExplorer)(sme);
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
    const initialSizeKB = (0, dependencies_js_1.bytesToKB)(initialBytes);
    const asyncSizeKB = (0, dependencies_js_1.bytesToKB)(asyncBytes);
    // Build fake NormalizedModule array for dependency extraction
    const fakeModules = [...mergedPackageSizes.entries()].map(([pkg, { bytes, initial }]) => ({
        path: `./node_modules/${pkg}/index.js`,
        packageName: pkg,
        nestedPath: null,
        sizeBytes: bytes,
        chunkIds: [],
        isInitial: initial,
    }));
    const allDeps = (0, dependencies_js_2.extractLargestDependencies)(fakeModules, totalBytes);
    const duplicatePackages = []; // Can't detect from SME alone
    const routeChunks = [];
    const initialComposition = (0, dependencies_js_2.computeInitialComposition)(fakeModules, initialBytes, allDeps);
    const performanceSignals = (0, performance_js_1.computePerformanceSignals)(initialSizeKB, allDeps, duplicatePackages, routeChunks);
    const hydrationRisk = (0, performance_js_1.assessHydrationRisk)(initialSizeKB, allDeps);
    const correlations = (0, correlator_js_1.correlateBundleSignals)(initialSizeKB, performanceSignals, allDeps, duplicatePackages, input.traceBottlenecks);
    const partial = {
        projectName: input.projectName ?? null,
        analyzedAt,
        dataQuality,
        initialBundleSizeKB: initialSizeKB,
        asyncBundleSizeKB: asyncSizeKB,
        totalBundleSizeKB: (0, dependencies_js_1.bytesToKB)(totalBytes),
        initialComposition,
        largestDependencies: allDeps,
        duplicatePackages,
        routeChunks,
        hydrationRisk,
        performanceSignals,
        correlations,
    };
    return { ...partial, aiSignals: (0, summarizer_js_1.buildBundleAISignals)(partial) };
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
