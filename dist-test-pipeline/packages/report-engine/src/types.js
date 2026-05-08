"use strict";
/**
 * @file types.ts
 * @description All TypeScript types for @tracelens/pipeline-engine.
 *
 * DESIGN PRINCIPLES:
 *   - One PipelineSession flows through every stage
 *   - All artifact paths are explicit — never searched from disk
 *   - Every stage records timing, status, and its output contract
 *   - The final TraceLensResult is the canonical output consumed by AI/dashboard
 */
Object.defineProperty(exports, "__esModule", { value: true });
