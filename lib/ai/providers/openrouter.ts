import "server-only";

/**
 * OpenRouter provider — OpenAI-compatible REST adapter.
 *
 * Uses the OpenRouter chat completions endpoint (`openrouter.ai/api/v1`),
 * which mirrors the OpenAI API shape. No SDK dependency: plain `fetch`.
 *
 * Feature code never imports this. It goes through the AI service
 * (`../index.ts`), which resolves, normalizes, and converts every failure
 * into an `AIError` — nothing vendor-shaped escapes.
 */

import {
  aiAuthenticationError,
  aiConfigurationError,
  aiParseError,
  aiRateLimitError,
  aiRequestFailedError,
  aiUnavailableError,
  AIError,
} from "../errors";
import type {
  AIProvider,
  AIStructuredGenerationInput,
  AITextGenerationInput,
  AITextGenerationResult,
} from "../types";

const PROVIDER_ID = "openrouter";

/** Default model when `OPENROUTER_MODEL` is not set. */
const DEFAULT_MODEL = "qwen/qwen3.8-27b:free";

/**
 * API base. Overridable (`OPENROUTER_API_BASE`) so tests and
 * proxies can point the provider at a local stub; production
 * always uses OpenRouter. Read once at module load.
 */
const API_BASE =
  process.env.OPENROUTER_API_BASE?.trim() ||
  "https://openrouter.ai/api/v1";
const REQUEST_TIMEOUT_MS = 60_000;

/** Retry 429/5xx/timeouts twice with backoff. No retry on 400/401/403. */
const MAX_PRIMARY_ATTEMPTS = 2;
const MAX_FALLBACK_ATTEMPTS = 1;
const BACKOFF_BASE_MS = [1000, 2500];

/** Cap for Retry-After waits so a vendor cannot stall us indefinitely. */
const MAX_RETRY_AFTER_MS = 60_000;

function readFallbackModels(primary: string): string[] {
  const raw = process.env.AI_MODEL_FALLBACKS ?? "";
  return raw
    .split(",")
    .map((name) => name.trim())
    .filter((name) => name.length > 0 && name !== primary);
}

function apiKey(): string {
  const key = process.env.OPENROUTER_API_KEY?.trim();
  if (!key) {
    throw aiConfigurationError(
      "OPENROUTER_API_KEY is not set, so the openrouter provider cannot serve requests.",
      { provider: PROVIDER_ID, detail: "missing OPENROUTER_API_KEY" }
    );
  }
  return key;
}

interface OpenRouterMessage {
  role: string;
  content: string;
}

interface OpenRouterResponse {
  id?: string;
  model?: string;
  choices?: Array<{
    message?: { content?: string };
    finish_reason?: string;
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

interface OpenRouterErrorBody {
  error?: { code?: number; message?: string };
}

export class OpenRouterProvider implements AIProvider {
  readonly id = PROVIDER_ID;

  /** Model from `OPENROUTER_MODEL`, falling back to the default. */
  get defaultModel(): string {
    return process.env.OPENROUTER_MODEL?.trim() || DEFAULT_MODEL;
  }

  isAvailable(): boolean {
    return Boolean(process.env.OPENROUTER_API_KEY?.trim());
  }

  async generateText(
    input: AITextGenerationInput
  ): Promise<AITextGenerationResult> {
    const body = buildRequestBody(input);
    const { json, modelUsed, attempts } = await executeWithResilience(
      input.model ?? this.defaultModel,
      body
    );
    const result = toResult(json, modelUsed);
    return {
      ...result,
      metadata: { ...result.metadata, attempts, fallbackUsed: modelUsed !== (input.model ?? this.defaultModel) },
    };
  }

  /**
   * Structured path: requests `response_format: json_schema` with
   * the exact schema, `provider: { require_parameters: true }` so
   * OpenRouter only routes to endpoints that support structured
   * output, and `reasoning: { effort: "low" }` to keep thinking
   * overhead down. The schema is also appended to the prompt so
   * the model returns precisely those keys.
   *
   * If the endpoint rejects the strict request (HTTP 400 — some
   * providers reject strict schemas or the reasoning option), it
   * retries once with `type: "json_object"` and the schema in the
   * prompt, dropping the reasoning hint. The service still
   * JSON-parses the text and the caller still Zod-validates —
   * this layer maximizes compliance, it does not declare it.
   */
  async generateStructured(
    input: AIStructuredGenerationInput
  ): Promise<AITextGenerationResult> {
    const primary = input.model ?? this.defaultModel;
    const prompt = `${input.prompt}\n\n${describeShape(input.jsonSchema)}`;

    const strictBody = buildRequestBody({ ...input, prompt });
    strictBody.response_format = {
      type: "json_schema",
      json_schema: {
        name: input.jsonSchema.name,
        strict: true,
        schema: input.jsonSchema.schema,
      },
    };
    strictBody.provider = { require_parameters: true };
    strictBody.reasoning = { effort: "low" };

    let outcome: Awaited<ReturnType<typeof executeWithResilience>>;
    try {
      outcome = await executeWithResilience(primary, strictBody);
    } catch (error) {
      if (!isBadRequest(error)) throw error;
      const looseBody = buildRequestBody({ ...input, prompt });
      looseBody.response_format = { type: "json_object" };
      outcome = await executeWithResilience(primary, looseBody);
    }

    return extractStructuredResult(
      outcome.json,
      outcome.modelUsed,
      outcome.attempts,
      primary
    );
  }
}

interface OpenRouterRequestBody {
  model: string;
  messages: OpenRouterMessage[];
  temperature?: number;
  max_tokens?: number;
  /** Low-effort reasoning, where the serving model accepts it. */
  reasoning?: { effort: "low" };
  response_format?: {
    type: "json_schema" | "json_object";
    json_schema?: { name: string; strict: true; schema: Record<string, unknown> };
  };
  provider?: { require_parameters: boolean };
}

function buildRequestBody(input: AITextGenerationInput): OpenRouterRequestBody {
  const messages: OpenRouterMessage[] = [];
  if (input.system?.trim()) {
    messages.push({ role: "system", content: input.system.trim() });
  }
  messages.push({ role: "user", content: input.prompt });

  const body: OpenRouterRequestBody = { model: "", messages };
  if (typeof input.temperature === "number") {
    body.temperature = Math.min(Math.max(input.temperature, 0), 2);
  }
  if (typeof input.maxTokens === "number") {
    body.max_tokens = Math.floor(input.maxTokens);
  }
  return body;
}

function describeShape(jsonSchema: AIStructuredGenerationInput["jsonSchema"]): string {
  const schema = jsonSchema.schema as {
    properties?: Record<string, { type?: string; items?: { type?: string } }>;
    required?: string[];
  };
  const properties = schema.properties ?? {};
  const required = new Set(schema.required ?? []);
  const lines = Object.entries(properties).map(([key, def]) => {
    const type =
      def.type === "array"
        ? `${def.items?.type ?? "string"}[]`
        : (def.type ?? "string");
    return `- "${key}" (${type})${required.has(key) ? " [required]" : ""}`;
  });
  return [
    `Return exactly the keys of the "${jsonSchema.name}" shape and no others:`,
    ...lines,
    "Do not rename, add, or omit keys. Respond with JSON only.",
  ].join("\n");
}

/**
 * Validates and normalizes a structured-response body.
 *
 * Reads only `choices[0].message.content` (any reasoning field
 * the model emits is ignored), strips a markdown code fence, and
 * fails with a `parse_failed` the route can retry when the
 * content is empty or not JSON.
 */
function extractStructuredResult(
  json: OpenRouterResponse,
  modelUsed: string,
  attempts: number,
  primary: string
): AITextGenerationResult {
  const content = json.choices?.[0]?.message?.content;
  if (!content?.trim()) {
    throw aiParseError(
      "The openrouter provider returned empty content.",
      { provider: PROVIDER_ID, model: modelUsed, detail: "empty content" }
    );
  }

  const text = stripCodeFence(content);
  try {
    JSON.parse(text);
  } catch {
    throw aiParseError(
      "The openrouter provider returned content that is not valid JSON.",
      {
        provider: PROVIDER_ID,
        model: modelUsed,
        detail: "invalid JSON in content",
      }
    );
  }

  const result = toResult(json, modelUsed);
  return {
    ...result,
    text,
    metadata: {
      ...result.metadata,
      attempts,
      fallbackUsed: modelUsed !== primary,
    },
  };
}

/** True for HTTP 400 — the one status the structured path retries on. */
function isBadRequest(error: unknown): boolean {
  return error instanceof AIError && error.status === 400;
}

/** Removes a surrounding markdown code fence, if present. */
function stripCodeFence(text: string): string {
  const trimmed = text.trim();
  const fenced = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(trimmed);
  return fenced ? fenced[1].trim() : trimmed;
}

async function executeWithResilience(
  primary: string,
  body: OpenRouterRequestBody
): Promise<{ json: OpenRouterResponse; modelUsed: string; attempts: number }> {
  const models = [primary, ...readFallbackModels(primary)];
  let attempts = 0;
  let lastError: unknown = null;

  for (const model of models) {
    const maxAttempts =
      model === primary ? MAX_PRIMARY_ATTEMPTS : MAX_FALLBACK_ATTEMPTS;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      attempts += 1;
      try {
        const json = await postToOpenRouter(model, body);
        return { json, modelUsed: model, attempts };
      } catch (error) {
        lastError = error;
        const isLastOverall =
          model === models[models.length - 1] && attempt === maxAttempts - 1;
        if (!isTransient(error) || isLastOverall) throw error;
        const retryAfterMs = readRetryAfterMs(error);
        await sleep(retryAfterMs ?? backoffDelay(attempt));
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : aiRequestFailedError("The openrouter provider request failed.", {
        provider: PROVIDER_ID,
      });
}

/** Transient = worth retrying: 429, any 5xx, or a network timeout. Never auth or bad-request errors. */
function isTransient(error: unknown): boolean {
  if (!(error instanceof AIError)) return false;
  if (error.status === 429) return true;
  if (error.status !== undefined && error.status >= 500 && error.status < 600) {
    return true;
  }
  return (
    error.code === "unavailable" &&
    (error.detail === "timeout" || error.detail === "network failure")
  );
}

/**
 * Reads a Retry-After delay (in milliseconds) attached to a thrown error by
 * `postToOpenRouter`. Returns null when the vendor did not send one.
 */
function readRetryAfterMs(error: unknown): number | null {
  if (!(error instanceof AIError)) return null;
  const retryAfterMs = (error as AIError & { retryAfterMs?: number }).retryAfterMs;
  return typeof retryAfterMs === "number" && retryAfterMs >= 0 ? retryAfterMs : null;
}

function backoffDelay(failedAttempt: number): number {
  const base = BACKOFF_BASE_MS[Math.min(failedAttempt, BACKOFF_BASE_MS.length - 1)];
  return Math.round(base * (0.8 + Math.random() * 0.4));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function postToOpenRouter(
  model: string,
  body: OpenRouterRequestBody
): Promise<OpenRouterResponse> {
  const key = apiKey();
  const url = `${API_BASE}/chat/completions`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${key}`,
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
        "X-Title": "Ka-Lakbay",
      },
      body: JSON.stringify({ ...body, model }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    if (error instanceof AIError) throw error;
    throw aiUnavailableError(
      "The openrouter provider could not be reached.",
      { provider: PROVIDER_ID, model, detail: networkDetail(error) }
    );
  }

  if (!response.ok) {
    const rawBody = await response.text().catch(() => "");
    const error = mapHttpError(response.status, rawBody);
    const retryAfterMs = parseRetryAfterMs(response.headers);
    if (retryAfterMs !== null) {
      (error as AIError & { retryAfterMs?: number }).retryAfterMs = retryAfterMs;
    }
    throw error;
  }

  return (await response.json()) as OpenRouterResponse;
}

/**
 * Parses the Retry-After header (delta-seconds form) into milliseconds,
 * capped at `MAX_RETRY_AFTER_MS`. Returns null when absent or unparseable.
 */
function parseRetryAfterMs(headers: Headers): number | null {
  const value = headers.get("retry-after");
  if (!value) return null;
  const seconds = Number(value);
  if (!Number.isFinite(seconds) || seconds < 0) return null;
  return Math.min(seconds * 1000, MAX_RETRY_AFTER_MS);
}

function toResult(
  json: OpenRouterResponse,
  model: string
): AITextGenerationResult {
  const text = json.choices?.[0]?.message?.content ?? "";
  const usage = json.usage;
  return {
    text,
    model,
    provider: PROVIDER_ID,
    usage:
      usage &&
      (usage.prompt_tokens !== undefined ||
        usage.completion_tokens !== undefined ||
        usage.total_tokens !== undefined)
        ? {
            inputTokens: usage.prompt_tokens,
            outputTokens: usage.completion_tokens,
            totalTokens: usage.total_tokens,
          }
        : undefined,
    metadata: { finishReason: json.choices?.[0]?.finish_reason ?? null },
  };
}

/** Maps HTTP status onto the stable `AIError` categories. */
function mapHttpError(status: number, rawBody: string): AIError {
  let vendorCode: number | null = null;
  try {
    const body = JSON.parse(rawBody) as OpenRouterErrorBody;
    vendorCode = body.error?.code ?? null;
  } catch {
    // ignore parse failure
  }

  if (status === 401 || status === 403) {
    return aiAuthenticationError("The openrouter provider rejected the API key.", {
      provider: PROVIDER_ID,
      status,
      detail: `http ${status}`,
    });
  }
  if (status === 429) {
    return aiRateLimitError("The openrouter provider rate-limited the request.", {
      provider: PROVIDER_ID,
      status,
      detail: `http ${status}`,
    });
  }
  if (status >= 500 && status < 600) {
    return aiUnavailableError(
      "Lory's servers are really busy right now, try again in a minute.",
      { provider: PROVIDER_ID, status, detail: `http ${status}` }
    );
  }
  if (vendorCode === 402) {
    return aiRequestFailedError(
      "The openrouter provider requires credits for this model.",
      { provider: PROVIDER_ID, status, detail: "insufficient credits" }
    );
  }
  return aiRequestFailedError("The openrouter provider request failed.", {
    provider: PROVIDER_ID,
    status,
    detail: `http ${status}`,
  });
}

function networkDetail(error: unknown): string {
  if (error instanceof Error && error.name === "TimeoutError") {
    return "timeout";
  }
  return "network failure";
}
