/**
 * @file screenshot.ts
 * @description Screenshot capture utilities for Playwright pages.
 *
 * Provides full-page and viewport screenshot capture with configurable
 * format, quality, and error handling. Returns null paths on failure
 * so the caller's result is always populated (never throws on screenshot fail).
 */
import { Page } from "playwright";
import type { ResolvedRunnerConfig } from "./types.js";
export interface ScreenshotResult {
    /** Absolute path to the saved screenshot, null if capture failed */
    screenshotPath: string | null;
    /** Whether the screenshot was captured successfully */
    success: boolean;
    /** Error message if capture failed */
    error?: string;
}
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
export declare function captureScreenshot(page: Page, screenshotPath: string, config: ResolvedRunnerConfig): Promise<ScreenshotResult>;
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
export declare function captureElementScreenshot(page: Page, selector: string, screenshotPath: string, format?: "png" | "jpeg"): Promise<ScreenshotResult>;
//# sourceMappingURL=screenshot.d.ts.map