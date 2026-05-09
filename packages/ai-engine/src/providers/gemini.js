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
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
export class GeminiProvider {
    name = "gemini";
    model;
    apiKey;
    temperature;
    maxTokens;
    constructor(config) {
        this.model = config.model;
        this.apiKey = config.apiKey;
        this.temperature = config.temperature;
        this.maxTokens = config.maxTokens;
    }
    async complete(systemPrompt, userPrompt) {
        const url = `${GEMINI_BASE}/${this.model}:generateContent?key=${this.apiKey}`;
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                system_instruction: {
                    parts: [{ text: systemPrompt }],
                },
                contents: [
                    {
                        role: "user",
                        parts: [{ text: userPrompt }],
                    },
                ],
                generationConfig: {
                    temperature: this.temperature,
                    maxOutputTokens: this.maxTokens,
                    responseMimeType: "application/json",
                },
            }),
        });
        if (!response.ok) {
            const errText = await response.text().catch(() => response.statusText);
            throw new Error(`Gemini API error ${response.status}: ${errText}`);
        }
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
        const usage = data.usageMetadata;
        return {
            text,
            usage: {
                promptTokens: usage?.promptTokenCount ?? null,
                completionTokens: usage?.candidatesTokenCount ?? null,
                totalTokens: usage?.totalTokenCount ?? null,
            },
            model: this.model,
        };
    }
}
//# sourceMappingURL=gemini.js.map