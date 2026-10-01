import "server-only";

/**
 * Mock provider — the development and test implementation.
 *
 * Deterministic, requires no credentials, and runs entirely server-side. It
 * exists so the AI architecture can be exercised end to end before a vendor is
 * chosen.
 *
 * It does NOT pretend to be a real model. It does not reason, does not produce
 * student-facing recommendations, and its output is explicitly labelled in the
 * returned metadata. Any feature built on top of it in development must treat
 * the result as a placeholder, never as advice for a real student.
 */

import type {
  AIProvider,
  AITextGenerationInput,
  AITextGenerationResult,
} from "../types";

const PROVIDER_ID = "mock";
const DEFAULT_MODEL = "mock-echo-v1";

/** Deterministic label returned in place of model output. */
const MOCK_PREFIX = "Ka-Lakbay AI infrastructure is working.";

/** Artificial latency so timing behaviour is observable in development. */
const MOCK_LATENCY_MS = 50;

export class MockProvider implements AIProvider {
  readonly id = PROVIDER_ID;
  readonly defaultModel = DEFAULT_MODEL;

  /** Needs no API key, so it is always available. */
  isAvailable(): boolean {
    return true;
  }

  async generateText(
    input: AITextGenerationInput
  ): Promise<AITextGenerationResult> {
    await delay(MOCK_LATENCY_MS);

    return {
      text: buildResponse(input),
      model: input.model ?? this.defaultModel,
      provider: this.id,
      usage: estimateUsage(input),
      metadata: {
        mock: true,
        operation: input.operation ?? null,
        note: "Deterministic mock output. Not model-generated.",
      },
    };
  }
}

/**
 * Echoes the request back in a stable, predictable form so a caller can confirm
 * the pipeline carried every field through: system, prompt, model and options.
 */
function buildResponse(input: AITextGenerationInput): string {
  const lines = [MOCK_PREFIX];

  if (input.system) lines.push(`System: ${input.system}`);
  lines.push(`Prompt: ${input.prompt}`);

  if (input.model) lines.push(`Model: ${input.model}`);
  if (typeof input.temperature === "number") {
    lines.push(`Temperature: ${input.temperature}`);
  }
  if (typeof input.maxTokens === "number") {
    lines.push(`Max tokens: ${input.maxTokens}`);
  }

  return lines.join("\n");
}

/**
 * Naive whitespace-token count, so the usage shape is exercised without
 * pretending to match any real provider's tokenizer.
 */
function estimateUsage(input: AITextGenerationInput): {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
} {
  const inputText = [input.system, input.prompt].filter(Boolean).join(" ");
  const inputTokens = countTokens(inputText);
  const outputTokens = countTokens(buildResponse(input));

  return { inputTokens, outputTokens, totalTokens: inputTokens + outputTokens };
}

function countTokens(value: string): number {
  const trimmed = value.trim();
  return trimmed.length === 0 ? 0 : trimmed.split(/\s+/).length;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
