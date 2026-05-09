/**
 * @file analyzers/performance.ts
 * @description Performance signal generation and hydration risk assessment.
 *
 * Converts raw bundle metrics into structured performance flags that
 * the AI engine can reason about without needing to understand webpack internals.
 *
 * JS PARSE TIME HEURISTIC:
 *   Modern Chrome parses JS at roughly 1MB/s on a mid-range device.
 *   So 1KB ≈ 1ms parse time (conservative estimate).
 *   This is a rough heuristic — real parse time depends on code complexity.
 */
import type { BundleDependency, BundlePerformanceSignals, DuplicatePackage, HydrationRisk, RouteChunk } from "../types.js";
/**
 * Computes performance signals from bundle analysis data.
 */
export declare function computePerformanceSignals(initialSizeKB: number, deps: BundleDependency[], duplicates: DuplicatePackage[], routeChunks: RouteChunk[]): BundlePerformanceSignals;
/**
 * Assesses hydration risk from bundle data.
 */
export declare function assessHydrationRisk(initialSizeKB: number, deps: BundleDependency[]): HydrationRisk;
//# sourceMappingURL=performance.d.ts.map