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
import { chromium, } from "playwright";
import { THROTTLE_CONDITIONS, resolveDeviceProfile } from "./config.js";
// ─── Browser Launch ────────────────────────────────────────────────────────────
/**
 * Launches a Chromium browser instance with the given configuration.
 *
 * @param config - Resolved runner configuration
 * @returns A Playwright Browser instance
 */
export async function launchBrowser(config) {
    return chromium.launch({
        headless: config.headless,
        args: config.chromiumArgs,
        // Ensure consistent rendering across environments
        ignoreDefaultArgs: ["--enable-automation"],
    });
}
/**
 * Gracefully closes a browser instance.
 * Catches and logs errors rather than re-throwing so cleanup is always attempted.
 *
 * @param browser - The browser to close
 */
export async function closeBrowser(browser) {
    try {
        await browser.close();
    }
    catch (err) {
        console.warn("[playwright-runner] Warning: failed to close browser gracefully:", err);
    }
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
export async function createContext(browser, config, harPath) {
    const deviceProfile = resolveDeviceProfile(config.device, config.viewport);
    const contextOptions = {
        viewport: deviceProfile.viewport,
        userAgent: deviceProfile.userAgent,
        isMobile: deviceProfile.isMobile,
        hasTouch: deviceProfile.hasTouch,
        deviceScaleFactor: deviceProfile.deviceScaleFactor,
        // Disable cache to get consistent first-load metrics
        bypassCSP: false,
        ignoreHTTPSErrors: false,
    };
    // Configure HAR recording at the context level if enabled
    if (config.har !== false && harPath) {
        contextOptions.recordHar = {
            path: harPath,
            content: config.har.content ?? "omit",
            ...(config.har.urlFilter
                ? { urlFilter: config.har.urlFilter }
                : {}),
        };
    }
    const context = await browser.newContext(contextOptions);
    // Set default timeouts
    context.setDefaultTimeout(config.waitTimeout);
    context.setDefaultNavigationTimeout(config.navigationTimeout);
    // Apply network throttle via CDP if not "none"
    let cdpSession = null;
    if (config.throttle !== "none") {
        cdpSession = await applyNetworkThrottle(context, config.throttle);
    }
    return { context, cdpSession, deviceProfile };
}
/**
 * Closes a browser context and its associated CDP session safely.
 *
 * @param context - The BrowserContext to close
 * @param cdpSession - Optional CDP session to detach first
 */
export async function closeContext(context, cdpSession) {
    try {
        if (cdpSession) {
            await cdpSession.detach().catch(() => void 0);
        }
        await context.close();
    }
    catch (err) {
        console.warn("[playwright-runner] Warning: failed to close context gracefully:", err);
    }
}
// ─── Network Throttle ──────────────────────────────────────────────────────────
/**
 * Applies CDP network emulation conditions to throttle bandwidth and latency.
 * Creates a new page temporarily to obtain a CDP session on the context,
 * then applies the conditions to all pages in the context.
 *
 * @param context - The BrowserContext to throttle
 * @param profile - The throttle profile to apply
 * @returns The CDPSession for cleanup on context close
 */
async function applyNetworkThrottle(context, profile) {
    const conditions = THROTTLE_CONDITIONS[profile];
    if (!conditions)
        return null;
    try {
        // Obtain CDP session via a new page (Playwright limitation — no direct context CDP)
        const page = await context.newPage();
        const cdpSession = await page.context().newCDPSession(page);
        await cdpSession.send("Network.enable");
        await cdpSession.send("Network.emulateNetworkConditions", conditions);
        await page.close();
        return cdpSession;
    }
    catch (err) {
        console.warn(`[playwright-runner] Warning: failed to apply throttle profile "${profile}":`, err);
        return null;
    }
}
// ─── Page Utilities ────────────────────────────────────────────────────────────
/**
 * Creates a new page within the given context and configures it for audit use.
 * Disables service workers to ensure consistent network behavior.
 *
 * @param context - Parent browser context
 * @returns A configured Playwright Page
 */
export async function createPage(context) {
    const page = await context.newPage();
    // Block service worker registrations to prevent caching interference
    await page.addInitScript(`
    Object.defineProperty(window.navigator, 'serviceWorker', {
      get: () => undefined,
    });
  `);
    return page;
}
//# sourceMappingURL=browser.js.map