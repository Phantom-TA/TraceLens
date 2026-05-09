/**
 * @file analyzers/routes.ts
 * @description Route chunk analysis.
 *
 * Identifies which chunks correspond to routes, how large they are,
 * and what's inside them. Supports Next.js, CRA, and Vite chunk naming.
 *
 * ROUTE CHUNK NAMING PATTERNS:
 *
 *   Next.js:
 *     pages/index → "/"
 *     pages/dashboard → "/dashboard"
 *     pages/profile/[id] → "/profile/[id]"
 *     app/dashboard/page → "/dashboard"
 *
 *   CRA / Vite:
 *     Chunks named after the lazy import: "Dashboard", "UserProfile"
 *     Numeric chunks (0.chunk.js, 1.chunk.js) — route-mapped via origins
 *
 *   Generic:
 *     Any non-initial, non-vendor chunk with a descriptive name
 */
import type { RouteChunk } from "../types.js";
import type { NormalizedChunk, NormalizedModule } from "../adapters/webpack-stats.js";
/**
 * Extracts route chunks from normalized webpack data.
 *
 * @param chunks   - Normalized webpack chunks
 * @param modules  - Normalized webpack modules (for dep attribution)
 * @returns        - Array of RouteChunk sorted by sizeKB desc
 */
export declare function extractRouteChunks(chunks: NormalizedChunk[], modules: NormalizedModule[]): RouteChunk[];
//# sourceMappingURL=routes.d.ts.map