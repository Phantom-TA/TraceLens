"use strict";
/**
 * @file config.ts
 * @description Configuration resolver for the lighthouse-runner module.
 * Merges user-supplied LighthouseRunnerConfig with all defaults to produce
 * a fully resolved ResolvedLighthouseConfig that the runner operates on.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveConfig = resolveConfig;
const path_1 = __importDefault(require("path"));
// ─── Defaults ──────────────────────────────────────────────────────────────────
const DEFAULT_PRESET = "desktop";
const DEFAULT_FORMATS = ["json", "html"];
const DEFAULT_RUNS = 1;
const DEFAULT_PORT = 0; // 0 = auto-assign an available port
const DEFAULT_TIMEOUT = 60_000;
const DEFAULT_LOCALE = "en";
const DEFAULT_CATEGORIES = [
    "performance",
    "accessibility",
    "best-practices",
    "seo",
];
const DEFAULT_CHROME_FLAGS = [];
// ─── Resolver ──────────────────────────────────────────────────────────────────
/**
 * Resolves a partial LighthouseRunnerConfig into a complete ResolvedLighthouseConfig.
 * Applies defaults for all omitted fields and normalises the output directory path.
 *
 * @param config - Partial configuration supplied by the caller
 * @returns Fully resolved configuration with every field populated
 * @throws {Error} If routes array is empty or missing
 * @throws {Error} If formats array is empty
 */
function resolveConfig(config) {
    if (!config.routes || config.routes.length === 0) {
        throw new Error("[lighthouse-runner] config.routes must contain at least one route.");
    }
    const formats = config.formats ?? DEFAULT_FORMATS;
    if (formats.length === 0) {
        throw new Error("[lighthouse-runner] config.formats must contain at least one format (\"json\" or \"html\").");
    }
    // Determine output directory: explicit > env > relative to package root
    const outputDir = config.outputDir ??
        process.env.TRACELENS_LIGHTHOUSE_DIR ??
        path_1.default.resolve(__dirname, "../../reports/lighthouse");
    return {
        routes: config.routes,
        preset: config.preset ?? DEFAULT_PRESET,
        formats,
        outputDir,
        runs: config.runs ?? DEFAULT_RUNS,
        chromePath: config.chromePath,
        chromeFlags: config.chromeFlags ?? DEFAULT_CHROME_FLAGS,
        port: config.port ?? DEFAULT_PORT,
        timeout: config.timeout ?? DEFAULT_TIMEOUT,
        categories: config.categories ?? DEFAULT_CATEGORIES,
        locale: config.locale ?? DEFAULT_LOCALE,
        skipSummary: config.skipSummary ?? false,
    };
}
