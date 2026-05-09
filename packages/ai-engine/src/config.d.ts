/**
 * @file config.ts
 * @description Environment variable loading, validation, and .env.example generation.
 *
 * SUPPORTED ENV VARS:
 *   TRACELENS_AI_PROVIDER=openai|gemini|anthropic|openrouter
 *   TRACELENS_AI_MODEL=gpt-4o-mini|gemini-2.5-flash|claude-3-haiku-20240307|...
 *
 *   OPENAI_API_KEY=sk-...
 *   GEMINI_API_KEY=AIza...
 *   OPENROUTER_API_KEY=sk-or-...
 *   ANTHROPIC_API_KEY=sk-ant-...
 */
import type { AIProviderConfig } from "./types.js";
export interface ResolvedAIConfig {
    isConfigured: boolean;
    reason: string | null;
    provider: AIProviderConfig | null;
}
/**
 * Load and validate AI provider configuration from environment variables.
 * Automatically loads from .env file if present.
 *
 * @param cwd      - Working directory to find .env (defaults to process.cwd())
 * @param override - Manual config overrides (highest priority)
 */
export declare function resolveAIConfig(cwd?: string, override?: Partial<AIProviderConfig>): ResolvedAIConfig;
//# sourceMappingURL=config.d.ts.map