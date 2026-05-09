/**
 * @file providers/openrouter.ts
 * @description OpenRouter provider — 200+ models via one API key.
 *
 * OpenRouter is OpenAI-compatible, so we reuse the OpenAI provider
 * with a custom baseURL. No extra dependencies needed.
 *
 * Popular models available:
 *   openai/gpt-4o-mini         → fast, cheap, excellent JSON
 *   google/gemini-2.5-flash    → fast, large context
 *   anthropic/claude-3-haiku   → excellent reasoning
 *   meta-llama/llama-3.1-8b-instruct → free tier available
 */
import type { AICompletion, AIProvider, AIProviderConfig } from "../types.js";
export declare class OpenRouterProvider implements AIProvider {
    readonly name: "openrouter";
    readonly model: string;
    private inner;
    constructor(config: AIProviderConfig);
    complete(systemPrompt: string, userPrompt: string): Promise<AICompletion>;
}
//# sourceMappingURL=openrouter.d.ts.map