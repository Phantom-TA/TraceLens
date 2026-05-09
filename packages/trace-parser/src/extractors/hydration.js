/**
 * @file extractors/hydration.ts
 * @description Framework hydration delay detection with confidence scoring.
 *
 * DETECTION STRATEGY:
 *   1. UserTiming marks (highest confidence — intentional instrumentation)
 *   2. LHR bootup-time framework script analysis
 *   3. Post-FCP large EvaluateScript heuristic (inferred)
 *
 * CONFIDENCE MODEL:
 *   user-timing:        0.90 (very high — explicit framework instrumentation)
 *   lhr-bootup:         0.65 (moderate — URL-based inference)
 *   post-fcp-scripting: 0.45 (low — behavioral inference only)
 *   inferred:           0.30 (very low — circumstantial evidence only)
 *
 * IMPORTANT: All detections are probabilistic. Never claim certainty.
 */
import { durToMs, tsToMs } from "../filters.js";
// ─── Framework UserTiming Marks ───────────────────────────────────────────────
const REACT_MARKS = ["ReactDOMHydrate", "ReactMount", "react::hydrate", "React Hydration", "ReactDOMRender"];
const NEXTJS_MARKS = ["Next.js-hydration", "nextjs-hydration", "__next_router", "NextRouter.change", "nextjs:"];
const VUE_MARKS = ["vue-component-mount", "vue-renderer", "Vue.mount", "vue:"];
const NUXT_MARKS = ["nuxt:hydrate", "nuxt-app", "nuxt.hydration"];
const ANGULAR_MARKS = ["Angular", "ng-component", "AngularBootstrap", "angular:"];
const ASTRO_MARKS = ["@astrojs", "astro:hydration", "astro-island", "astro:"];
const REMIX_MARKS = ["__remix", "RemixBrowser", "remix-browser"];
const SVELTEKIT_MARKS = ["sveltekit:start", "sveltekit:navigation", "__sveltekit"];
const SVELTE_MARKS = ["svelte-component", "svelte.mount", "svelte:"];
// ─── No-Hydration Sentinel ────────────────────────────────────────────────────
function noHydration() {
    return {
        detected: false,
        framework: null,
        startTime: null,
        endTime: null,
        durationMs: null,
        fcpToHydrationMs: null,
        confidence: 0,
        detectionMethod: "inferred",
        confidenceNote: null,
    };
}
// ─── Main Detection Entry Point ───────────────────────────────────────────────
export function detectHydration(events, renderer, fcpMs) {
    const { navigationStart } = renderer;
    const userTimingEvents = events.filter((ev) => ev.pid === renderer.pid &&
        (ev.cat?.includes("blink.user_timing") || ev.cat?.includes("blink,user_timing")));
    // Try each framework via UserTiming marks (highest confidence)
    const frameworkChecks = [
        [NEXTJS_MARKS, "next.js"],
        [REACT_MARKS, "react"],
        [NUXT_MARKS, "nuxt"],
        [VUE_MARKS, "vue"],
        [ANGULAR_MARKS, "angular"],
        [ASTRO_MARKS, "astro"],
        [REMIX_MARKS, "remix"],
        [SVELTEKIT_MARKS, "sveltekit"],
        [SVELTE_MARKS, "svelte"],
    ];
    for (const [marks, framework] of frameworkChecks) {
        const result = detectFromUserTimingMarks(userTimingEvents, marks, navigationStart, framework);
        if (result)
            return enrichWithFcp(result, fcpMs);
    }
    // Generic hydration mark (any "hydrat" keyword)
    const genericHydration = userTimingEvents.find((ev) => ev.name.toLowerCase().includes("hydrat"));
    if (genericHydration) {
        const startMs = tsToMs(genericHydration.ts, navigationStart);
        const durationMs = durToMs(genericHydration.dur ?? 0);
        return enrichWithFcp({
            detected: true,
            framework: "unknown",
            startTime: startMs,
            endTime: startMs + durationMs,
            durationMs: Math.round(durationMs),
            fcpToHydrationMs: null,
            confidence: 0.75,
            detectionMethod: "user-timing",
            confidenceNote: `Generic hydration UserTiming mark detected: "${genericHydration.name}"`,
        }, fcpMs);
    }
    // Post-FCP large script heuristic (behavioral inference)
    if (fcpMs !== null) {
        const postFcpResult = findLargePostFcpScript(events, renderer, fcpMs, navigationStart);
        if (postFcpResult)
            return enrichWithFcp(postFcpResult, fcpMs);
    }
    return noHydration();
}
// ─── LHR-Only Detection ────────────────────────────────────────────────────────
export function detectHydrationFromLHR(lhr, fcpMs) {
    if (!lhr.audits)
        return noHydration();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bootupItems = lhr.audits["bootup-time"]?.details?.items ?? [];
    const frameworkUrlMap = [
        [["/_next/", "_next/static"], "next.js"],
        [["react-dom", "react.production", "react.development"], "react"],
        [["/_nuxt/", "nuxt.js"], "nuxt"],
        [["vue.runtime", "vue.esm", "/vue@"], "vue"],
        [["@angular/", "angular.min"], "angular"],
        [["/_astro/", "@astrojs/"], "astro"],
        [["@remix-run/"], "remix"],
        [["/.svelte-kit/", "@sveltejs/kit"], "sveltekit"],
        [["svelte/internal", "svelte.js"], "svelte"],
    ];
    for (const item of bootupItems) {
        const url = (item.url ?? "").toLowerCase();
        const scriptMs = item.scripting ?? item.total ?? 0;
        if (scriptMs < 50)
            continue;
        for (const [patterns, framework] of frameworkUrlMap) {
            if (patterns.some((p) => url.includes(p))) {
                const note = `LHR bootup-time script "${item.url}" (${Math.round(scriptMs)}ms) matched ${framework} URL pattern`;
                const result = {
                    detected: true,
                    framework,
                    startTime: fcpMs,
                    endTime: fcpMs !== null ? fcpMs + scriptMs : null,
                    durationMs: Math.round(scriptMs),
                    fcpToHydrationMs: Math.round(scriptMs),
                    confidence: 0.65,
                    detectionMethod: "lhr-bootup",
                    confidenceNote: note,
                };
                return result;
            }
        }
    }
    return noHydration();
}
// ─── Helpers ───────────────────────────────────────────────────────────────────
function detectFromUserTimingMarks(events, marks, navigationStart, framework) {
    let startTs = Infinity, endTs = -Infinity, found = false;
    const matchedMarks = [];
    for (const ev of events) {
        if (!marks.some((m) => ev.name.toLowerCase().includes(m.toLowerCase())))
            continue;
        found = true;
        matchedMarks.push(ev.name);
        if (ev.ts < startTs)
            startTs = ev.ts;
        const evEnd = ev.ts + (ev.dur ?? 0);
        if (evEnd > endTs)
            endTs = evEnd;
    }
    if (!found)
        return null;
    const startMs = tsToMs(startTs, navigationStart);
    const endMs = tsToMs(endTs, navigationStart);
    const durationMs = Math.round(Math.max(0, endMs - startMs));
    return {
        detected: true,
        framework,
        startTime: startMs,
        endTime: endMs,
        durationMs,
        fcpToHydrationMs: null,
        confidence: 0.90,
        detectionMethod: "user-timing",
        confidenceNote: `High confidence (90%) — ${framework} UserTiming marks detected: ${matchedMarks.slice(0, 2).join(", ")}`,
    };
}
function enrichWithFcp(signal, fcpMs) {
    if (fcpMs !== null && signal.endTime !== null) {
        return { ...signal, fcpToHydrationMs: Math.max(0, Math.round(signal.endTime - fcpMs)) };
    }
    return signal;
}
function findLargePostFcpScript(events, renderer, fcpMs, navigationStart) {
    const fcpTs = navigationStart + fcpMs * 1000;
    // Look for large EvaluateScript events in the 3s window after FCP
    const candidates = events.filter((ev) => ev.pid === renderer.pid &&
        ev.tid === renderer.tid &&
        ev.ph === "X" &&
        ev.name === "EvaluateScript" &&
        ev.ts > fcpTs &&
        ev.ts < fcpTs + 3_000_000 && // within 3s of FCP
        (ev.dur ?? 0) > 100_000 // >100ms (lowered from 200ms for better coverage)
    );
    if (candidates.length === 0)
        return null;
    const largest = candidates.reduce((a, b) => ((b.dur ?? 0) > (a.dur ?? 0) ? b : a));
    const startMs = tsToMs(largest.ts, navigationStart);
    const durationMs = Math.round(durToMs(largest.dur ?? 0));
    const totalPostFcpMs = Math.round(candidates.reduce((s, ev) => s + durToMs(ev.dur ?? 0), 0));
    return {
        detected: true,
        framework: "unknown",
        startTime: startMs,
        endTime: startMs + durationMs,
        durationMs,
        fcpToHydrationMs: null,
        confidence: 0.45,
        detectionMethod: "post-fcp-scripting",
        confidenceNote: `Low-moderate confidence (45%) — ${candidates.length} large EvaluateScript event(s) detected after FCP (${totalPostFcpMs}ms total). Likely framework initialization or hydration.`,
    };
}
//# sourceMappingURL=hydration.js.map