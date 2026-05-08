"use strict";
/**
 * @file screenshot.ts
 * @description Screenshot capture utilities for Playwright pages.
 *
 * Provides full-page and viewport screenshot capture with configurable
 * format, quality, and error handling. Returns null paths on failure
 * so the caller's result is always populated (never throws on screenshot fail).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.captureScreenshot = captureScreenshot;
exports.captureElementScreenshot = captureElementScreenshot;
// ─── Screenshot Capture ────────────────────────────────────────────────────────
/**
 * Captures a screenshot of the current page state and saves it to disk.
 *
 * Behavior:
 * - Full-page screenshots scroll the entire document height
 * - Waits for all images to load before capturing (networkidle)
 * - JPEG quality only applies when format is "jpeg"
 * - Returns a result object rather than throwing on failure
 *
 * @param page - The Playwright page to screenshot
 * @param screenshotPath - Absolute path to save the image
 * @param config - Resolved runner configuration
 * @returns ScreenshotResult with path and success status
 */
async function captureScreenshot(page, screenshotPath, config) {
    const { fullPage, format, quality } = config.screenshot;
    try {
        const options = {
            path: screenshotPath,
            fullPage,
            type: format,
            animations: "disabled", // Freeze animations for deterministic screenshots
            caret: "hide",
        };
        // Only apply quality for JPEG — PNG ignores this field
        if (format === "jpeg") {
            options.quality = quality;
        }
        await page.screenshot(options);
        return { screenshotPath, success: true };
    }
    catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("[playwright-runner] Failed to capture screenshot:", message);
        return { screenshotPath: null, success: false, error: message };
    }
}
/**
 * Captures a screenshot of a specific element matched by a CSS selector.
 * Useful for capturing above-the-fold LCP candidates specifically.
 *
 * @param page - The Playwright page
 * @param selector - CSS selector for the target element
 * @param screenshotPath - Absolute path to save the image
 * @param format - Image format ("png" | "jpeg")
 * @returns ScreenshotResult with path and success status
 */
async function captureElementScreenshot(page, selector, screenshotPath, format = "png") {
    try {
        const element = await page.locator(selector).first();
        await element.screenshot({
            path: screenshotPath,
            type: format,
            animations: "disabled",
        });
        return { screenshotPath, success: true };
    }
    catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[playwright-runner] Failed to capture element screenshot for "${selector}":`, message);
        return { screenshotPath: null, success: false, error: message };
    }
}
