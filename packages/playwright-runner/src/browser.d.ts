/**
 * @file browser.ts
 * @description Browser lifecycle management.
 *
 * Responsibilities:
 * - Launch and close a Chromium browser instance
 * - Create browser contexts with correct device emulation
 * - Apply network throttle conditions via CDP
 * - Isolate each route run in its own BrowserContext
 */
import { Browser, BrowserContext, CDPSession, Page } from "playwright";
import type { DeviceProfile, ResolvedRunnerConfig } from "./types.js";
/**
 * Launches a Chromium browser instance with the given configuration.
 *
 * @param config - Resolved runner configuration
 * @returns A Playwright Browser instance
 */
export declare function launchBrowser(config: ResolvedRunnerConfig): Promise<Browser>;
/**
 * Gracefully closes a browser instance.
 * Catches and logs errors rather than re-throwing so cleanup is always attempted.
 *
 * @param browser - The browser to close
 */
export declare function closeBrowser(browser: Browser): Promise<void>;
export interface ContextWithSession {
    context: BrowserContext;
    cdpSession: CDPSession | null;
    deviceProfile: DeviceProfile;
}
/**
 * Creates an isolated BrowserContext configured for the target device and network.
 * Each route run should use its own context so state doesn't leak between runs.
 *
 * @param browser - The parent browser instance
 * @param config - Resolved runner configuration
 * @param harPath - If provided, HAR recording is written to this path
 * @returns A BrowserContext + CDP session for throttling
 */
export declare function createContext(browser: Browser, config: ResolvedRunnerConfig, harPath?: string): Promise<ContextWithSession>;
/**
 * Closes a browser context and its associated CDP session safely.
 *
 * @param context - The BrowserContext to close
 * @param cdpSession - Optional CDP session to detach first
 */
export declare function closeContext(context: BrowserContext, cdpSession: CDPSession | null): Promise<void>;
/**
 * Creates a new page within the given context and configures it for audit use.
 * Disables service workers to ensure consistent network behavior.
 *
 * @param context - Parent browser context
 * @returns A configured Playwright Page
 */
export declare function createPage(context: BrowserContext): Promise<Page>;
//# sourceMappingURL=browser.d.ts.map