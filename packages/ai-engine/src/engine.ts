/**
 * @file engine.ts
 * @description Main AI Root-Cause Analysis Engine orchestrator.
 *
 * EXECUTION FLOW:
 *   1. Resolve AI provider config from env
 *   2. If not configured → return graceful skip result
 *   3. Instantiate the configured provider
 *   4. Build compact prompt from TraceLensIntelligenceReport
 *   5. Call provider → get raw AI completion
 *   6. Parse + validate AI response into AIRootCauseReport
 *   7. Write debug logs if configured
 *   8. Return structured AIEngineResult with observability metadata
 *
 * FALLBACK BEHAVIOR:
 *   If no provider configured  → status: "skipped"
 *   If provider call fails     → status: "failed" (pipeline continues)
 *   If response parsing fails  → status: "success" with fallback report
 */

import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";

import type { TraceLensIntelligenceReport } from "../../analytics-engine/src/types.js";
import type {
  AIEngineConfig,
  AIEngineResult,
  AIProvider,
  AIProviderName,
} from "./types.js";

import { resolveAIConfig } from "./config.js";
import { buildUserPrompt, estimateTokens, SYSTEM_PROMPT } from "./prompt-builder.js";
import { parseAIResponse } from "./response-parser.js";
import { OpenAIProvider } from "./providers/openai.js";
import { OpenRouterProvider } from "./providers/openrouter.js";
import { GeminiProvider } from "./providers/gemini.js";
import { AnthropicProvider } from "./providers/anthropic.js";

// ─── Provider Factory ──────────────────────────────────────────────────────────

function createProvider(name: AIProviderName, config: import("./types.js").AIProviderConfig): AIProvider {
  switch (name) {
    case "openai":     return new OpenAIProvider(config);
    case "openrouter": return new OpenRouterProvider(config);
    case "gemini":     return new GeminiProvider(config);
    case "anthropic":  return new AnthropicProvider(config);
    default:           return new OpenAIProvider(config);
  }
}

// ─── Main Engine ───────────────────────────────────────────────────────────────

/**
 * Run the AI Root-Cause Analysis Engine on a TraceLensIntelligenceReport.
 *
 * @param report  - The canonical intelligence report from the analytics engine
 * @param config  - Optional engine configuration overrides
 * @returns       - AIEngineResult (always resolves, never throws)
 */
export async function analyzeWithAI(
  report: TraceLensIntelligenceReport,
  config: AIEngineConfig = {}
): Promise<AIEngineResult> {
  const startMs = Date.now();

  // ── Step 1: Resolve provider config ─────────────────────────────────────────
  const resolved = resolveAIConfig(process.cwd(), config.provider);

  if (!resolved.isConfigured || !resolved.provider) {
    console.warn(`[ai-engine] ${resolved.reason}`);
    console.warn("[ai-engine] Skipping AI root-cause analysis. Pipeline results are still available.");

    return {
      status: "skipped",
      message: resolved.reason ?? "AI provider not configured",
      report: null,
      meta: {
        provider: null,
        model: null,
        usage: null,
        durationMs: Date.now() - startMs,
        promptCharCount: 0,
      },
    };
  }

  const providerConfig = resolved.provider;

  // ── Step 2: Build prompts ────────────────────────────────────────────────────
  const userPrompt = buildUserPrompt(report);
  const promptCharCount = SYSTEM_PROMPT.length + userPrompt.length;
  const estimatedInputTokens = estimateTokens(SYSTEM_PROMPT + userPrompt);

  if (config.logPrompts) {
    console.log("\n[ai-engine] ── System Prompt ──────────────────────────────────");
    console.log(SYSTEM_PROMPT.slice(0, 500) + "...[truncated]");
    console.log("\n[ai-engine] ── User Prompt ──────────────────────────────────");
    console.log(userPrompt);
    console.log(`\n[ai-engine] Estimated input tokens: ~${estimatedInputTokens}`);
  }

  console.log(`[ai-engine] Provider : ${providerConfig.provider} / ${providerConfig.model}`);
  console.log(`[ai-engine] Input    : ~${estimatedInputTokens} tokens`);

  // ── Step 3: Run AI provider ──────────────────────────────────────────────────
  const provider = createProvider(providerConfig.provider, providerConfig);
  let completion: import("./types.js").AICompletion;

  try {
    console.log("[ai-engine] Calling AI provider...");
    completion = await provider.complete(SYSTEM_PROMPT, userPrompt);
    console.log(`[ai-engine] Received : ~${estimateTokens(completion.text)} output tokens`);

    if (completion.usage.totalTokens) {
      console.log(`[ai-engine] Total tokens used: ${completion.usage.totalTokens}`);
    }
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(`[ai-engine] Provider call failed: ${errMsg}`);

    return {
      status: "failed",
      message: `AI provider error: ${errMsg}`,
      report: null,
      meta: {
        provider: providerConfig.provider,
        model: providerConfig.model,
        usage: null,
        durationMs: Date.now() - startMs,
        promptCharCount,
      },
    };
  }

  // ── Step 4: Parse response ────────────────────────────────────────────────────
  const { report: aiReport, warnings } = parseAIResponse(
    completion.text,
    report.primaryBottleneck
  );

  for (const w of warnings) {
    console.warn(`[ai-engine] Warning: ${w}`);
  }

  // ── Step 5: Save debug logs ───────────────────────────────────────────────────
  if (config.saveDebugLogs) {
    const logDir = config.debugLogDir ?? "./reports/ai-debug";
    mkdirSync(logDir, { recursive: true });
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    const logPath = join(logDir, `ai-debug-${report.session.sessionId}-${ts}.json`);
    writeFileSync(logPath, JSON.stringify({
      sessionId: report.session.sessionId,
      provider: providerConfig.provider,
      model: providerConfig.model,
      timestamp: new Date().toISOString(),
      systemPrompt: SYSTEM_PROMPT,
      userPrompt,
      rawResponse: completion.text,
      parsedReport: aiReport,
      warnings,
      usage: completion.usage,
    }, null, 2), "utf-8");
    console.log(`[ai-engine] Debug log: ${logPath}`);
  }

  const durationMs = Date.now() - startMs;
  console.log(`[ai-engine] Analysis complete (${durationMs}ms)`);

  return {
    status: "success",
    message: `AI root-cause analysis complete (${providerConfig.provider}/${providerConfig.model})`,
    report: aiReport,
    meta: {
      provider: providerConfig.provider,
      model: providerConfig.model,
      usage: completion.usage,
      durationMs,
      promptCharCount,
    },
  };
}
