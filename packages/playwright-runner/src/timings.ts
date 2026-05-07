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
import type { NavigationTimings } from "./types";

// ─── Extractor ─────────────────────────────────────────────────────────────────

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
export async function extractNavigationTimings(page: Page): Promise<NavigationTimings> {
  try {
    // page.evaluate runs in browser context — cast return type explicitly
    // to avoid TS trying to resolve DOM interfaces in the Node compilation target.
    const timings = await page.evaluate(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const nav: any = performance.getEntriesByType("navigation")[0];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const paints: any[] = performance.getEntriesByType("paint");

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fp = paints.find((p: any) => p.name === "first-paint");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fcp = paints.find((p: any) => p.name === "first-contentful-paint");

      if (!nav) {
        // Fallback: legacy performance.timing (available in all browsers)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const timing: any = (performance as any).timing;
        const start: number = timing?.navigationStart ?? 0;
        return {
          domContentLoaded: (timing?.domContentLoadedEventEnd ?? 0) - start,
          load: (timing?.loadEventEnd ?? 0) - start,
          ttfb: (timing?.responseStart ?? 0) - start,
          firstPaint: fp ? Math.round(fp.startTime) : null,
          firstContentfulPaint: fcp ? Math.round(fcp.startTime) : null,
        };
      }

      return {
        domContentLoaded: Math.round(nav.domContentLoadedEventEnd ?? 0),
        load: Math.round(nav.loadEventEnd ?? 0),
        ttfb: Math.round(nav.responseStart ?? 0),
        firstPaint: fp ? Math.round(fp.startTime) : null,
        firstContentfulPaint: fcp ? Math.round(fcp.startTime) : null,
      };
    }) as NavigationTimings;

    return timings;
  } catch (err) {
    console.warn("[playwright-runner] Warning: failed to extract navigation timings:", err);
    return {
      domContentLoaded: 0,
      load: 0,
      ttfb: 0,
      firstPaint: null,
      firstContentfulPaint: null,
    };
  }
}

/**
 * Waits for the page to reach a stable state before measuring.
 * Tries networkidle first, falls back to load if it times out.
 *
 * @param page - The Playwright page to wait on
 * @param selector - Optional CSS selector to additionally wait for
 * @param waitMs - Additional ms to wait after stability is reached
 * @param timeout - Max time to wait in ms
 */
export async function waitForPageStability(
  page: Page,
  selector?: string,
  waitMs = 0,
  timeout = 10_000
): Promise<void> {
  // Wait for network to settle (fewer than 2 active connections for 500ms)
  await Promise.race([
    page.waitForLoadState("networkidle", { timeout }),
    page.waitForLoadState("load", { timeout }),
  ]).catch(() => {
    console.warn("[playwright-runner] Warning: page did not reach networkidle, continuing anyway");
  });

  // Wait for a specific selector if provided
  if (selector) {
    await page
      .waitForSelector(selector, { state: "visible", timeout })
      .catch(() => {
        console.warn(
          `[playwright-runner] Warning: selector "${selector}" not found within timeout`
        );
      });
  }

  // Additional settle time if requested
  if (waitMs > 0) {
    await page.waitForTimeout(waitMs);
  }
}
