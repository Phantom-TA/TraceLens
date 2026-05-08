"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.slugifyRoute = slugifyRoute;
exports.ensureDir = ensureDir;
exports.writeFile = writeFile;
exports.writeJson = writeJson;
exports.resolveSessionDir = resolveSessionDir;
exports.resolveRouteDir = resolveRouteDir;
exports.resolveArtifactPaths = resolveArtifactPaths;
exports.initSessionDir = initSessionDir;
exports.initRouteDir = initRouteDir;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
// ─── Slug Helpers ──────────────────────────────────────────────────────────────
/**
 * Sanitizes a URL or label into a safe directory name.
 * Strips protocol, replaces slashes and special chars with dashes.
 *
 * @example
 * slugifyRoute("https://example.com/dashboard") → "example.com-dashboard"
 */
function slugifyRoute(urlOrLabel) {
    return urlOrLabel
        .replace(/^https?:\/\//, "")
        .replace(/[/?#&=:]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .replace(/-{2,}/g, "-")
        .toLowerCase()
        .slice(0, 80); // cap for filesystem safety
}
// ─── Directory Helpers ─────────────────────────────────────────────────────────
/**
 * Ensures a directory exists, creating it recursively if needed.
 * Idempotent — safe to call multiple times.
 */
function ensureDir(dirPath) {
    fs_1.default.mkdirSync(dirPath, { recursive: true });
}
/**
 * Writes an arbitrary string to disk, creating parent directories as needed.
 */
function writeFile(filePath, content) {
    ensureDir(path_1.default.dirname(filePath));
    fs_1.default.writeFileSync(filePath, content, "utf-8");
}
/**
 * Writes a JSON object to disk with 2-space indentation.
 */
function writeJson(filePath, data) {
    writeFile(filePath, JSON.stringify(data, null, 2));
}
// ─── Path Resolvers ────────────────────────────────────────────────────────────
/**
 * Returns the top-level session directory path.
 *
 * @param baseOutputDir - Root reports/lighthouse directory
 * @param sessionId     - Unique session identifier
 */
function resolveSessionDir(baseOutputDir, sessionId) {
    return path_1.default.join(baseOutputDir, sessionId);
}
/**
 * Returns the route-level directory path.
 * When runs > 1, each run gets its own `run-N` subdirectory.
 *
 * @param sessionDir - Parent session directory
 * @param routeSlug  - Slugified route label
 * @param runIndex   - 0-based run index (undefined → no run subdirectory)
 * @param totalRuns  - Total number of configured runs
 */
function resolveRouteDir(sessionDir, routeSlug, runIndex, totalRuns) {
    const routeBase = path_1.default.join(sessionDir, routeSlug);
    if (totalRuns <= 1) {
        return routeBase;
    }
    return path_1.default.join(routeBase, `run-${runIndex + 1}`);
}
/**
 * Returns the file paths for all Lighthouse report artifacts within a route dir.
 *
 * @param routeDir  - The resolved route (or route/run) directory
 * @param formats   - Output formats requested by the user
 */
function resolveArtifactPaths(routeDir, formats) {
    return {
        json: formats.includes("json") ? path_1.default.join(routeDir, "report.json") : null,
        html: formats.includes("html") ? path_1.default.join(routeDir, "report.html") : null,
    };
}
// ─── Initializers ──────────────────────────────────────────────────────────────
/**
 * Creates the session directory and returns its absolute path.
 */
function initSessionDir(baseOutputDir, sessionId) {
    const dir = resolveSessionDir(baseOutputDir, sessionId);
    ensureDir(dir);
    return dir;
}
/**
 * Creates the route (and optional run) directory and returns its absolute path.
 */
function initRouteDir(sessionDir, routeSlug, runIndex, totalRuns) {
    const dir = resolveRouteDir(sessionDir, routeSlug, runIndex, totalRuns);
    ensureDir(dir);
    return dir;
}
