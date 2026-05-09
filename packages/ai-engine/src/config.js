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
import { existsSync, readFileSync, writeFileSync } from "fs";
import { resolve } from "path";
// ─── Constants ─────────────────────────────────────────────────────────────────
const DEFAULT_MODELS = {
    openai: "gpt-4o-mini",
    gemini: "gemini-2.5-flash",
    anthropic: "claude-3-haiku-20240307",
    openrouter: "openai/gpt-4o-mini",
};
const KEY_ENV_VARS = {
    openai: "OPENAI_API_KEY",
    gemini: "GEMINI_API_KEY",
    anthropic: "ANTHROPIC_API_KEY",
    openrouter: "OPENROUTER_API_KEY",
};
const VALID_PROVIDERS = ["openai", "gemini", "anthropic", "openrouter"];
const ENV_EXAMPLE_CONTENT = `# ─── TraceLens AI Engine Configuration ──────────────────────────────────────────
#
# Copy this file to .env and fill in your chosen provider's API key.
# TraceLens uses BYOK (Bring Your Own Key) — keys are never hardcoded.
#
# QUICK START (Gemini has a generous free tier):
#   1. Get a free API key at: https://aistudio.google.com/apikey
#   2. Set TRACELENS_AI_PROVIDER=gemini
#   3. Set GEMINI_API_KEY=your-key-here
# ─────────────────────────────────────────────────────────────────────────────────

TRACELENS_AI_PROVIDER=gemini
TRACELENS_AI_MODEL=gemini-2.5-flash

OPENAI_API_KEY=
GEMINI_API_KEY=
OPENROUTER_API_KEY=
ANTHROPIC_API_KEY=
`;
// ─── .env file loader (synchronous, no external deps) ─────────────────────────
function loadEnvFile(cwd) {
    const envPath = resolve(cwd, ".env");
    if (!existsSync(envPath))
        return;
    try {
        const content = readFileSync(envPath, "utf-8");
        for (const line of content.split("\n")) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith("#"))
                continue;
            const eqIdx = trimmed.indexOf("=");
            if (eqIdx === -1)
                continue;
            const key = trimmed.slice(0, eqIdx).trim();
            const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
            // Only set if not already set (env vars take precedence over .env)
            if (key && !process.env[key]) {
                process.env[key] = val;
            }
        }
    }
    catch {
        // Non-fatal — silently ignore parse errors
    }
}
function ensureEnvExample(cwd) {
    const examplePath = resolve(cwd, ".env.example");
    if (!existsSync(examplePath)) {
        try {
            writeFileSync(examplePath, ENV_EXAMPLE_CONTENT, "utf-8");
        }
        catch {
            // Non-fatal
        }
    }
}
/**
 * Load and validate AI provider configuration from environment variables.
 * Automatically loads from .env file if present.
 *
 * @param cwd      - Working directory to find .env (defaults to process.cwd())
 * @param override - Manual config overrides (highest priority)
 */
export function resolveAIConfig(cwd = process.cwd(), override) {
    // Load .env file (sync, no deps)
    loadEnvFile(cwd);
    // Ensure .env.example exists for user guidance
    ensureEnvExample(cwd);
    // Determine provider
    const providerRaw = (override?.provider ??
        (process.env["TRACELENS_AI_PROVIDER"] ?? "")).toLowerCase().trim();
    if (!providerRaw || !VALID_PROVIDERS.includes(providerRaw)) {
        return {
            isConfigured: false,
            reason: `TRACELENS_AI_PROVIDER not set or invalid. Valid values: ${VALID_PROVIDERS.join(", ")}. See .env.example for setup.`,
            provider: null,
        };
    }
    // Determine model
    const model = (override?.model ??
        process.env["TRACELENS_AI_MODEL"] ??
        DEFAULT_MODELS[providerRaw]).trim();
    // Determine API key
    const keyEnvVar = KEY_ENV_VARS[providerRaw];
    const apiKey = (override?.apiKey ?? process.env[keyEnvVar] ?? "").trim();
    if (!apiKey) {
        return {
            isConfigured: false,
            reason: `${keyEnvVar} is not set. Add it to your .env file. See .env.example for setup instructions.`,
            provider: null,
        };
    }
    return {
        isConfigured: true,
        reason: null,
        provider: {
            provider: providerRaw,
            model,
            apiKey,
            temperature: override?.temperature ?? 0.1,
            maxTokens: override?.maxTokens ?? 8192,
        },
    };
}
//# sourceMappingURL=config.js.map