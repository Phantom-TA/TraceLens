"use strict";
/**
 * @file index.ts
 * @description Public API surface for @tracelens/trace-parser.
 *
 * Only exports that are part of the module's contract are listed here.
 * Internal helpers (filters, extractors, correlator) are NOT re-exported.
 *
 * Consumers should import exclusively from "@tracelens/trace-parser".
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.parse = void 0;
// ─── Primary Entry Point ───────────────────────────────────────────────────────
var parser_js_1 = require("./parser.js");
Object.defineProperty(exports, "parse", { enumerable: true, get: function () { return parser_js_1.parse; } });
