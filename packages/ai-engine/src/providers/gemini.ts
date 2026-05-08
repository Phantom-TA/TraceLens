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

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

export class GeminiProvider implements AIProvider {
  readonly name = "gemini" as const;
  readonly model: string;

  private apiKey: string;
  private temperature: number;
  private maxTokens: number;

  constructor(config: AIProviderConfig) {
    this.model = config.model;
    this.apiKey = config.apiKey;
    this.temperature = config.temperature;
    this.maxTokens = config.maxTokens;
  }

  async complete(systemPrompt: string, userPrompt: string): Promise<AICompletion> {
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

    const data = await response.json() as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
      }>;
      usageMetadata?: {
        promptTokenCount?: number;
        candidatesTokenCount?: number;
        totalTokenCount?: number;
      };
    };

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
