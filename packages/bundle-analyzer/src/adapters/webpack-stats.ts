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

import type {
  WebpackAsset,
  WebpackChunk,
  WebpackModule,
  WebpackStatsInput,
} from "../types.js";

// ─── Normalized Internal Representation ───────────────────────────────────────

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

// ─── Parser ────────────────────────────────────────────────────────────────────

/**
 * Parses and normalizes a webpack stats object.
 * Flattens concatenated modules, extracts package names from paths,
 * and computes initial vs async totals.
 */
export function parseWebpackStats(stats: WebpackStatsInput): NormalizedStats {
  // Build chunk lookup map
  const chunkMap = buildChunkMap(stats.chunks ?? []);
  const initialChunkIds = new Set<string | number>();
  const entryChunkIds = new Set<string | number>();

  for (const chunk of chunkMap.values()) {
    if (chunk.initial) initialChunkIds.add(chunk.id);
    if (chunk.entry) entryChunkIds.add(chunk.id);
  }

  // Flatten all modules (including nested concatenated modules)
  const rawModules = flattenModules(stats.modules ?? []);

  // Normalize each module
  const modules: NormalizedModule[] = rawModules.map((m) => {
    const chunkIds = (m.chunks ?? []) as (string | number)[];
    const isInitial = chunkIds.some((id) => initialChunkIds.has(id));
    const { packageName, nestedPath } = extractPackageInfo(m.name);

    return {
      path: m.name,
      packageName,
      nestedPath,
      sizeBytes: m.size,
      chunkIds,
      isInitial,
    };
  });

  // Normalize chunks
  const chunks: NormalizedChunk[] = (stats.chunks ?? []).map((c) => ({
    id: c.id,
    names: c.names,
    sizeBytes: c.size,
    initial: c.initial,
    entry: c.entry,
    assetFiles: c.files ?? [],
  }));

  // Also parse namedChunkGroups as additional chunk metadata
  if (stats.namedChunkGroups) {
    for (const [name, group] of Object.entries(stats.namedChunkGroups)) {
      for (const chunkId of group.chunks) {
        const chunk = chunkMap.get(chunkId);
        if (chunk && !chunk.names.includes(name)) {
          chunk.names.push(name);
        }
      }
    }
  }

  // Compute size totals from assets (more accurate than chunk sizes)
  let initialSizeBytes = 0;
  let asyncSizeBytes = 0;

  for (const chunk of chunks) {
    if (chunk.initial) {
      initialSizeBytes += chunk.sizeBytes;
    } else {
      asyncSizeBytes += chunk.sizeBytes;
    }
  }

  // Fallback: compute from assets if chunks have no sizes
  if (initialSizeBytes === 0 && stats.assets) {
    for (const asset of stats.assets) {
      if (isJsAsset(asset.name)) {
        // Check if asset belongs to an initial chunk
        const assetChunkIds = asset.chunks ?? [];
        const assetIsInitial = assetChunkIds.some((id) => initialChunkIds.has(id as string | number));
        if (assetIsInitial) {
          initialSizeBytes += asset.size;
        } else {
          asyncSizeBytes += asset.size;
        }
      }
    }
  }

  return {
    modules,
    chunks,
    initialSizeBytes,
    asyncSizeBytes,
    totalSizeBytes: initialSizeBytes + asyncSizeBytes,
    entryChunkIds,
  };
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function buildChunkMap(chunks: WebpackChunk[]): Map<string | number, WebpackChunk> {
  const map = new Map<string | number, WebpackChunk>();
  for (const chunk of chunks) {
    map.set(chunk.id, chunk);
  }
  return map;
}

/**
 * Flattens nested concatenated modules into a flat array.
 * Webpack can nest modules inside "concatenated" modules for scope hoisting.
 */
function flattenModules(modules: WebpackModule[]): WebpackModule[] {
  const flat: WebpackModule[] = [];
  for (const m of modules) {
    if (m.modules && m.modules.length > 0) {
      // This is a concatenated module — use children for size attribution
      flat.push(...flattenModules(m.modules));
    } else {
      flat.push(m);
    }
  }
  return flat;
}

/**
 * Extracts the npm package name from a webpack module path.
 *
 * Examples:
 *   "./node_modules/react/index.js"                      → { packageName: "react", nestedPath: null }
 *   "./node_modules/@mui/material/Button.js"             → { packageName: "@mui/material", nestedPath: null }
 *   "./node_modules/pkg-a/node_modules/lodash/chunk.js"  → { packageName: "lodash", nestedPath: "pkg-a" }
 *   "./src/components/Button.tsx"                        → { packageName: null, nestedPath: null }
 */
export function extractPackageInfo(modulePath: string): {
  packageName: string | null;
  nestedPath: string | null;
} {
  // Find all node_modules segments
  const nodeModulesPattern = /node_modules\/((?:@[^/]+\/[^/]+)|[^/]+)/g;
  const matches: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = nodeModulesPattern.exec(modulePath)) !== null) {
    if (match[1]) matches.push(match[1]);
  }

  if (matches.length === 0) {
    return { packageName: null, nestedPath: null };
  }

  // Last match is the actual package, preceding ones are the nesting path
  const packageName = matches[matches.length - 1] ?? null;
  const nestedPath = matches.length > 1 ? matches.slice(0, -1).join(" > ") : null;

  return { packageName, nestedPath };
}

function isJsAsset(name: string): boolean {
  return name.endsWith(".js") && !name.endsWith(".map");
}
