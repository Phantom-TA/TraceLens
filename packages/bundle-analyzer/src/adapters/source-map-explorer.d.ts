/**
 * @file adapters/source-map-explorer.ts
 * @description Source-map-explorer JSON output parser.
 *
 * source-map-explorer gives precise per-file sizes by reading source maps.
 * It is complementary to webpack stats — more accurate sizes, but no
 * chunk relationship info.
 *
 * Run: source-map-explorer --json dist/*.js > sme.json
 */
import type { SourceMapExplorerInput } from "../types.js";
export interface SMENormalizedBundle {
    bundleName: string;
    totalBytes: number;
    isInitialGuess: boolean;
    packageSizes: Map<string, number>;
    appCodeBytes: number;
    unmappedBytes: number;
}
/**
 * Parses source-map-explorer output into normalized bundle data.
 */
export declare function parseSourceMapExplorer(input: SourceMapExplorerInput): SMENormalizedBundle[];
//# sourceMappingURL=source-map-explorer.d.ts.map