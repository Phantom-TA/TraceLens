/**
 * @file extractors/framework-detector.ts
 * @description Multi-signal frontend framework detection engine.
 *
 * DETECTION ARCHITECTURE:
 *   PRIMARY (runtime signals — most trustworthy):
 *     1. UserTiming marks in Chrome trace (React, Next.js, Vue, Angular, etc.)
 *     2. Post-FCP large EvaluateScript heuristic (framework initialization signature)
 *     3. Scripting URL patterns in trace events
 *
 *   SECONDARY (confidence booster — corroborating evidence):
 *     4. LHR bootup-time script URL signatures
 *     5. LHR network-requests URL patterns
 *
 * CONFIDENCE MODEL:
 *   - UserTiming mark detected:      +0.60 (very strong — intentional instrumentation)
 *   - Script URL match in trace:      +0.25 (moderate — URL naming is a strong signal)
 *   - LHR bootup script URL match:   +0.20 (secondary corroboration)
 *   - Post-FCP large script heuristic:+0.15 (weak — inferred from behavior)
 *   - Multiple signals agree:         cap at 0.95 (never 100% certain)
 *
 * IMPORTANT:
 *   The engine maintains probabilistic reasoning.
 *   It never claims certainty — only confidence levels.
 */
import { durToMs } from "../filters.js";
const FRAMEWORK_SIGNATURES = [
    {
        framework: "next.js",
        userTimingMarks: ["Next.js-hydration", "nextjs-hydration", "__next_router", "NextRouter"],
        scriptUrlPatterns: ["/_next/", "_next/static", "next/dist", "__next"],
        lhrUrlPatterns: ["/_next/", "_next/static", "next-server"],
    },
    {
        framework: "react",
        userTimingMarks: ["ReactDOMHydrate", "ReactMount", "react::hydrate", "React Hydration", "ReactDOMRender"],
        scriptUrlPatterns: ["react-dom", "react.development", "react.production", "/react@"],
        lhrUrlPatterns: ["react-dom", "react.production.min", "react.development"],
    },
    {
        framework: "vue",
        userTimingMarks: ["vue-component-mount", "vue-renderer", "Vue.mount"],
        scriptUrlPatterns: ["vue.runtime", "vue.esm", "/vue@", "vue.min.js", "vue.cjs"],
        lhrUrlPatterns: ["vue.runtime", "vue.esm", "/vue@"],
    },
    {
        framework: "nuxt",
        userTimingMarks: ["nuxt:hydrate", "nuxt-app", "nuxt.hydration"],
        scriptUrlPatterns: ["/_nuxt/", "_nuxt/static", "nuxt/dist"],
        lhrUrlPatterns: ["/_nuxt/", "nuxt.js"],
    },
    {
        framework: "angular",
        userTimingMarks: ["Angular", "ng-component", "AngularBootstrap"],
        scriptUrlPatterns: ["@angular/", "angular.min.js", "main.angular"],
        lhrUrlPatterns: ["@angular/", "angular.min"],
    },
    {
        framework: "astro",
        userTimingMarks: ["@astrojs", "astro:hydration", "astro-island"],
        scriptUrlPatterns: ["/_astro/", "@astrojs/", "astro/dist"],
        lhrUrlPatterns: ["/_astro/", "astro.js"],
    },
    {
        framework: "remix",
        userTimingMarks: ["__remix", "RemixBrowser", "remix-browser"],
        scriptUrlPatterns: ["/build/", "@remix-run/", "remix.js"],
        lhrUrlPatterns: ["@remix-run/", "remix.js"],
    },
    {
        framework: "sveltekit",
        userTimingMarks: ["sveltekit:start", "sveltekit:navigation", "__sveltekit"],
        scriptUrlPatterns: ["/.svelte-kit/", "@sveltejs/kit", "_app/immutable"],
        lhrUrlPatterns: ["/.svelte-kit/", "@sveltejs/kit"],
    },
    {
        framework: "svelte",
        userTimingMarks: ["svelte-component", "svelte.mount"],
        scriptUrlPatterns: ["svelte/internal", "svelte.js", "/svelte@"],
        lhrUrlPatterns: ["svelte/internal", "svelte.js"],
    },
];
// ─── Null Result ───────────────────────────────────────────────────────────────
function noFramework() {
    return {
        framework: null,
        confidence: 0,
        detectionMethods: [],
        confidenceNote: null,
        runtimeVersion: null,
    };
}
// ─── Main Detection Function ───────────────────────────────────────────────────
/**
 * Detect the frontend framework using multi-signal analysis.
 *
 * @param events     - Pre-filtered Chrome trace events (main thread)
 * @param renderer   - Renderer thread identity
 * @param fcpMs      - First Contentful Paint time (ms) — for post-FCP heuristic
 * @param lhr        - Lighthouse LHR (optional secondary signals)
 * @returns          - FrameworkDetectionResult with confidence scoring
 */
export function detectFramework(events, renderer, fcpMs, lhr) {
    const { navigationStart } = renderer;
    // Accumulate evidence per framework
    const evidence = new Map();
    const addEvidence = (fw, amount, method, note) => {
        if (!evidence.has(fw)) {
            evidence.set(fw, { confidence: 0, methods: new Set(), notes: [] });
        }
        const e = evidence.get(fw);
        e.confidence += amount;
        e.methods.add(method);
        e.notes.push(note);
    };
    // ── PRIMARY: UserTiming marks in trace ───────────────────────────────────
    const userTimingEvents = events.filter((ev) => ev.pid === renderer.pid &&
        (ev.cat?.includes("blink.user_timing") || ev.cat?.includes("blink,user_timing")));
    for (const sig of FRAMEWORK_SIGNATURES) {
        for (const ev of userTimingEvents) {
            const nameLower = ev.name.toLowerCase();
            if (sig.userTimingMarks.some((m) => nameLower.includes(m.toLowerCase()))) {
                addEvidence(sig.framework, 0.60, "trace-user-timing", `UserTiming mark "${ev.name}" matched`);
                break; // one match per signature is sufficient
            }
        }
    }
    // ── PRIMARY: Script URL patterns in trace scripting events ───────────────
    const scriptEvents = events.filter((ev) => ev.pid === renderer.pid &&
        ev.tid === renderer.tid &&
        ev.ph === "X" &&
        (ev.name === "EvaluateScript" || ev.name === "v8.compile" || ev.name === "FunctionCall") &&
        (ev.dur ?? 0) > 10_000 // >10ms — skip trivial evaluations
    );
    for (const sig of FRAMEWORK_SIGNATURES) {
        for (const ev of scriptEvents) {
            const url = ev.args?.["data"]?.url ?? ev.args?.url ?? "";
            if (!url)
                continue;
            if (sig.scriptUrlPatterns.some((p) => url.toLowerCase().includes(p.toLowerCase()))) {
                const durMs = durToMs(ev.dur ?? 0);
                addEvidence(sig.framework, 0.25, "trace-scripting", `Script URL "${url}" matched (${Math.round(durMs)}ms)`);
                break;
            }
        }
    }
    // ── SECONDARY: LHR bootup-time script URL patterns ────────────────────────
    if (lhr?.audits) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const bootupItems = lhr.audits["bootup-time"]?.details?.items ?? [];
        for (const sig of FRAMEWORK_SIGNATURES) {
            for (const item of bootupItems) {
                const url = (item.url ?? "").toLowerCase();
                if (sig.lhrUrlPatterns.some((p) => url.includes(p.toLowerCase()))) {
                    const scriptMs = item.scripting ?? item.total ?? 0;
                    addEvidence(sig.framework, 0.20, "lhr-bootup", `LHR bootup script "${item.url}" (${Math.round(scriptMs)}ms)`);
                    break;
                }
            }
        }
        // Also scan network-requests if available
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const networkItems = lhr.audits["network-requests"]?.details?.items ?? [];
        for (const sig of FRAMEWORK_SIGNATURES) {
            for (const item of networkItems) {
                const url = (item.url ?? "").toLowerCase();
                if (url.endsWith(".js") && sig.lhrUrlPatterns.some((p) => url.includes(p.toLowerCase()))) {
                    addEvidence(sig.framework, 0.10, "script-url-signature", `Network request URL matched: "${item.url}"`);
                    break;
                }
            }
        }
    }
    // ── PRIMARY: Post-FCP large script heuristic ──────────────────────────────
    // A large EvaluateScript block immediately after FCP often signals hydration
    if (fcpMs !== null && evidence.size === 0) {
        const fcpTs = navigationStart + fcpMs * 1000;
        const candidates = scriptEvents.filter((ev) => ev.ts > fcpTs && ev.ts < fcpTs + 3_000_000 && (ev.dur ?? 0) > 200_000);
        if (candidates.length > 0) {
            const largest = candidates.reduce((a, b) => ((b.dur ?? 0) > (a.dur ?? 0) ? b : a));
            const url = largest.args?.["data"]?.url ?? largest.args?.url ?? "";
            // Try to match URL to a known framework
            for (const sig of FRAMEWORK_SIGNATURES) {
                if (url && sig.scriptUrlPatterns.some((p) => url.toLowerCase().includes(p.toLowerCase()))) {
                    addEvidence(sig.framework, 0.15, "post-fcp-heuristic", `Large post-FCP script (${Math.round(durToMs(largest.dur ?? 0))}ms) matched framework URL`);
                    break;
                }
            }
            // If no URL match, it could be unknown
            if (evidence.size === 0) {
                addEvidence("unknown", 0.15, "post-fcp-heuristic", `Large post-FCP EvaluateScript (${Math.round(durToMs(largest.dur ?? 0))}ms) — possible framework hydration`);
            }
        }
    }
    // ── Select winner: highest confidence ─────────────────────────────────────
    if (evidence.size === 0)
        return noFramework();
    let bestFw = "unknown";
    let bestConfidence = 0;
    for (const [fw, data] of evidence.entries()) {
        // Multiple signals from different methods add extra confidence
        const methodBonus = data.methods.size > 1 ? 0.10 : 0;
        const totalConfidence = Math.min(data.confidence + methodBonus, 0.95);
        if (totalConfidence > bestConfidence) {
            bestConfidence = totalConfidence;
            bestFw = fw;
        }
    }
    // Next.js implies React — if we detected next.js but also have react signals,
    // consolidate to next.js (more specific is better)
    const winner = evidence.get(bestFw);
    const methods = Array.from(winner.methods);
    const confidenceNote = buildConfidenceNote(bestFw, bestConfidence, methods, winner.notes);
    return {
        framework: bestFw === "unknown" ? "unknown" : bestFw,
        confidence: Math.round(bestConfidence * 100) / 100,
        detectionMethods: methods,
        confidenceNote,
        runtimeVersion: null, // Future: extract from window.__REACT_VERSION__ or similar
    };
}
/**
 * LHR-only framework detection (when no Chrome trace is available).
 * Uses bootup-time script URLs as the primary signal.
 */
export function detectFrameworkFromLHR(lhr) {
    if (!lhr.audits)
        return noFramework();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bootupItems = lhr.audits["bootup-time"]?.details?.items ?? [];
    const evidence = new Map();
    for (const sig of FRAMEWORK_SIGNATURES) {
        for (const item of bootupItems) {
            const url = (item.url ?? "").toLowerCase();
            if (sig.lhrUrlPatterns.some((p) => url.includes(p.toLowerCase()))) {
                const scriptMs = item.scripting ?? item.total ?? 0;
                if (!evidence.has(sig.framework)) {
                    evidence.set(sig.framework, {
                        confidence: 0.35,
                        note: `LHR bootup-time: "${item.url}" (${Math.round(scriptMs)}ms)`,
                    });
                }
                break;
            }
        }
    }
    if (evidence.size === 0)
        return noFramework();
    let bestFw = "unknown";
    let bestConf = 0;
    for (const [fw, data] of evidence.entries()) {
        if (data.confidence > bestConf) {
            bestConf = data.confidence;
            bestFw = fw;
        }
    }
    return {
        framework: bestFw,
        confidence: bestConf,
        detectionMethods: ["lhr-bootup"],
        confidenceNote: evidence.get(bestFw)?.note ?? null,
        runtimeVersion: null,
    };
}
// ─── Helpers ───────────────────────────────────────────────────────────────────
function buildConfidenceNote(framework, confidence, methods, notes) {
    const pct = Math.round(confidence * 100);
    const methodStr = methods.join(", ");
    const qualifier = confidence >= 0.80 ? "High confidence" : confidence >= 0.50 ? "Moderate confidence" : "Low confidence";
    return `${qualifier} (${pct}%) — ${framework} detected via: ${methodStr}. ${notes.slice(0, 2).join("; ")}.`;
}
//# sourceMappingURL=framework-detector.js.map