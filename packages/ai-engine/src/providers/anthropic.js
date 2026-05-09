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
const ANTHROPIC_BASE = "https://api.anthropic.com/v1";
const ANTHROPIC_VERSION = "2023-06-01";
export class AnthropicProvider {
    name = "anthropic";
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
        const response = await fetch(`${ANTHROPIC_BASE}/messages`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": this.apiKey,
                "anthropic-version": ANTHROPIC_VERSION,
            },
            body: JSON.stringify({
                model: this.model,
                max_tokens: this.maxTokens,
                temperature: this.temperature,
                system: systemPrompt,
                messages: [{ role: "user", content: userPrompt }],
            }),
        });
        if (!response.ok) {
            const errText = await response.text().catch(() => response.statusText);
            throw new Error(`Anthropic API error ${response.status}: ${errText}`);
        }
        const data = await response.json();
        const textBlock = data.content?.find((b) => b.type === "text");
        const text = textBlock?.text ?? "";
        // Extract JSON from Claude's response (it may wrap in markdown)
        const cleaned = extractJSON(text);
        return {
            text: cleaned,
            usage: {
                promptTokens: data.usage?.input_tokens ?? null,
                completionTokens: data.usage?.output_tokens ?? null,
                totalTokens: (data.usage?.input_tokens ?? 0) + (data.usage?.output_tokens ?? 0) || null,
            },
            model: data.model ?? this.model,
        };
    }
}
/** Extract JSON from a response that may have markdown code fences */
function extractJSON(text) {
    // Try to find JSON block in markdown fences
    const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch?.[1])
        return fenceMatch[1].trim();
    // Return as-is (might already be raw JSON)
    return text.trim();
}
//# sourceMappingURL=anthropic.js.map