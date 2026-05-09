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
import type { DuplicatePackage } from "../types.js";
import type { NormalizedModule } from "../adapters/webpack-stats.js";
/**
 * Detects duplicate packages from normalized webpack modules.
 *
 * @param modules - Normalized webpack modules with package name + nested path info
 * @returns       - Array of DuplicatePackage sorted by wastedKB desc
 */
export declare function detectDuplicatePackages(modules: NormalizedModule[]): DuplicatePackage[];
//# sourceMappingURL=duplicates.d.ts.map