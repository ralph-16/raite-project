/**
 * Shared AI types.
 *
 * These describe the data exchanged between Ka-Lakbay's application code (the
 * future Student Profiler, Career Matcher, Roadmap Generator, Learning Companion
 * and Skill Evaluator) and the AI service (`lib/ai/index.ts`). They are
 * deliberately provider-agnostic: no Gemini, OpenAI, Anthropic or other vendor
 * type appears here, so the provider can be chosen later without changing a
 * single feature.
 *
 * This mirrors the approach already used in `lib/auth/types.ts`.
 */

/* ------------------------------------------------------------------ *
 * Provider selection
 * ------------------------------------------------------------------ */

/**
 * Identifiers of providers Ka-Lakbay knows how to construct. Adding a provider
 * means adding a case in `lib/ai/provider.ts` and one file under
 * `lib/ai/providers/` — no feature code changes.
 */
export type AIProviderId = "mock";

/** Provider actually serving a request. May differ from the configured one. */
export type AIProviderName = string;

/* ------------------------------------------------------------------ *
 * Text generation
 * ------------------------------------------------------------------ */

/**
 * Instruction that frames the whole conversation, separate from the prompt
 * content. Providers that have no system-role concept fold this into the
 * prompt themselves (see `lib/ai/providers/mock.ts`).
 */
export interface AITextGenerationInput {
  system?: string;
  prompt: string;
  /** Overrides the configured default model for this call. */
  model?: string;
  /** 0–1. Providers may clamp or ignore this; the mock provider ignores it. */
  temperature?: number;
  maxTokens?: number;
  /** Stable identifier used to correlate logs across a feature's calls. */
  operation?: string;
}

/**
 * Token accounting, where the provider reports it. Left optional throughout
 * because not every provider exposes it, and a missing count must never fail a
 * request.
 */
export interface AIUsage {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
}

/**
 * Result of a text generation call. `provider` and `model` are always populated
 * so a caller can record which model produced something — the columns the
 * database already expects (`ai_context_model`, `model_identifier`,
 * `generation_metadata`).
 */
export interface AITextGenerationResult {
  text: string;
  model: string;
  provider: AIProviderName;
  usage?: AIUsage;
  /** Provider-neutral extras (finish reason, latency, request id). */
  metadata?: Record<string, unknown>;
}

/* ------------------------------------------------------------------ *
 * Structured generation
 * ------------------------------------------------------------------ */

/**
 * Schema hint for structured output. A structural description of the JSON the
 * caller wants — deliberately *not* a Zod schema, so this module stays free of a
 * validation dependency. Task 2 introduces Zod and maps it onto this shape.
 */
export interface AIJsonSchema {
  name: string;
  description?: string;
  /** JSON Schema object, or a compact description of the expected shape. */
  schema: Record<string, unknown>;
}

/**
 * Structured generation options. Schema-driven validation is a caller concern:
 * the service returns raw output plus the text it was parsed from, and the
 * caller validates. See `generateStructured` in `lib/ai/index.ts`.
 */
export interface AIStructuredGenerationInput extends AITextGenerationInput {
  jsonSchema: AIJsonSchema;
}

/** Result of a structured call. `value` is `unknown` until the caller validates. */
export interface AIStructuredGenerationResult {
  value: unknown;
  /** The raw text `value` was parsed from, kept for logging and debugging. */
  rawText: string;
  model: string;
  provider: AIProviderName;
  usage?: AIUsage;
  metadata?: Record<string, unknown>;
}

/* ------------------------------------------------------------------ *
 * Provider contract
 * ------------------------------------------------------------------ */

/**
 * The contract every provider adapter implements. Feature code never sees this
 * directly — it goes through the AI service, which resolves and normalizes.
 *
 * Adapters own every vendor type: vendor request and response shapes, SDK
 * imports, and error mapping all stay inside `lib/ai/providers/*.ts`.
 */
export interface AIProvider {
  /** Stable identifier, matching the `AIProviderId` used to select it. */
  readonly id: AIProviderName;

  /** Default model, used when a call does not specify one. */
  readonly defaultModel: string;

  /**
   * Whether this provider can serve requests right now. The mock provider is
   * always available; a real adapter would check for credentials here so a
   * missing key surfaces as a configuration error rather than a request
   * failure.
   */
  isAvailable(): boolean;

  generateText(input: AITextGenerationInput): Promise<AITextGenerationResult>;

  /**
   * Optional capability. A provider that cannot guarantee JSON output leaves it
   * unimplemented, and the service falls back to `generateText` plus JSON
   * extraction. Present as a distinct method (rather than a flag) so adapters
   * can rely on `jsonSchema` being honoured.
   */
  generateStructured?(
    input: AIStructuredGenerationInput
  ): Promise<AITextGenerationResult>;
}
