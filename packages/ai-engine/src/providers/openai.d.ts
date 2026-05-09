/**
 * @file providers/openai.ts
 * @description OpenAI provider implementation.
 *
 * Uses the official `openai` npm SDK.
 * Supports: gpt-4o, gpt-4o-mini, o3-mini, and all OpenAI chat models.
 *
 * Also used by OpenRouter (same SDK, different baseURL).
 */
import type { AICompletion, AIProvider, AIProviderConfig } from "../types.js";
export declare class OpenAIProvider implements AIProvider {
    readonly name: "openai";
    readonly model: string;
    private apiKey;
    private temperature;
    private maxTokens;
    private baseURL;
    constructor(config: AIProviderConfig, baseURL?: string);
    complete(systemPrompt: string, userPrompt: string): Promise<AICompletion>;
}
//# sourceMappingURL=openai.d.ts.map