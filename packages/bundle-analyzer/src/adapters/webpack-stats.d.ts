/**
 * @file adapters/webpack-stats.ts
 * @description Webpack stats.json parser and normalizer.
 *
 * Converts the raw webpack stats object into a normalized internal
 * representation that all analyzers can consume uniformly.
 *
 * WEBPACK STATS ANATOMY:
 *   assets   → final output files (.js, .css, .map)
 *   chunks   → logical groupings of modules (initial vs async)
 *   modules  → individual source files and node_modules entries
 *   entrypoints → named entry points (usually "main")
 *   namedChunkGroups → includes route chunks in Next.js/CRA builds
 */
import type { WebpackStatsInput } from "../types.js";
export interface NormalizedModule {
    /** Cleaned module path */
    path: string;
    /** Package name if this is a node_modules dependency */
    packageName: string | null;
    /** Nested package path (for deduplication detection) */
    nestedPath: string | null;
    /** Size in bytes */
    sizeBytes: number;
    /** Chunk IDs this module belongs to */
    chunkIds: (string | number)[];
    /** Whether any of those chunks is initial */
    isInitial: boolean;
}
export interface NormalizedChunk {
    id: string | number;
    names: string[];
    sizeBytes: number;
    initial: boolean;
    entry: boolean;
    assetFiles: string[];
}
export interface NormalizedStats {
    modules: NormalizedModule[];
    chunks: NormalizedChunk[];
    initialSizeBytes: number;
    asyncSizeBytes: number;
    totalSizeBytes: number;
    entryChunkIds: Set<string | number>;
}
/**
 * Parses and normalizes a webpack stats object.
 * Flattens concatenated modules, extracts package names from paths,
 * and computes initial vs async totals.
 */
export declare function parseWebpackStats(stats: WebpackStatsInput): NormalizedStats;
/**
 * Extracts the npm package name from a webpack module path.
 *
 * Examples:
 *   "./node_modules/react/index.js"                      → { packageName: "react", nestedPath: null }
 *   "./node_modules/@mui/material/Button.js"             → { packageName: "@mui/material", nestedPath: null }
 *   "./node_modules/pkg-a/node_modules/lodash/chunk.js"  → { packageName: "lodash", nestedPath: "pkg-a" }
 *   "./src/components/Button.tsx"                        → { packageName: null, nestedPath: null }
 */
export declare function extractPackageInfo(modulePath: string): {
    packageName: string | null;
    nestedPath: string | null;
};
//# sourceMappingURL=webpack-stats.d.ts.map