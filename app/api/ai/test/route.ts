import { NextResponse } from "next/server";

import { generateText, isAIError } from "@/lib/ai";

/**
 * Development-only connectivity check for the AI service.
 *
 * Flow: request → AI service → configured provider → response.
 *
 * NOT a product feature and NOT an AI feature endpoint. It exists so the
 * pipeline to the configured provider can be verified end to end. Nothing
 * returned here is student-facing, and model output is reported as opaque
 * text — never as a verified diagnostic.
 *
 * Guarded two ways:
 *   1. Returns 404 outside development, so it cannot ship to production.
 *   2. Rejects in production even if NODE_ENV is misconfigured.
 *
 * Run with: npm run dev, then GET /api/ai/test
 */

export const dynamic = "force-dynamic";

/**
 * Minimal deterministic prompt. Success is defined strictly as the model
 * echoing this token back, so the check cannot pass on unrelated prose.
 */
const CONNECTIVITY_TOKEN = "KA-LAKBAY-AI-ONLINE";

/** Development-only guard. Re-evaluated per request, not at build time. */
function isDevelopment(): boolean {
  return process.env.NODE_ENV !== "production";
}

export async function GET() {
  if (!isDevelopment()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const startedAt = Date.now();

  try {
    const result = await generateText({
      system: "You are a connectivity check. Follow the instruction exactly.",
      prompt: `Respond with exactly: ${CONNECTIVITY_TOKEN}`,
      operation: "ai_connectivity_test",
    });

    const matched = result.text.trim() === CONNECTIVITY_TOKEN;

    return NextResponse.json({
      status: matched ? "ok" : "mismatch",
      provider: result.provider,
      model: result.model,
      matched,
      durationMs: Date.now() - startedAt,
      // Opaque model output, reported for debugging only — not a diagnostic.
      text: result.text,
      usage: result.usage,
      ...(matched
        ? {}
        : {
            message:
              "The provider responded, but the output did not match the expected token.",
          }),
    });
  } catch (error) {
    // Normalized already, so this is safe to return: no keys, no stack traces,
    // no raw provider payload.
    if (isAIError(error)) {
      return NextResponse.json(
        {
          status: "error",
          provider: error.provider,
          model: error.model,
          code: error.code,
          message: error.message,
          detail: error.detail,
          retryable: error.retryable,
          durationMs: Date.now() - startedAt,
        },
        { status: 503 }
      );
    }

    // Defensive: anything unrecognized is reported without detail.
    return NextResponse.json(
      { status: "error", code: "unknown", message: "Unexpected AI failure." },
      { status: 500 }
    );
  }
}

/** Exercises the structured-output path against the configured provider. */
export async function POST() {
  if (!isDevelopment()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { generateStructured } = await import("@/lib/ai");
  const startedAt = Date.now();

  try {
    const result = await generateStructured({
      system: "You are a connectivity check. Respond with JSON only.",
      prompt: `Respond with exactly this JSON object: {"ok": true}`,
      jsonSchema: {
        name: "ConnectivityCheck",
        description: "Minimal shape used only to exercise JSON handling.",
        schema: {
          type: "object",
          properties: { ok: { type: "boolean" } },
          required: ["ok"],
        },
      },
      operation: "ai_structured_connectivity_test",
    });

    const value = result.value as { ok?: unknown } | null;
    const matched =
      typeof value === "object" && value !== null && value.ok === true;

    return NextResponse.json({
      status: matched ? "ok" : "mismatch",
      provider: result.provider,
      model: result.model,
      matched,
      durationMs: Date.now() - startedAt,
      value: result.value,
    });
  } catch (error) {
    if (isAIError(error)) {
      return NextResponse.json(
        {
          status: "error",
          provider: error.provider,
          model: error.model,
          code: error.code,
          message: error.message,
          retryable: error.retryable,
          durationMs: Date.now() - startedAt,
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { status: "error", code: "unknown", message: "Unexpected AI failure." },
      { status: 500 }
    );
  }
}
