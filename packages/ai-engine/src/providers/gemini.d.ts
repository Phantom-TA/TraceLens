/**
 * @file providers/gemini.ts
 * @description Google Gemini provider via REST API.
 *
 * Uses Gemini's generateContent endpoint directly.
 * No external SDK dependency — native fetch only.
 *
 * Supported models:
 *   gemini-2.5-flash   → fastest, best for structured JSON output
 *   gemini-2.0-flash   → good balance of speed and quality
 *   gemini-1.5-pro     → highest quality, slower
 */
import type { AICompletion, AIProvider, AIProviderConfig } from "../types.js";
export declare class GeminiProvider implements AIProvider {
    readonly name: "gemini";
    readonly model: string;
    private apiKey;
    private temperature;
    private maxTokens;
    constructor(config: AIProviderConfig);
    complete(systemPrompt: string, userPrompt: string): Promise<AICompletion>;
}
//# sourceMappingURL=gemini.d.ts.map