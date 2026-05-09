/**
 * @file output-manager.ts
 * @description Manages file-system output structure for Lighthouse report artifacts.
 *
 * Directory layout per session:
 *   <outputDir>/
 *   └── <sessionId>/
 *       ├── session-summary.json       ← averaged results across all routes/runs
 *       └── <route-label>/
 *           ├── run-1/
 *           │   ├── report.json        ← raw Lighthouse JSON result
 *           │   └── report.html        ← rendered HTML report
 *           └── run-2/  (when runs > 1)
 *               ├── report.json
 *               └── report.html
 *
 * When runs === 1, the run-1/ sub-directory is omitted and artifacts are placed
 * directly in <route-label>/.
 */
/**
 * Sanitizes a URL or label into a safe directory name.
 * Strips protocol, replaces slashes and special chars with dashes.
 *
 * @example
 * slugifyRoute("https://example.com/dashboard") → "example.com-dashboard"
 */
export declare function slugifyRoute(urlOrLabel: string): string;
/**
 * Ensures a directory exists, creating it recursively if needed.
 * Idempotent — safe to call multiple times.
 */
export declare function ensureDir(dirPath: string): void;
/**
 * Writes an arbitrary string to disk, creating parent directories as needed.
 */
export declare function writeFile(filePath: string, content: string): void;
/**
 * Writes a JSON object to disk with 2-space indentation.
 */
export declare function writeJson(filePath: string, data: unknown): void;
/**
 * Returns the top-level session directory path.
 *
 * @param baseOutputDir - Root reports/lighthouse directory
 * @param sessionId     - Unique session identifier
 */
export declare function resolveSessionDir(baseOutputDir: string, sessionId: string): string;
/**
 * Returns the route-level directory path.
 * When runs > 1, each run gets its own `run-N` subdirectory.
 *
 * @param sessionDir - Parent session directory
 * @param routeSlug  - Slugified route label
 * @param runIndex   - 0-based run index (undefined → no run subdirectory)
 * @param totalRuns  - Total number of configured runs
 */
export declare function resolveRouteDir(sessionDir: string, routeSlug: string, runIndex: number, totalRuns: number): string;
/**
 * Returns the file paths for all Lighthouse report artifacts within a route dir.
 *
 * @param routeDir  - The resolved route (or route/run) directory
 * @param formats   - Output formats requested by the user
 */
export declare function resolveArtifactPaths(routeDir: string, formats: Array<"json" | "html">): {
    json: string | null;
    html: string | null;
};
/**
 * Creates the session directory and returns its absolute path.
 */
export declare function initSessionDir(baseOutputDir: string, sessionId: string): string;
/**
 * Creates the route (and optional run) directory and returns its absolute path.
 */
export declare function initRouteDir(sessionDir: string, routeSlug: string, runIndex: number, totalRuns: number): string;
//# sourceMappingURL=output-manager.d.ts.map