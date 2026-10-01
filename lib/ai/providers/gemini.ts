import "server-only";

/**
 * Gemini provider — the first real model adapter.
 *
 * Server-only REST adapter for the Generative Language API
 * (`generativelanguage.googleapis.com`). No SDK dependency: plain `fetch`
 * keeps the vendor surface small and every vendor type inside this file, per
 * the provider contract in `../types.ts`.
 *
 * Feature code never imports this. It goes through the AI service
 * (`../index.ts`), which resolves, normalizes, and converts every failure
 * into an `AIError` — nothing vendor-shaped escapes.
 */

import {
  aiAuthenticationError,
  aiConfigurationError,
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

const PROVIDER_ID = "gemini";

/** Default model. Override per call or via `AI_MODEL`. */
const DEFAULT_MODEL = "gemini-3.8-flash";

const API_BASE = "https://generativelanguage.googleapis.com";
const REQUEST_TIMEOUT_MS = 30_000;

/**
 * Resilience policy (FIX B): up to 3 attempts on the primary model with
 * ~1s then ~2.5s backoff (jittered), then one attempt per fallback model.
 * Only transient failures retry — 503/429 and network timeouts. Auth and
 * bad-request failures throw immediately.
 */
const MAX_PRIMARY_ATTEMPTS = 3;
const MAX_FALLBACK_ATTEMPTS = 1;
const BACKOFF_BASE_MS = [1000, 2500];

/** Comma-separated fallback models, e.g. "gemini-3.8-flash,gemini-3.6-flash". */
function readFallbackModels(primary: string): string[] {
  const raw = process.env.AI_MODEL_FALLBACKS ?? "";
  return raw
    .split(",")
    .map((name) => name.trim())
    .filter((name) => name.length > 0 && name !== primary);
}

function apiKey(): string {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) {
    throw aiConfigurationError(
      "GEMINI_API_KEY is not set, so the gemini provider cannot serve requests.",
      { provider: PROVIDER_ID, detail: "missing GEMINI_API_KEY" }
    );
  }
  return key;
}

interface GeminiPart {
  text?: string;
}

interface GeminiContent {
  role?: string;
  parts?: GeminiPart[];
}

interface GeminiCandidate {
  content?: GeminiContent;
  finishReason?: string;
}

interface GeminiUsage {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  totalTokenCount?: number;
}

interface GeminiSuccessBody {
  candidates?: GeminiCandidate[];
  promptFeedback?: { blockReason?: string };
  usageMetadata?: GeminiUsage;
}

interface GeminiErrorBody {
  error?: { code?: number; status?: string; message?: string };
}

export class GeminiProvider implements AIProvider {
  readonly id = PROVIDER_ID;
  readonly defaultModel = DEFAULT_MODEL;

  /** Servable when credentials exist. The service re-checks per request. */
  isAvailable(): boolean {
    return Boolean(process.env.GEMINI_API_KEY?.trim());
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
   * Structured path: requests `application/json`, forwards a sanitized copy
   * of the caller's schema as `responseSchema`, and appends the exact shape
   * to the prompt so the model returns precisely those keys. The service
   * still JSON-parses the text and the caller still Zod-validates — this
   * layer maximizes compliance, it does not declare it.
   */
  async generateStructured(
    input: AIStructuredGenerationInput
  ): Promise<AITextGenerationResult> {
    const primary = input.model ?? this.defaultModel;
    const body = buildRequestBody({
      ...input,
      prompt: `${input.prompt}\n\n${describeShape(input.jsonSchema)}`,
    });
    body.generationConfig = {
      ...body.generationConfig,
      responseMimeType: "application/json",
      ...(input.jsonSchema?.schema &&
      typeof input.jsonSchema.schema === "object"
        ? { responseSchema: sanitizeSchema(input.jsonSchema.schema) }
        : {}),
    };
    const { json, modelUsed, attempts } = await executeWithResilience(primary, body);
    const result = toResult(json, modelUsed);
    return {
      ...result,
      metadata: { ...result.metadata, attempts, fallbackUsed: modelUsed !== primary },
    };
  }
}

interface GeminiRequestBody {
  system_instruction?: { parts: Array<{ text: string }> };
  contents: Array<{
    role: string;
    parts: Array<{ text?: string; inline_data?: { mime_type: string; data: string } }>;
  }>;
  generationConfig?: Record<string, unknown>;
}

function buildRequestBody(
  input: AITextGenerationInput
): GeminiRequestBody {
  const parts: Array<{ text?: string; inline_data?: { mime_type: string; data: string } }> = [
    { text: input.prompt },
  ];
  for (const attachment of input.attachments ?? []) {
    parts.push({
      inline_data: { mime_type: attachment.mimeType, data: attachment.base64Data },
    });
  }
  const body: GeminiRequestBody = {
    contents: [{ role: "user", parts }],
  };
  if (input.system?.trim()) {
    body.system_instruction = { parts: [{ text: input.system.trim() }] };
  }
  const generationConfig: Record<string, unknown> = {};
  if (typeof input.temperature === "number") {
    generationConfig.temperature = Math.min(Math.max(input.temperature, 0), 2);
  }
  if (typeof input.maxTokens === "number") {
    generationConfig.maxOutputTokens = Math.floor(input.maxTokens);
  }
  if (Object.keys(generationConfig).length > 0) {
    body.generationConfig = generationConfig;
  }
  return body;
}

/**
 * Allowlist sanitizer for Gemini `responseSchema`, which accepts a subset of
 * JSON Schema / OpenAPI 3.0. Anything else (e.g. `$schema`,
 * `additionalProperties`, `pattern`) makes the API reject the request, so
 * unknown keywords are dropped recursively rather than trusted.
 */
const SCHEMA_ALLOWLIST = new Set([
  "type",
  "format",
  "description",
  "nullable",
  "enum",
  "maxItems",
  "minItems",
  "properties",
  "required",
  "items",
]);

function sanitizeSchema(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitizeSchema);
  if (value !== null && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
      // `properties` maps field names (not schema keywords) to schemas —
      // keep every field name and sanitize each subschema.
      if (key === "properties" && entry !== null && typeof entry === "object") {
        const props: Record<string, unknown> = {};
        for (const [name, sub] of Object.entries(entry)) {
          props[name] = sanitizeSchema(sub);
        }
        out[key] = props;
        continue;
      }
      if (!SCHEMA_ALLOWLIST.has(key)) continue;
      out[key] = sanitizeSchema(entry);
    }
    return out;
  }
  return value;
}

/**
 * Renders the expected shape verbatim (field names, types, required keys)
 * with an instruction to return exactly those keys and no others. Derived
 * from the caller's schema — which mirrors the Zod schema — so there is one
 * source of truth, enforced again by Zod after parsing.
 */
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
 * Runs one request with retries and model fallbacks. Returns the parsed
 * body plus which model actually answered (surfaced in `result.model`, which
 * the service logs). Throws the last error when everything is exhausted —
 * callers map it onto user-facing copy.
 */
async function executeWithResilience(
  primary: string,
  body: GeminiRequestBody
): Promise<{ json: GeminiSuccessBody; modelUsed: string; attempts: number }> {
  const models = [primary, ...readFallbackModels(primary)];
  let attempts = 0;
  let lastError: unknown = null;

  for (const model of models) {
    const maxAttempts =
      model === primary ? MAX_PRIMARY_ATTEMPTS : MAX_FALLBACK_ATTEMPTS;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      attempts += 1;
      try {
        const json = await postToGemini(model, body);
        return { json, modelUsed: model, attempts };
      } catch (error) {
        lastError = error;
        const isLastOverall =
          model === models[models.length - 1] && attempt === maxAttempts - 1;
        if (!isTransient(error) || isLastOverall) throw error;
        await sleep(backoffDelay(attempt));
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : aiRequestFailedError("The gemini provider request failed.", {
        provider: PROVIDER_ID,
      });
}

/** Transient = worth retrying: 503, 429, or a network timeout. Never auth or bad-request errors. */
function isTransient(error: unknown): boolean {
  if (!(error instanceof AIError)) return false;
  if (error.status === 503 || error.status === 429) return true;
  return (
    error.code === "unavailable" &&
    (error.detail === "timeout" || error.detail === "network failure")
  );
}

function backoffDelay(failedAttempt: number): number {
  const base = BACKOFF_BASE_MS[Math.min(failedAttempt, BACKOFF_BASE_MS.length - 1)];
  return Math.round(base * (0.8 + Math.random() * 0.4));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function postToGemini(
  model: string,
  body: GeminiRequestBody
): Promise<GeminiSuccessBody> {
  const key = apiKey();
  const url = `${API_BASE}/v1beta/models/${encodeURIComponent(model)}:generateContent`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Header auth keeps the key out of URLs (and therefore out of logs).
        "x-goog-api-key": key,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    if (error instanceof AIError) throw error;
    throw aiUnavailableError(
      "The gemini provider could not be reached.",
      { provider: PROVIDER_ID, model, detail: networkDetail(error) }
    );
  }

  if (!response.ok) {
    const rawBody = await response.text().catch(() => "");
    throw mapHttpError(response.status, statusFromText(rawBody, response.status));
  }

  const json = (await response.json()) as GeminiSuccessBody;
  const blockReason = json.promptFeedback?.blockReason;
  if (blockReason && (!json.candidates || json.candidates.length === 0)) {
    throw aiRequestFailedError(
      "The gemini provider declined the request.",
      { provider: PROVIDER_ID, model, detail: `blocked: ${blockReason}` }
    );
  }
  return json;
}

function toResult(
  json: GeminiSuccessBody,
  model: string
): AITextGenerationResult {
  const text =
    json.candidates
      ?.flatMap((candidate) => candidate.content?.parts ?? [])
      .map((part) => part.text ?? "")
      .join("") ?? "";

  const usage = json.usageMetadata;
  return {
    text,
    model,
    provider: PROVIDER_ID,
    usage:
      usage &&
      (usage.promptTokenCount !== undefined ||
        usage.candidatesTokenCount !== undefined ||
        usage.totalTokenCount !== undefined)
        ? {
            inputTokens: usage.promptTokenCount,
            outputTokens: usage.candidatesTokenCount,
            totalTokens: usage.totalTokenCount,
          }
        : undefined,
    metadata: { finishReason: json.candidates?.[0]?.finishReason ?? null },
  };
}

/** Maps HTTP status onto the stable `AIError` categories. */
function mapHttpError(status: number, vendorStatus: string | null): AIError {
  const detail = vendorStatus ?? `http ${status}`;
  if (status === 401 || status === 403) {
    return aiAuthenticationError("The gemini provider rejected the API key.", {
      provider: PROVIDER_ID,
      status,
      detail,
    });
  }
  if (status === 429) {
    return aiRateLimitError("The gemini provider rate-limited the request.", {
      provider: PROVIDER_ID,
      status,
      detail,
    });
  }
  if (status === 503) {
    // Distinct, honest overload message (retryable: safe). Raw vendor text
    // stays in the server log only — this string is written by us.
    return aiUnavailableError(
      "Lory's servers are really busy right now, try again in a minute.",
      { provider: PROVIDER_ID, status, detail }
    );
  }
  return aiRequestFailedError("The gemini provider request failed.", {
    provider: PROVIDER_ID,
    status,
    detail,
  });
}

/**
 * Reads only the vendor's machine-readable `status` enum (e.g.
 * `INVALID_ARGUMENT`) — never the message, which can echo request content.
 */
function statusFromText(text: string, httpStatus: number): string | null {
  try {
    const body = JSON.parse(text) as GeminiErrorBody;
    const status = body.error?.status?.trim();
    return status ? status : `http ${httpStatus}`;
  } catch {
    return `http ${httpStatus}`;
  }
}

/** Classifies a fetch-level failure without leaking its message verbatim. */
function networkDetail(error: unknown): string {
  if (error instanceof Error && error.name === "TimeoutError") {
    return "timeout";
  }
  return "network failure";
}
