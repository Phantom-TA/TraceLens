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
import { bytesToKB } from "./dependencies.js";
const MAX_ROUTE_CHUNKS = 10;
/**
 * Extracts route chunks from normalized webpack data.
 *
 * @param chunks   - Normalized webpack chunks
 * @param modules  - Normalized webpack modules (for dep attribution)
 * @returns        - Array of RouteChunk sorted by sizeKB desc
 */
export function extractRouteChunks(chunks, modules) {
    const routeChunks = [];
    // Build module lookup: chunkId → modules
    const chunkModuleMap = new Map();
    for (const mod of modules) {
        for (const chunkId of mod.chunkIds) {
            if (!chunkModuleMap.has(chunkId))
                chunkModuleMap.set(chunkId, []);
            chunkModuleMap.get(chunkId).push(mod);
        }
    }
    for (const chunk of chunks) {
        // Skip tiny chunks (< 5KB — runtime, manifest chunks)
        if (bytesToKB(chunk.sizeBytes) < 5)
            continue;
        // Try to interpret the chunk as a route
        const routePath = inferRoutePath(chunk.names);
        if (!routePath)
            continue;
        // Get the top dependencies in this chunk
        const chunkMods = chunkModuleMap.get(chunk.id) ?? [];
        const depSizes = new Map();
        for (const mod of chunkMods) {
            if (!mod.packageName)
                continue;
            depSizes.set(mod.packageName, (depSizes.get(mod.packageName) ?? 0) + mod.sizeBytes);
        }
        const topDeps = [...depSizes.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, bytes]) => ({ name, sizeKB: bytesToKB(bytes) }));
        routeChunks.push({
            route: routePath,
            chunkName: chunk.names[0] ?? String(chunk.id),
            sizeKB: bytesToKB(chunk.sizeBytes),
            initial: chunk.initial,
            async: !chunk.initial,
            topDependencies: topDeps,
        });
    }
    return routeChunks
        .sort((a, b) => b.sizeKB - a.sizeKB)
        .slice(0, MAX_ROUTE_CHUNKS);
}
// ─── Route Path Inference ──────────────────────────────────────────────────────
/**
 * Tries to infer a URL route path from webpack chunk names.
 * Returns null if this doesn't look like a route chunk.
 */
function inferRoutePath(names) {
    for (const name of names) {
        const route = parseChunkName(name);
        if (route)
            return route;
    }
    return null;
}
function parseChunkName(name) {
    if (!name)
        return null;
    // Next.js pages directory: "pages/dashboard/index" → "/dashboard"
    if (name.startsWith("pages/")) {
        const path = name.slice("pages/".length);
        if (path === "index" || path === "_app" || path === "_document")
            return null;
        return "/" + path.replace(/\/index$/, "").replace(/\[([^\]]+)\]/g, ":$1");
    }
    // Next.js app directory: "app/dashboard/page" → "/dashboard"
    if (name.startsWith("app/") && name.endsWith("/page")) {
        const path = name.slice("app/".length, -"/page".length);
        return "/" + path;
    }
    // Route-like names: "/dashboard", "/profile/:id"
    if (name.startsWith("/")) {
        return name;
    }
    // PascalCase component names that look like routes
    // "Dashboard", "UserProfile", "SettingsPage" → "/dashboard", "/user-profile"
    if (/^[A-Z][A-Za-z0-9]+Page$/.test(name)) {
        return "/" + name.replace(/Page$/, "").replace(/([A-Z])/g, (m, l, i) => i === 0 ? l.toLowerCase() : "-" + l.toLowerCase());
    }
    // Vite-style chunk names with route hints
    if (name.includes("-") && !name.startsWith("vendor") && !name.startsWith("runtime")) {
        // "dashboard-route" → "/dashboard"
        const cleaned = name.replace(/-route$|-chunk$|-lazy$/, "");
        if (cleaned.length > 2 && !/^\d/.test(cleaned)) {
            return "/" + cleaned;
        }
    }
    return null;
}
