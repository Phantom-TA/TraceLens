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

export class OpenAIProvider implements AIProvider {
  readonly name = "openai" as const;
  readonly model: string;

  private apiKey: string;
  private temperature: number;
  private maxTokens: number;
  private baseURL: string;

  constructor(config: AIProviderConfig, baseURL?: string) {
    this.model = config.model;
    this.apiKey = config.apiKey;
    this.temperature = config.temperature;
    this.maxTokens = config.maxTokens;
    this.baseURL = baseURL ?? "https://api.openai.com/v1";
  }

  async complete(systemPrompt: string, userPrompt: string): Promise<AICompletion> {
    const response = await fetch(`${this.baseURL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.apiKey}`,
        // Required by OpenRouter for identification
        "HTTP-Referer": "https://github.com/Phantom-TA/TraceLens",
        "X-Title": "TraceLens Performance Intelligence",
      },
      body: JSON.stringify({
        model: this.model,
        temperature: this.temperature,
        max_tokens: this.maxTokens,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      throw new Error(`OpenAI API error ${response.status}: ${errText}`);
    }

    const data = await response.json() as {
      choices: Array<{ message: { content: string } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
      model: string;
    };

    const text = data.choices[0]?.message?.content ?? "";
    return {
      text,
      usage: {
        promptTokens: data.usage?.prompt_tokens ?? null,
        completionTokens: data.usage?.completion_tokens ?? null,
        totalTokens: data.usage?.total_tokens ?? null,
      },
      model: data.model ?? this.model,
    };
  }
}
