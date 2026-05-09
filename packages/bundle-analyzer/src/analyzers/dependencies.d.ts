/**
 * @file analyzers/dependencies.ts
 * @description Largest dependency detection and classification.
 *
 * Groups all modules by their npm package name, sums their sizes,
 * classifies each package by performance impact category, and
 * flags known problematic packages with lighter alternatives.
 *
 * CLASSIFICATION PRIORITY:
 *   1. Category (framework, ads, analytics, chart, etc.)
 *   2. Whether it's in the initial bundle
 *   3. Whether a lighter alternative exists
 */
import type { BundleDependency } from "../types.js";
import type { NormalizedModule } from "../adapters/webpack-stats.js";
/**
 * Extracts and classifies the largest dependencies from normalized modules.
 *
 * @param modules     - Normalized webpack modules
 * @param totalBytes  - Total bundle size (for percentage calculation)
 * @returns           - Array of BundleDependency sorted by sizeKB desc
 */
export declare function extractLargestDependencies(modules: NormalizedModule[], totalBytes: number): BundleDependency[];
/**
 * Computes the initial bundle composition breakdown.
 */
export declare function computeInitialComposition(modules: NormalizedModule[], initialSizeBytes: number, deps: BundleDependency[]): import("../types.js").InitialBundleComposition;
export declare function bytesToKB(bytes: number): number;
//# sourceMappingURL=dependencies.d.ts.map