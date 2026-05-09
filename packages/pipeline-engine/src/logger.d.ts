/**
 * @file logger.ts
 * @description Pipeline observability layer — structured console logging
 * with stage visibility, timing metrics, and artifact mapping.
 *
 * Design: simple, no external dependencies, color output via ANSI codes.
 */
export declare const logger: {
    banner(sessionId: string): void;
    stageStart(stage: string, detail?: string): void;
    stageDone(stage: string, durationMs: number, detail?: string): void;
    stageSkipped(stage: string, reason: string): void;
    stageFailed(stage: string, error: string, fatal?: boolean): void;
    info(msg: string): void;
    artifact(label: string, path: string | null): void;
    metric(label: string, value: string | number | null, unit?: string): void;
    route(url: string): void;
    separator(): void;
    summary(sessionId: string, durationMs: number, success: boolean, routeCount: number): void;
};
//# sourceMappingURL=logger.d.ts.map