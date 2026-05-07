/**
 * @file types.ts
 * @description All TypeScript types and interfaces for the playwright-runner module.
 * These are the public contracts consumed by other TraceLens packages.
 */

// ─── Emulation ────────────────────────────────────────────────────────────────

/** Supported device emulation modes */
export type DeviceMode = "desktop" | "mobile" | "tablet";

/**
 * Viewport dimensions for custom overrides.
 * When provided, overrides the default dimensions of the selected DeviceMode.
 */
export interface ViewportConfig {
  width: number;
  height: number;
}

/**
 * Full device emulation profile.
 * Maps a DeviceMode to its default viewport and user-agent.
 */
export interface DeviceProfile {
  mode: DeviceMode;
  viewport: ViewportConfig;
  userAgent: string;
  isMobile: boolean;
  hasTouch: boolean;
  deviceScaleFactor: number;
}

// ─── Route Configuration ───────────────────────────────────────────────────────

/** Network throttle profiles */
export type ThrottleProfile = "4g" | "3g" | "none";

/** A single route/page to audit */
export interface RouteConfig {
  /** The full URL to navigate to */
  url: string;
  /** Optional human-readable label used in output filenames (auto-derived if omitted) */
  label?: string;
  /** Wait for this CSS selector before capturing (defaults to networkidle) */
  waitForSelector?: string;
  /** Additional wait time in ms after navigation settles */
  waitMs?: number;
}

// ─── Runner Configuration ──────────────────────────────────────────────────────

/** Screenshot capture options */
export interface ScreenshotOptions {
  /** Capture full scrollable page (default: true) */
  fullPage?: boolean;
  /** Image format (default: "png") */
  format?: "png" | "jpeg";
  /** JPEG quality 0–100 (only used when format is "jpeg") */
  quality?: number;
}

/** Playwright trace capture options */
export interface TraceOptions {
  /** Include screenshots in the trace (default: true) */
  screenshots?: boolean;
  /** Include network snapshots in the trace (default: true) */
  snapshots?: boolean;
  /** Include source files in the trace (default: false) */
  sources?: boolean;
}

/** HAR (HTTP Archive) capture options */
export interface HAROptions {
  /** Filter HAR entries to only include URLs matching this pattern */
  urlFilter?: string | RegExp;
  /** Include binary content bodies in HAR (default: false) */
  content?: "omit" | "embed" | "attach";
}

/**
 * Top-level configuration for a PlaywrightRunner session.
 * All fields have sensible defaults — only `routes` is required.
 */
export interface RunnerConfig {
  /** One or more URLs to audit in this run */
  routes: RouteConfig[];

  /** Device emulation mode (default: "desktop") */
  device?: DeviceMode;

  /** Override default viewport for the selected device */
  viewport?: ViewportConfig;

  /** Network throttle profile (default: "none") */
  throttle?: ThrottleProfile;

  /** Root directory where all output is written (default: "../../reports") */
  outputDir?: string;

  /** Screenshot capture settings */
  screenshot?: ScreenshotOptions;

  /** Playwright trace capture settings */
  trace?: TraceOptions | false;

  /** HAR capture settings (set to false to disable) */
  har?: HAROptions | false;

  /** Run browser in headless mode (default: true) */
  headless?: boolean;

  /**
   * Number of times to repeat each route audit and average.
   * Useful for reducing variance (default: 1).
   */
  runs?: number;

  /** Timeout for each route navigation in ms (default: 30000) */
  navigationTimeout?: number;

  /** Timeout for waiting for selectors/network in ms (default: 10000) */
  waitTimeout?: number;

  /** Additional Chromium launch args */
  chromiumArgs?: string[];
}

// ─── Output Artifacts ──────────────────────────────────────────────────────────

/** Paths to all captured artifacts for a single route run */
export interface RouteArtifacts {
  /** Directory where all artifacts for this route are stored */
  outputDir: string;
  /** Absolute path to the captured screenshot (if enabled) */
  screenshotPath: string | null;
  /** Absolute path to the Playwright trace .zip (if enabled) */
  tracePath: string | null;
  /** Absolute path to the HAR file (if enabled) */
  harPath: string | null;
}

/** Performance timing metrics captured during navigation */
export interface NavigationTimings {
  /** Time from navigationStart to domContentLoadedEventEnd (ms) */
  domContentLoaded: number;
  /** Time from navigationStart to loadEventEnd (ms) */
  load: number;
  /** Time to First Byte (ms) */
  ttfb: number;
  /** Time from navigationStart to first paint (ms), null if not available */
  firstPaint: number | null;
  /** Time from navigationStart to first contentful paint (ms), null if not available */
  firstContentfulPaint: number | null;
}

/** Full result for a single route audit */
export interface RouteResult {
  /** The route that was audited */
  route: RouteConfig;
  /** Resolved device profile used for this run */
  deviceProfile: DeviceProfile;
  /** ISO 8601 timestamp when the run started */
  startedAt: string;
  /** ISO 8601 timestamp when the run completed */
  completedAt: string;
  /** Total duration of this route audit in ms */
  durationMs: number;
  /** Navigation timing metrics */
  timings: NavigationTimings;
  /** All captured file artifacts */
  artifacts: RouteArtifacts;
  /** Whether all captures completed without error */
  success: boolean;
  /** Error message if the run failed */
  error?: string;
}

/** Full result for an entire PlaywrightRunner session */
export interface RunnerResult {
  /** ISO 8601 timestamp for the session */
  sessionId: string;
  /** Session start timestamp */
  startedAt: string;
  /** Session end timestamp */
  completedAt: string;
  /** Total session duration in ms */
  durationMs: number;
  /** Results for each route that was audited */
  routes: RouteResult[];
  /** Resolved configuration used for this session */
  config: ResolvedRunnerConfig;
  /** True if all routes completed successfully */
  success: boolean;
}

// ─── Internal / Resolved Types ─────────────────────────────────────────────────

/**
 * Fully resolved configuration after applying defaults.
 * Used internally by the runner — not part of the public input API.
 */
export interface ResolvedRunnerConfig {
  routes: RouteConfig[];
  device: DeviceMode;
  viewport: ViewportConfig;
  throttle: ThrottleProfile;
  outputDir: string;
  screenshot: Required<ScreenshotOptions>;
  trace: Required<TraceOptions> | false;
  har: HAROptions | false;
  headless: boolean;
  runs: number;
  navigationTimeout: number;
  waitTimeout: number;
  chromiumArgs: string[];
}
