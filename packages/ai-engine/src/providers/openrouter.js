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
import { OpenAIProvider } from "./openai.js";
export class OpenRouterProvider {
    name = "openrouter";
    model;
    inner;
    constructor(config) {
        this.model = config.model;
        this.inner = new OpenAIProvider(config, "https://openrouter.ai/api/v1");
    }
    async complete(systemPrompt, userPrompt) {
        return this.inner.complete(systemPrompt, userPrompt);
    }
}
//# sourceMappingURL=openrouter.js.map