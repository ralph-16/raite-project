import "server-only";

/**
 * Logging.
 *
 * Metadata only. Prompt and response bodies are student personal data, so they
 * are never logged — not even in development. What is logged is provider, model,
 * duration, outcome and error category, which is enough to debug a pipeline
 * without putting anything sensitive in a terminal or log aggregator.
 *
 * Silent unless `AI_DEBUG=1` (or enabled by default in development), and always
 * silent in production.
 */

import type { AIError } from "./errors";
import type { AIProviderName } from "./types";

export interface AILogFields {
  operation?: string;
  provider?: AIProviderName;
  model?: string;
  durationMs?: number;
  /** Coarse token counts. Never content. */
  usage?: { inputTokens?: number; outputTokens?: number; totalTokens?: number };
}

/** Prevents a student's text reaching a log line via an unexpected field. */
const REDACTED = "[redacted]";

function shouldLog(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  if (process.env.AI_DEBUG === "0") return false;
  return process.env.AI_DEBUG === "1" || process.env.NODE_ENV === "development";
}

export function logAIRequest(fields: AILogFields): void {
  if (!shouldLog()) return;
  console.info("[ai] request", safe(fields));
}

export function logAISuccess(fields: AILogFields): void {
  if (!shouldLog()) return;
  console.info("[ai] success", safe(fields));
}

export function logAIError(error: AIError, fields: AILogFields = {}): void {
  if (!shouldLog()) return;
  console.error("[ai] error", {
    ...safe(fields),
    code: error.code,
    retryable: error.retryable,
    status: error.status,
    detail: error.detail,
  });
}

/**
 * Whitelists the fields that are safe to emit. Anything else — a prompt, a
 * response, a resume excerpt — is dropped rather than trusted.
 */
function safe(fields: AILogFields): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (fields.operation) out.operation = fields.operation;
  if (fields.provider) out.provider = fields.provider;
  if (fields.model) out.model = fields.model;
  if (typeof fields.durationMs === "number") out.durationMs = fields.durationMs;
  if (fields.usage) {
    out.usage = {
      inputTokens: fields.usage.inputTokens,
      outputTokens: fields.usage.outputTokens,
      totalTokens: fields.usage.totalTokens,
    };
  }
  return Object.keys(out).length > 0 ? out : { note: REDACTED };
}
