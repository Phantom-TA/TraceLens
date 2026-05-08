"use strict";
/**
 * @file extractors/hydration.ts
 * @description React / Next.js hydration delay detection.
 *
 * Detects framework hydration via User Timing marks and post-FCP scripting.
 * The "interaction gap" = time from FCP to end of hydration.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectHydration = detectHydration;
exports.detectHydrationFromLHR = detectHydrationFromLHR;
const filters_js_1 = require("../filters.js");
const REACT_MARKS = ["ReactDOMHydrate", "ReactMount", "react::hydrate", "React Hydration"];
const NEXTJS_MARKS = ["Next.js-hydration", "nextjs-hydration", "__next_router", "NextRouter.change"];
const VUE_MARKS = ["vue-component-mount", "vue-renderer"];
function detectHydration(events, renderer, fcpMs) {
    const { navigationStart } = renderer;
    const userTimingEvents = events.filter((ev) => ev.pid === renderer.pid &&
        (ev.cat?.includes("blink.user_timing") || ev.cat?.includes("blink,user_timing")));
    const reactResult = detectFrameworkHydration(userTimingEvents, REACT_MARKS, navigationStart, "react");
    if (reactResult)
        return enrichWithFcp(reactResult, fcpMs);
    const nextResult = detectFrameworkHydration(userTimingEvents, NEXTJS_MARKS, navigationStart, "next.js");
    if (nextResult)
        return enrichWithFcp(nextResult, fcpMs);
    const vueResult = detectFrameworkHydration(userTimingEvents, VUE_MARKS, navigationStart, "vue");
    if (vueResult)
        return enrichWithFcp(vueResult, fcpMs);
    const genericHydration = userTimingEvents.find((ev) => ev.name.toLowerCase().includes("hydrat"));
    if (genericHydration) {
        const startMs = (0, filters_js_1.tsToMs)(genericHydration.ts, navigationStart);
        const durationMs = (0, filters_js_1.durToMs)(genericHydration.dur ?? 0);
        return enrichWithFcp({
            detected: true, framework: "unknown",
            startTime: startMs, endTime: startMs + durationMs, durationMs, fcpToHydrationMs: null,
        }, fcpMs);
    }
    if (fcpMs !== null) {
        const postFcpScript = findLargePostFcpScript(events, renderer, fcpMs, navigationStart);
        if (postFcpScript)
            return enrichWithFcp(postFcpScript, fcpMs);
    }
    return noHydration();
}
function detectHydrationFromLHR(lhr, fcpMs) {
    if (!lhr.audits)
        return noHydration();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bootupItems = lhr.audits["bootup-time"]?.details?.items ?? [];
    for (const item of bootupItems) {
        const url = (item.url ?? "").toLowerCase();
        const isFramework = ["react", "next", "vue", "angular", "svelte"].some((f) => url.includes(f));
        if (!isFramework)
            continue;
        const scriptMs = item.scripting ?? item.total ?? 0;
        if (scriptMs > 50 && fcpMs !== null) {
            const fw = detectFrameworkFromUrl(url);
            return { detected: true, framework: fw, startTime: fcpMs, endTime: fcpMs + scriptMs, durationMs: scriptMs, fcpToHydrationMs: scriptMs };
        }
    }
    return noHydration();
}
function detectFrameworkHydration(events, marks, navigationStart, framework) {
    let startTs = Infinity, endTs = -Infinity, found = false;
    for (const ev of events) {
        if (!marks.some((m) => ev.name.toLowerCase().includes(m.toLowerCase())))
            continue;
        found = true;
        if (ev.ts < startTs)
            startTs = ev.ts;
        const evEnd = ev.ts + (ev.dur ?? 0);
        if (evEnd > endTs)
            endTs = evEnd;
    }
    if (!found)
        return null;
    const startMs = (0, filters_js_1.tsToMs)(startTs, navigationStart);
    const endMs = (0, filters_js_1.tsToMs)(endTs, navigationStart);
    return { detected: true, framework, startTime: startMs, endTime: endMs, durationMs: Math.round(Math.max(0, endMs - startMs)), fcpToHydrationMs: null };
}
function enrichWithFcp(signal, fcpMs) {
    if (fcpMs !== null && signal.endTime !== null) {
        return { ...signal, fcpToHydrationMs: Math.max(0, Math.round(signal.endTime - fcpMs)) };
    }
    return signal;
}
function findLargePostFcpScript(events, renderer, fcpMs, navigationStart) {
    const fcpTs = navigationStart + fcpMs * 1000;
    const candidates = events.filter((ev) => ev.pid === renderer.pid && ev.tid === renderer.tid && ev.ph === "X" &&
        ev.name === "EvaluateScript" && ev.ts > fcpTs && (ev.dur ?? 0) > 200_000);
    if (candidates.length === 0)
        return null;
    const largest = candidates.reduce((a, b) => ((b.dur ?? 0) > (a.dur ?? 0) ? b : a));
    const startMs = (0, filters_js_1.tsToMs)(largest.ts, navigationStart);
    const durationMs = (0, filters_js_1.durToMs)(largest.dur ?? 0);
    return { detected: true, framework: "unknown", startTime: startMs, endTime: startMs + durationMs, durationMs: Math.round(durationMs), fcpToHydrationMs: null };
}
function detectFrameworkFromUrl(url) {
    if (url.includes("next"))
        return "next.js";
    if (url.includes("react"))
        return "react";
    if (url.includes("vue"))
        return "vue";
    if (url.includes("angular"))
        return "angular";
    return "unknown";
}
function noHydration() {
    return { detected: false, framework: null, startTime: null, endTime: null, durationMs: null, fcpToHydrationMs: null };
}
