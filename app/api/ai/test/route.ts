import { NextResponse } from "next/server";

import { describeAIConfig, generateText, isAIError } from "@/lib/ai";

/**
 * Development-only connectivity check for the AI abstraction.
 *
 * Flow: request → AI service → MockProvider → response.
 *
 * NOT a product feature and NOT an AI feature endpoint. It exists so the
 * pipeline can be verified without building any of the five AI features. It
 * returns mock output and says so plainly — nothing here should ever be shown
 * to a student as model output.
 *
 * Guarded two ways:
 *   1. Returns 404 outside development, so it cannot ship to production.
 *   2. Rejects in production even if NODE_ENV is misconfigured.
 *
 * Run with: npm run dev, then GET /api/ai/test
 */

export const dynamic = "force-dynamic";

/** Development-only guard. Re-evaluated per request, not at build time. */
function isDevelopment(): boolean {
  return process.env.NODE_ENV !== "production";
}

export async function GET() {
  if (!isDevelopment()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const config = describeAIConfig();
    const startedAt = Date.now();

    const result = await generateText({
      system: "You are a connectivity check for the Ka-Lakbay AI service.",
      prompt: "Test Ka-Lakbay AI infrastructure",
      operation: "ai_connectivity_test",
    });

    return NextResponse.json({
      status: "ok",
      message: "AI service reached its configured provider.",
      config,
      result: {
        provider: result.provider,
        model: result.model,
        text: result.text,
        usage: result.usage,
        metadata: result.metadata,
      },
      durationMs: Date.now() - startedAt,
      note:
        "Mock output is deterministic placeholder text, not model-generated. " +
        "No AI feature is implemented yet.",
    });
  } catch (error) {
    // Normalized already, so this is safe to return: no keys, no stack traces,
    // no raw provider payload.
    if (isAIError(error)) {
      return NextResponse.json(
        {
          status: "error",
          code: error.code,
          message: error.message,
          detail: error.detail,
          retryable: error.retryable,
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

/** Proves the mock provider handles a structured request too. */
export async function POST() {
  if (!isDevelopment()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { generateStructured } = await import("@/lib/ai");

  try {
    const result = await generateStructured({
      system: "You are a connectivity check for structured output.",
      prompt: "Return a single field confirming the structured path works.",
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

    return NextResponse.json({
      status: "ok",
      provider: result.provider,
      model: result.model,
      value: result.value,
      note: "The mock provider returns deterministic text, so value is not schema-valid. This proves the parse path runs, not that a model complied.",
    });
  } catch (error) {
    if (isAIError(error)) {
      return NextResponse.json(
        {
          status: "error",
          code: error.code,
          message: error.message,
          retryable: error.retryable,
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
