/**
 * @file output-manager.ts
 * @description Manages the file-system output structure for runner artifacts.
 *
 * Directory layout per session:
 *   <outputDir>/
 *   └── <sessionId>/
 *       ├── session.json              ← full RunnerResult written at end
 *       └── <route-label>/
 *           ├── screenshot.png
 *           ├── trace.zip
 *           └── network.har
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
 *
 * @param dirPath - Absolute path to the directory
 */
export declare function ensureDir(dirPath: string): void;
/**
 * Writes a JSON object to disk with pretty formatting.
 *
 * @param filePath - Absolute path to write
 * @param data - Any JSON-serializable object
 */
export declare function writeJson(filePath: string, data: unknown): void;
/**
 * Resolves the session output directory path.
 * Does NOT create it — call ensureDir() separately.
 *
 * @param baseOutputDir - Root reports directory
 * @param sessionId - Unique session identifier
 */
export declare function resolveSessionDir(baseOutputDir: string, sessionId: string): string;
/**
 * Resolves the route-level output directory path.
 * Does NOT create it — call ensureDir() separately.
 *
 * @param sessionDir - The session directory
 * @param routeSlug - Slugified route label
 * @param runIndex - Run index when runs > 1 (omitted for single runs)
 */
export declare function resolveRouteDir(sessionDir: string, routeSlug: string, runIndex?: number): string;
/**
 * Resolves all artifact file paths for a given route directory.
 * These paths are used for both writing artifacts and populating RouteArtifacts.
 *
 * @param routeDir - The route output directory
 * @param screenshotFormat - Image format ("png" | "jpeg")
 */
export declare function resolveArtifactPaths(routeDir: string, screenshotFormat: "png" | "jpeg"): {
    screenshot: string;
    trace: string;
    har: string;
    session: string;
};
/**
 * Initializes a session directory and returns its path.
 * Creates the directory synchronously so it's ready before any page runs.
 *
 * @param baseOutputDir - Root reports directory
 * @param sessionId - Unique session identifier
 * @returns Absolute path to the created session directory
 */
export declare function initSessionDir(baseOutputDir: string, sessionId: string): string;
/**
 * Initializes a route output directory and returns its path.
 *
 * @param sessionDir - Parent session directory
 * @param routeSlug - Slugified route label
 * @param runIndex - Optional run index for multi-run sessions
 * @returns Absolute path to the created route directory
 */
export declare function initRouteDir(sessionDir: string, routeSlug: string, runIndex?: number): string;
//# sourceMappingURL=output-manager.d.ts.map