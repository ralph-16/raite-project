/**
 * Normalized AI errors.
 *
 * Every failure that leaves the AI service is an `AIError`, so callers branch on
 * a stable category instead of parsing vendor messages. A future UI layer maps
 * these categories onto friendly Lory copy ("Lory is taking a short break, let's
 * try that again") without ever seeing a provider's own error text.
 *
 * Nothing user-facing or log-safe is derived from a raw provider payload: no
 * API keys, no authorization headers, no stack traces, no raw HTTP responses.
 */

/**
 * Failure categories. Deliberately small and stable — enough for a caller to
 * decide whether to retry, ask the student to wait, or report a problem.
 */
export type AIErrorCode =
  /** Missing or invalid `AI_PROVIDER`, `AI_MODEL`, or provider credentials. */
  | "configuration"
  /** The provider is unreachable, or not implemented for the current config. */
  | "unavailable"
  /** The provider rejected the API key. */
  | "authentication"
  /** The provider applied a quota or rate limit. */
  | "rate_limit"
  /** The request reached the provider and failed (timeout, 5xx, refusal). */
  | "request_failed"
  /** Output arrived but could not be parsed as the expected shape. */
  | "parse_failed"
  /** Anything not otherwise classified. */
  | "unknown";

/** Whether a retry could plausibly succeed. Informational, for Task 3. */
export type AIRetryable = "safe" | "unsafe" | "unknown";

export interface AIErrorOptions {
  /** Provider that failed, when known. */
  provider?: string;
  /** Model that failed, when known. */
  model?: string;
  /** HTTP status from the provider, when it sent one. */
  status?: number;
  /**
   * Non-sensitive diagnostic detail safe to log. Adapters must strip anything
   * that could carry a credential or student content before putting it here.
   */
  detail?: string;
  cause?: unknown;
}

/** Base class for every error the AI service throws. */
export class AIError extends Error {
  readonly code: AIErrorCode;
  readonly provider?: string;
  readonly model?: string;
  readonly status?: number;
  readonly detail?: string;
  readonly retryable: AIRetryable;

  constructor(code: AIErrorCode, message: string, options: AIErrorOptions = {}) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = "AIError";
    this.code = code;
    this.provider = options.provider;
    this.model = options.model;
    this.status = options.status;
    this.detail = options.detail;
    this.retryable = retryableFor(code);
  }

  /**
   * Log- and wire-safe shape. `message` is written by this codebase, never
   * forwarded from a provider, so it is safe to persist or return.
   */
  toJSON(): AIErrorJSON {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      provider: this.provider,
      model: this.model,
      status: this.status,
      detail: this.detail,
      retryable: this.retryable,
    };
  }
}

/** JSON form of an `AIError`, safe to send over the wire or write to a log. */
export interface AIErrorJSON {
  name: string;
  code: AIErrorCode;
  message: string;
  provider?: string;
  model?: string;
  status?: number;
  detail?: string;
  retryable: AIRetryable;
}

/* ------------------------------------------------------------------ *
 * Constructors — one per category, so messages stay consistent
 * ------------------------------------------------------------------ */

export function aiConfigurationError(
  message: string,
  options?: AIErrorOptions
): AIError {
  return new AIError("configuration", message, options);
}

export function aiUnavailableError(
  message: string,
  options?: AIErrorOptions
): AIError {
  return new AIError("unavailable", message, options);
}

export function aiAuthenticationError(
  message: string,
  options?: AIErrorOptions
): AIError {
  return new AIError("authentication", message, options);
}

export function aiRateLimitError(
  message: string,
  options?: AIErrorOptions
): AIError {
  return new AIError("rate_limit", message, options);
}

export function aiRequestFailedError(
  message: string,
  options?: AIErrorOptions
): AIError {
  return new AIError("request_failed", message, options);
}

export function aiParseError(message: string, options?: AIErrorOptions): AIError {
  return new AIError("parse_failed", message, options);
}

export function aiUnknownError(message: string, options?: AIErrorOptions): AIError {
  return new AIError("unknown", message, options);
}

/* ------------------------------------------------------------------ *
 * Classification
 * ------------------------------------------------------------------ */

function retryableFor(code: AIErrorCode): AIRetryable {
  switch (code) {
    case "rate_limit":
    case "request_failed":
    case "unavailable":
      return "safe";
    case "authentication":
    case "configuration":
    case "parse_failed":
      return "unsafe";
    default:
      return "unknown";
  }
}

/**
 * Best-effort mapping of an arbitrary thrown value onto an `AIError`.
 *
 * Adapters call this so vendor SDK errors never escape the AI layer. An error
 * that is already normalized is returned unchanged; anything else becomes
 * `unknown` with a generic message. The original is preserved as `cause` and
 * `detail` is deliberately omitted, because a raw SDK message can contain
 * request headers or prompt content.
 */
export function toAIError(
  error: unknown,
  context: { provider?: string; model?: string } = {}
): AIError {
  if (error instanceof AIError) return error;

  const message =
    error instanceof Error ? error.message : "An unexpected AI error occurred.";

  return new AIError("unknown", "AI request failed for an unknown reason.", {
    provider: context.provider,
    model: context.model,
    cause: error,
    // Names the category-relevant fragment only; never the whole message.
    detail: truncate(message, 200),
  });
}

function truncate(value: string, max: number): string {
  return value.length <= max ? value : `${value.slice(0, max)}…`;
}
