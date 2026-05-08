/**
 * @file analyzers/dependencies.ts
 * @description Largest dependency detection and classification.
 *
 * Groups all modules by their npm package name, sums their sizes,
 * classifies each package by performance impact category, and
 * flags known problematic packages with lighter alternatives.
 *
 * CLASSIFICATION PRIORITY:
 *   1. Category (framework, ads, analytics, chart, etc.)
 *   2. Whether it's in the initial bundle
 *   3. Whether a lighter alternative exists
 */
const MAX_DEPENDENCIES = 15;
/**
 * Known packages with their performance category and lighter alternatives.
 * Checked via prefix match — so "moment" matches "moment", "moment-timezone", etc.
 */
const PACKAGE_INTEL = {
    // Framework
    "react": { category: "framework", alternative: null },
    "react-dom": { category: "framework", alternative: null },
    "vue": { category: "framework", alternative: null },
    "@angular/core": { category: "framework", alternative: null },
    "next": { category: "framework", alternative: null },
    "svelte": { category: "framework", alternative: null },
    // UI Libraries (heavy)
    "@mui/material": { category: "ui-library", alternative: "shadcn/ui or radix-ui" },
    "@mui/icons": { category: "ui-library", alternative: "@mui/icons-material (tree-shake)" },
    "antd": { category: "ui-library", alternative: "Use selective imports" },
    "semantic-ui": { category: "ui-library", alternative: "tailwindcss" },
    "@chakra-ui": { category: "ui-library", alternative: null },
    "bootstrap": { category: "ui-library", alternative: "tailwindcss" },
    "mantine": { category: "ui-library", alternative: null },
    // Charts (almost always oversized in initial bundle)
    "chart.js": { category: "chart-library", alternative: "lightweight-charts or victory" },
    "recharts": { category: "chart-library", alternative: "lightweight-charts" },
    "d3": { category: "chart-library", alternative: "Use d3-scale + d3-shape only" },
    "highcharts": { category: "chart-library", alternative: "chart.js" },
    "echarts": { category: "chart-library", alternative: "lightweight-charts" },
    "apexcharts": { category: "chart-library", alternative: "lightweight-charts" },
    "plotly.js": { category: "chart-library", alternative: "chart.js" },
    "victory": { category: "chart-library", alternative: null },
    "nivo": { category: "chart-library", alternative: "recharts" },
    // Analytics (should never be in initial bundle)
    "google-analytics": { category: "analytics", alternative: "Load async after hydration" },
    "@segment/analytics": { category: "analytics", alternative: "Load async" },
    "mixpanel-browser": { category: "analytics", alternative: "Load async" },
    "amplitude-js": { category: "analytics", alternative: "Load async" },
    "posthog-js": { category: "analytics", alternative: "Load async" },
    "hotjar": { category: "analytics", alternative: "Load async" },
    "fullstory": { category: "analytics", alternative: "Load async" },
    // Ads (should never be in initial bundle)
    "googletag": { category: "ads", alternative: "Load async" },
    "pubads": { category: "ads", alternative: "Load async" },
    // Utilities (often not tree-shaken)
    "lodash": { category: "utility", alternative: "lodash-es with tree-shaking or native methods" },
    "lodash-es": { category: "utility", alternative: null },
    "underscore": { category: "utility", alternative: "lodash-es or native methods" },
    "ramda": { category: "utility", alternative: "Native methods or just-* utilities" },
    "rxjs": { category: "utility", alternative: null },
    // Date libraries (moment.js is the classic offender)
    "moment": { category: "date-library", alternative: "date-fns or dayjs (much smaller)" },
    "moment-timezone": { category: "date-library", alternative: "dayjs/plugin/timezone" },
    "date-fns": { category: "date-library", alternative: null },
    "dayjs": { category: "date-library", alternative: null },
    "luxon": { category: "date-library", alternative: "dayjs" },
    // Rich text editors
    "quill": { category: "rich-text", alternative: "Lazy load on demand" },
    "draft-js": { category: "rich-text", alternative: "Lazy load on demand" },
    "slate": { category: "rich-text", alternative: "Lazy load on demand" },
    "@tiptap/core": { category: "rich-text", alternative: "Lazy load on demand" },
    // Video
    "video.js": { category: "video-player", alternative: "Lazy load on demand" },
    "plyr": { category: "video-player", alternative: "Lazy load on demand" },
    // Maps
    "leaflet": { category: "maps", alternative: "Lazy load on demand" },
    "@googlemaps": { category: "maps", alternative: "Lazy load on demand" },
    "mapbox-gl": { category: "maps", alternative: "Lazy load on demand" },
    "react-map-gl": { category: "maps", alternative: "Lazy load on demand" },
    // State management
    "redux": { category: "state", alternative: "zustand (smaller)" },
    "react-redux": { category: "state", alternative: null },
    "mobx": { category: "state", alternative: "zustand" },
    "recoil": { category: "state", alternative: "jotai" },
    "zustand": { category: "state", alternative: null },
    "jotai": { category: "state", alternative: null },
    // Icons (often huge when not tree-shaken)
    "@fortawesome": { category: "icons", alternative: "Use SVG sprites or tree-shake" },
    "react-icons": { category: "icons", alternative: "Import individually: react-icons/hi" },
    "@heroicons": { category: "icons", alternative: null },
    "lucide-react": { category: "icons", alternative: null },
    // Animations
    "framer-motion": { category: "animations", alternative: "CSS animations or auto-animate" },
    "gsap": { category: "animations", alternative: "CSS animations" },
    "anime": { category: "animations", alternative: "CSS animations" },
    "lottie-web": { category: "animations", alternative: "CSS animations" },
};
// ─── Main Extractor ───────────────────────────────────────────────────────────
/**
 * Extracts and classifies the largest dependencies from normalized modules.
 *
 * @param modules     - Normalized webpack modules
 * @param totalBytes  - Total bundle size (for percentage calculation)
 * @returns           - Array of BundleDependency sorted by sizeKB desc
 */
export function extractLargestDependencies(modules, totalBytes) {
    // Group by package name
    const packageMap = new Map();
    for (const mod of modules) {
        if (!mod.packageName)
            continue;
        const existing = packageMap.get(mod.packageName) ?? { bytes: 0, initial: false };
        packageMap.set(mod.packageName, {
            bytes: existing.bytes + mod.sizeBytes,
            initial: existing.initial || mod.isInitial,
        });
    }
    const total = totalBytes > 0 ? totalBytes : 1;
    const results = [];
    for (const [name, { bytes, initial }] of packageMap) {
        const sizeKB = bytesToKB(bytes);
        const intel = lookupIntel(name);
        results.push({
            name,
            sizeKB,
            percentage: Math.round((bytes / total) * 1000) / 10,
            initial,
            category: intel.category,
            hasLighterAlternative: intel.alternative !== null,
            alternative: intel.alternative,
        });
    }
    return results
        .sort((a, b) => b.sizeKB - a.sizeKB)
        .slice(0, MAX_DEPENDENCIES);
}
/**
 * Computes the initial bundle composition breakdown.
 */
export function computeInitialComposition(modules, initialSizeBytes, deps) {
    let frameworkBytes = 0;
    let thirdPartyBytes = 0;
    let appCodeBytes = 0;
    const notableInitialDeps = [];
    const NOTABLE_CATEGORIES = ["chart-library", "analytics", "ads", "ui-library", "date-library"];
    for (const mod of modules) {
        if (!mod.isInitial)
            continue;
        if (!mod.packageName) {
            appCodeBytes += mod.sizeBytes;
        }
        else {
            const intel = lookupIntel(mod.packageName);
            if (intel.category === "framework") {
                frameworkBytes += mod.sizeBytes;
            }
            else {
                thirdPartyBytes += mod.sizeBytes;
            }
        }
    }
    for (const dep of deps) {
        if (dep.initial && NOTABLE_CATEGORIES.includes(dep.category)) {
            notableInitialDeps.push(`${dep.name} (${dep.sizeKB}KB, ${dep.category})`);
        }
    }
    const accounted = frameworkBytes + thirdPartyBytes + appCodeBytes;
    const unknownBytes = Math.max(0, initialSizeBytes - accounted);
    return {
        totalSizeKB: bytesToKB(initialSizeBytes),
        frameworkKB: bytesToKB(frameworkBytes),
        thirdPartyKB: bytesToKB(thirdPartyBytes),
        appCodeKB: bytesToKB(appCodeBytes),
        unknownKB: bytesToKB(unknownBytes),
        notableInitialDeps,
    };
}
// ─── Helpers ───────────────────────────────────────────────────────────────────
function lookupIntel(packageName) {
    // Exact match first
    if (PACKAGE_INTEL[packageName])
        return PACKAGE_INTEL[packageName];
    // Prefix match (handles scoped packages and sub-paths)
    for (const [key, intel] of Object.entries(PACKAGE_INTEL)) {
        if (packageName.startsWith(key))
            return intel;
    }
    return { category: "other", alternative: null };
}
export function bytesToKB(bytes) {
    return Math.round((bytes / 1024) * 10) / 10;
}
