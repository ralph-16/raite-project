import "server-only";

/**
 * The Ka-Lakbay AI service — the single entry point for every AI feature.
 *
 * Feature code calls this and nothing else:
 *
 *   Student Profiler ─┐
 *   Career Matcher  ──┤
 *   Roadmap Generator ┼──► ai.generateText(...)  ──►  AIProvider
 *   Learning Companion┤                          ──►  MockProvider (tests)
 *   Skill Evaluator  ──┘                          ──►  GeminiProvider (real use)
 *
 * The service owns the four things a provider adapter should not have to repeat:
 * configuration validation, provider resolution, response normalization, and
 * error normalization. Adapters return vendor-shaped results and throw vendor
 * errors; neither escapes this module.
 *
 * `import "server-only"` means a client component importing this fails at build
 * time rather than silently shipping an API key to the browser.
 */

import { assertProviderCredentials, getAIConfig, resolveProviderChain } from "./config";
import { AIError, aiParseError, aiUnavailableError, toAIError } from "./errors";
import { logAIError, logAIRequest, logAISuccess } from "./logger";
import { getAIProvider } from "./provider";
import type {
  AIProvider,
  AIUsage,
  AITextGenerationInput,
  AITextGenerationResult,
  AIStructuredGenerationInput,
  AIStructuredGenerationResult,
} from "./types";

export * from "./types";
export { AIError } from "./errors";

/**
 * Executes a provider call through the fallback chain.
 *
 * Tries each provider in `AI_PROVIDER_ORDER` (or `[config.provider]` when the
 * variable is unset). A provider is skipped when its credentials are missing.
 * When a provider fails with 429 or 503 — rate-limited or overloaded — the
 * next provider in the chain is tried. Any other failure (auth, bad request,
 * parse) throws immediately: switching providers cannot fix it.
 *
 * Returns the successful result, which always carries the `provider` and
 * `model` that actually answered. When every provider is exhausted, the last
 * error is thrown; when none could be attempted, a configuration error.
 */
async function executeWithProviderChain<T extends { usage?: AIUsage }>(
  context: { operation?: string; model?: string },
  call: (provider: AIProvider, model: string) => Promise<T>
): Promise<T> {
  const config = getAIConfig();
  const chain = resolveProviderChain(config);

  let lastError: AIError | null = null;

  for (const providerId of chain) {
    let provider: AIProvider;
    try {
      assertProviderCredentials(providerId);
      provider = getAIProvider(providerId);
    } catch {
      // No credentials for this provider — it cannot serve, so skip it.
      continue;
    }

    if (!provider.isAvailable()) continue;

    const model = context.model ?? provider.defaultModel ?? config.model;
    const startedAt = Date.now();

    logAIRequest({
      operation: context.operation,
      provider: provider.id,
      model,
    });

    try {
      const result = await call(provider, model);

      logAISuccess({
        operation: context.operation,
        provider: provider.id,
        model,
        durationMs: Date.now() - startedAt,
        usage: result.usage,
      });

      return result;
    } catch (error) {
      const aiError = toAIError(error, { provider: provider.id, model });
      logAIError(aiError, {
        operation: context.operation,
        provider: provider.id,
        model,
        durationMs: Date.now() - startedAt,
      });
      lastError = aiError;

      // Only exhaustion (429 or 503) moves to the next provider.
      const isExhausted =
        aiError.code === "rate_limit" || aiError.status === 503;
      if (!isExhausted) throw aiError;
    }
  }

  if (lastError) throw lastError;
  throw aiUnavailableError(
    "No AI provider is available with the current configuration.",
    { detail: `chain: ${chain.join(", ")}` }
  );
}

/**
 * Generates text.
 *
 * Resolves configuration and the provider chain, executes, normalizes, and
 * throws an `AIError` for every failure — no provider-specific type and no
 * raw vendor error reaches the caller.
 */
export async function generateText(
  input: AITextGenerationInput
): Promise<AITextGenerationResult> {
  return executeWithProviderChain(
    { operation: input.operation, model: input.model },
    async (provider, model) => {
      const raw = await provider.generateText({ ...input, model });
      return normalizeTextResult(raw, provider.id, model);
    }
  );
}

/**
 * Generates structured output.
 *
 * The pipeline the product features will use:
 *
 *   provider → raw text → JSON parse → (caller) Zod validation → typed result
 *
 * Validation is deliberately the caller's job. This module stays free of a
 * validation dependency, and Task 2 adds Zod at the feature layer where the
 * schemas live. `value` is therefore `unknown`: the service guarantees the text
 * parsed as JSON, not that it matched a schema.
 */
export async function generateStructured<T = unknown>(
  input: AIStructuredGenerationInput
): Promise<AIStructuredGenerationResult> {
  return executeWithProviderChain(
    { operation: input.operation, model: input.model },
    async (provider, model) => {
      // Prefer the provider's native structured path when it has one. Falling back
      // to prompt instructions means a provider without native support still
      // works, at the cost of being less reliable.
      const raw = provider.generateStructured
        ? await provider.generateStructured({
            ...input,
            model,
            // A provider honouring jsonSchema does not need the prompt to repeat it.
            prompt: input.prompt,
          })
        : await provider.generateText({
            ...input,
            model,
            prompt: buildStructuredPrompt(input),
          });

      const textResult = normalizeTextResult(raw, provider.id, model);
      const value = parseJson(textResult.text, {
        provider: provider.id,
        model,
        schemaName: input.jsonSchema.name,
      });

      return {
        value: value as T,
        rawText: textResult.text,
        model: textResult.model,
        provider: textResult.provider,
        usage: textResult.usage,
        metadata: textResult.metadata,
      };
    }
  );
}

/**
 * Describes the expected JSON in the prompt, for providers without native
 * structured output.
 */
function buildStructuredPrompt(input: AIStructuredGenerationInput): string {
  const { jsonSchema } = input;
  const schemaText = JSON.stringify(jsonSchema.schema, null, 2);

  return [
    input.prompt,
    "",
    `Respond with JSON only — no prose, no markdown fences — matching this schema`,
    `named "${jsonSchema.name}":`,
    jsonSchema.description ? `// ${jsonSchema.description}` : null,
    schemaText,
  ]
    .filter((line) => line !== null)
    .join("\n");
}

/**
 * Extracts JSON from a model response.
 *
 * Tolerant of the two things models actually do: wrapping output in a markdown
 * fence, and adding a sentence of preamble. Anything else is a genuine
 * `parse_failed`, which is a different category from a request failure and
 * should not be retried the same way.
 */
function parseJson(
  text: string,
  context: { provider: string; model: string; schemaName: string }
): unknown {
  const candidate = stripCodeFence(text);

  try {
    return JSON.parse(candidate);
  } catch (error) {
    const embedded = extractFirstJsonObject(candidate);
    if (embedded !== null) return embedded;

    throw aiParseError(
      `AI response for "${context.schemaName}" was not valid JSON.`,
      {
        provider: context.provider,
        model: context.model,
        detail: "no JSON value found in response body",
        cause: error,
      }
    );
  }
}

function stripCodeFence(text: string): string {
  const trimmed = text.trim();
  const fenced = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(trimmed);
  return fenced ? fenced[1].trim() : trimmed;
}

function extractFirstJsonObject(text: string): unknown | null {
  const start = text.indexOf("{");
  const arrayStart = text.indexOf("[");

  let from = -1;
  let closer: string;

  if (start === -1 && arrayStart === -1) return null;

  if (arrayStart !== -1 && (start === -1 || arrayStart < start)) {
    from = arrayStart;
    closer = "]";
  } else {
    from = start;
    closer = "}";
  }

  const end = text.lastIndexOf(closer);
  if (end <= from) return null;

  try {
    return JSON.parse(text.slice(from, end + 1));
  } catch {
    return null;
  }
}

/**
 * Guarantees every result carries a model and provider, whatever the adapter
 * returned. `ai_context_model` and `model_identifier` in the database depend on
 * these being populated.
 */
function normalizeTextResult(
  raw: AITextGenerationResult,
  providerId: string,
  fallbackModel: string
): AITextGenerationResult {
  const model = raw.model?.trim() || fallbackModel;
  const provider = raw.provider?.trim() || providerId;

  return {
    text: raw.text ?? "",
    model,
    provider,
    usage: raw.usage,
    metadata: raw.metadata,
  };
}

/**
 * Configuration summary for diagnostics. Names and resolved non-secret values
 * only — no credentials, so it is safe to log or return from a test endpoint.
 */
export function describeAIConfig(): {
  provider: string;
  model: string;
  debug: boolean;
} {
  const config = getAIConfig();
  const chain = resolveProviderChain(config);
  const provider = getAIProvider(chain[0]);

  return {
    provider: chain.join(","),
    model: config.model ?? provider.defaultModel,
    debug: config.debug,
  };
}

/** Narrowing helper for callers that need to branch on error category. */
export function isAIError(error: unknown): error is AIError {
  return error instanceof AIError;
}
