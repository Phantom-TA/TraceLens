/**
 * @file providers/anthropic.ts
 * @description Anthropic Claude provider via Messages API.
 *
 * Uses the Anthropic Messages API directly.
 * No external SDK dependency — native fetch only.
 *
 * Supported models:
 *   claude-3-haiku-20240307        → fastest, cheapest, great for structured JSON
 *   claude-3-5-sonnet-20241022     → best reasoning, slower
 *   claude-3-5-haiku-20241022      → fast, modern
 */
import type { AICompletion, AIProvider, AIProviderConfig } from "../types.js";
export declare class AnthropicProvider implements AIProvider {
    readonly name: "anthropic";
    readonly model: string;
    private apiKey;
    private temperature;
    private maxTokens;
    constructor(config: AIProviderConfig);
    complete(systemPrompt: string, userPrompt: string): Promise<AICompletion>;
}
//# sourceMappingURL=anthropic.d.ts.map