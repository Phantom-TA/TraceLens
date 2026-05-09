/**
 * @file logger.ts
 * @description Pipeline observability layer — structured console logging
 * with stage visibility, timing metrics, and artifact mapping.
 *
 * Design: simple, no external dependencies, color output via ANSI codes.
 */
// ─── ANSI Colors ───────────────────────────────────────────────────────────────
const C = {
    reset: "\x1b[0m",
    bold: "\x1b[1m",
    dim: "\x1b[2m",
    cyan: "\x1b[36m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    red: "\x1b[31m",
    blue: "\x1b[34m",
    white: "\x1b[37m",
    gray: "\x1b[90m",
};
function ts() {
    return new Date().toISOString().slice(11, 23); // HH:MM:SS.mmm
}
// ─── Public Logger ─────────────────────────────────────────────────────────────
export const logger = {
    banner(sessionId) {
        console.log(`\n${C.bold}${C.cyan}`);
        console.log("╔══════════════════════════════════════════════════════════╗");
        console.log("║       TraceLens — Performance Intelligence Pipeline      ║");
        console.log("╚══════════════════════════════════════════════════════════╝");
        console.log(C.reset);
        console.log(`  ${C.gray}Session:${C.reset} ${C.bold}${sessionId}${C.reset}`);
        console.log(`  ${C.gray}Started:${C.reset} ${new Date().toISOString()}\n`);
    },
    stageStart(stage, detail) {
        const detail_ = detail ? ` ${C.gray}${detail}${C.reset}` : "";
        console.log(`${C.gray}[${ts()}]${C.reset} ${C.blue}▶${C.reset} ${C.bold}${stage}${C.reset}${detail_}`);
    },
    stageDone(stage, durationMs, detail) {
        const detail_ = detail ? ` ${C.gray}— ${detail}${C.reset}` : "";
        console.log(`${C.gray}[${ts()}]${C.reset} ${C.green}✓${C.reset} ${C.bold}${stage}${C.reset} ${C.gray}(${durationMs}ms)${C.reset}${detail_}`);
    },
    stageSkipped(stage, reason) {
        console.log(`${C.gray}[${ts()}]${C.reset} ${C.yellow}⊘${C.reset} ${C.bold}${stage}${C.reset} ${C.gray}skipped — ${reason}${C.reset}`);
    },
    stageFailed(stage, error, fatal = false) {
        const badge = fatal ? `${C.red}✗ FATAL${C.reset}` : `${C.yellow}✗ PARTIAL${C.reset}`;
        console.log(`${C.gray}[${ts()}]${C.reset} ${badge} ${C.bold}${stage}${C.reset}: ${C.red}${error}${C.reset}`);
    },
    info(msg) {
        console.log(`${C.gray}[${ts()}]${C.reset}   ${msg}`);
    },
    artifact(label, path) {
        if (!path)
            return;
        console.log(`${C.gray}[${ts()}]${C.reset}   ${C.gray}${label}:${C.reset} ${path}`);
    },
    metric(label, value, unit = "") {
        const v = value === null ? C.gray + "n/a" + C.reset : `${C.bold}${value}${C.reset}${unit}`;
        console.log(`${C.gray}[${ts()}]${C.reset}   ${label.padEnd(20)} ${v}`);
    },
    route(url) {
        console.log(`\n${C.gray}  ┌─ Route: ${C.reset}${C.bold}${url}${C.reset}`);
    },
    separator() {
        console.log(`${C.gray}  ─────────────────────────────────────────────────${C.reset}`);
    },
    summary(sessionId, durationMs, success, routeCount) {
        const status = success
            ? `${C.green}${C.bold}✓ PIPELINE COMPLETE${C.reset}`
            : `${C.yellow}${C.bold}⚠ PIPELINE PARTIAL${C.reset}`;
        console.log(`\n${C.gray}╔══════════════════════════════════════════════════════════╗${C.reset}`);
        console.log(`  ${status}`);
        console.log(`  ${C.gray}Session:${C.reset} ${sessionId}`);
        console.log(`  ${C.gray}Routes:${C.reset}  ${routeCount}`);
        console.log(`  ${C.gray}Total:${C.reset}   ${(durationMs / 1000).toFixed(1)}s`);
        console.log(`${C.gray}╚══════════════════════════════════════════════════════════╝${C.reset}\n`);
    },
};
//# sourceMappingURL=logger.js.map