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
import { extractPackageInfo } from "./webpack-stats.js";
/**
 * Parses source-map-explorer output into normalized bundle data.
 */
export function parseSourceMapExplorer(input) {
    const results = input.results ?? [];
    return results.map((bundle) => normalizeSMEBundle(bundle));
}
function normalizeSMEBundle(bundle) {
    const packageSizes = new Map();
    let appCodeBytes = 0;
    for (const [filePath, { size }] of Object.entries(bundle.files)) {
        // Skip webpack overhead entries
        if (filePath === "[unmapped]" || filePath === "[EOLs]" || filePath === "[sourceMappingURL]") {
            continue;
        }
        const { packageName } = extractPackageInfo(filePath);
        if (packageName) {
            const current = packageSizes.get(packageName) ?? 0;
            packageSizes.set(packageName, current + size);
        }
        else {
            // App code — not a node_modules file
            appCodeBytes += size;
        }
    }
    // Heuristic: bundles named main/app/index/runtime are likely initial
    const isInitialGuess = /\b(main|app|index|runtime|vendor)\b/i.test(bundle.bundleName);
    return {
        bundleName: bundle.bundleName,
        totalBytes: bundle.totalBytes,
        isInitialGuess,
        packageSizes,
        appCodeBytes,
        unmappedBytes: bundle.unmappedBytes ?? 0,
    };
}
//# sourceMappingURL=source-map-explorer.js.map