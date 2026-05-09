/**
 * @file timings.ts
 * @description Navigation timing extraction from the browser's Performance API.
 *
 * Executes JavaScript in the page context to collect the PerformanceNavigationTiming
 * and PerformancePaintTiming entries that are available after page load.
 *
 * All values are in milliseconds relative to navigationStart.
 */
import { Page } from "playwright";
import type { NavigationTimings } from "./types.js";
/**
 * Extracts navigation timing metrics from the page's Performance API.
 * Must be called after the page has fully loaded (load event fired).
 *
 * Uses `page.evaluate()` to run code in the browser context, so this
 * works regardless of how the page was navigated to.
 *
 * @param page - A Playwright page that has completed navigation
 * @returns NavigationTimings with all available metrics
 */
export declare function extractNavigationTimings(page: Page): Promise<NavigationTimings>;
/**
 * Waits for the page to reach a stable state before measuring.
 * Tries networkidle first, falls back to load if it times out.
 *
 * @param page - The Playwright page to wait on
 * @param selector - Optional CSS selector to additionally wait for
 * @param waitMs - Additional ms to wait after stability is reached
 * @param timeout - Max time to wait in ms
 */
export declare function waitForPageStability(page: Page, selector?: string, waitMs?: number, timeout?: number): Promise<void>;
//# sourceMappingURL=timings.d.ts.map