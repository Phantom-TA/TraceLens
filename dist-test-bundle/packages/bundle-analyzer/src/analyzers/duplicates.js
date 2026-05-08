/**
 * @file analyzers/duplicates.ts
 * @description Duplicate package detection engine.
 *
 * WHAT IS A DUPLICATE:
 *   When the same npm package appears in multiple locations in node_modules,
 *   it means the same code is bundled multiple times. This happens when:
 *     - Two packages depend on incompatible semver ranges of the same library
 *     - yarn/npm failed to hoist a shared dependency
 *     - A monorepo hasn't properly deduped shared packages
 *
 * DETECTION STRATEGY:
 *   Scan all module paths for nested node_modules patterns:
 *     node_modules/lodash/          → lodash (hoisted, normal)
 *     node_modules/pkg-a/node_modules/lodash/  → lodash (nested copy!)
 *
 *   Group by package name. Any package with >1 location path = duplicate.
 *
 * WASTED SIZE CALCULATION:
 *   wastedKB = sum of all copies - largest copy
 *   (i.e. how much we'd save by deduplicating to one copy)
 */
import { bytesToKB } from "./dependencies.js";
const MAX_DUPLICATES = 10;
/**
 * Detects duplicate packages from normalized webpack modules.
 *
 * @param modules - Normalized webpack modules with package name + nested path info
 * @returns       - Array of DuplicatePackage sorted by wastedKB desc
 */
export function detectDuplicatePackages(modules) {
    // Map: packageName → Map<modulePath, { bytes, nestedPath }>
    const packageInstances = new Map();
    for (const mod of modules) {
        if (!mod.packageName)
            continue;
        // Build a canonical location key:
        // For "node_modules/react/index.js" → "node_modules/react"
        // For "node_modules/pkg-a/node_modules/react/index.js" → "node_modules/pkg-a/node_modules/react"
        const locationKey = extractLocationKey(mod.path, mod.packageName);
        if (!locationKey)
            continue;
        if (!packageInstances.has(mod.packageName)) {
            packageInstances.set(mod.packageName, new Map());
        }
        const locations = packageInstances.get(mod.packageName);
        const existing = locations.get(locationKey) ?? { bytes: 0, nestedPath: mod.nestedPath };
        locations.set(locationKey, {
            bytes: existing.bytes + mod.sizeBytes,
            nestedPath: mod.nestedPath,
        });
    }
    const duplicates = [];
    for (const [packageName, locations] of packageInstances) {
        if (locations.size < 2)
            continue; // Only one location = no duplicate
        const instances = [];
        let maxSizeKB = 0;
        let totalSizeKB = 0;
        for (const [path, { bytes, nestedPath }] of locations) {
            const sizeKB = bytesToKB(bytes);
            instances.push({
                modulePath: nestedPath ? `via ${nestedPath}` : "hoisted",
                version: extractVersionFromPath(path),
                sizeKB,
            });
            totalSizeKB += sizeKB;
            if (sizeKB > maxSizeKB)
                maxSizeKB = sizeKB;
        }
        const wastedKB = Math.round((totalSizeKB - maxSizeKB) * 10) / 10;
        duplicates.push({
            name: packageName,
            instances: instances.sort((a, b) => b.sizeKB - a.sizeKB),
            wastedKB,
            severity: wastedKB > 50 ? "high" : wastedKB > 20 ? "medium" : "low",
        });
    }
    return duplicates
        .sort((a, b) => b.wastedKB - a.wastedKB)
        .slice(0, MAX_DUPLICATES);
}
// ─── Helpers ───────────────────────────────────────────────────────────────────
/**
 * Extracts a canonical location key for a module path.
 * The key represents the node_modules directory the package lives in.
 *
 * "./node_modules/react/cjs/react.production.min.js"
 *   → "node_modules/react"
 *
 * "./node_modules/pkg-a/node_modules/react/index.js"
 *   → "node_modules/pkg-a/node_modules/react"
 */
function extractLocationKey(modulePath, packageName) {
    // Find the last occurrence of the package in the path
    const escapedName = packageName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(`node_modules\\/${escapedName}`);
    const match = modulePath.match(pattern);
    if (!match)
        return null;
    const idx = modulePath.indexOf(match[0]);
    if (idx === -1)
        return null;
    return modulePath.slice(0, idx + match[0].length);
}
/**
 * Attempts to extract a semver version from a module path by looking
 * for a package.json version in the path hierarchy. Since we only have
 * the module path string, we use the nested path as a proxy for "version context".
 * Returns null if not determinable.
 */
function extractVersionFromPath(path) {
    // Some bundlers include version in virtual module paths: "lodash@4.17.21"
    const versionMatch = path.match(/@(\d+\.\d+\.\d+)/);
    if (versionMatch)
        return versionMatch[1] ?? null;
    return null;
}
