import "server-only";

/**
 * Student Profiler — Ka-Lakbay's first AI vertical slice.
 *
 * Pipeline: structured onboarding context → Gemini → structured JSON →
 * Zod validation → typed Explorer Profile. Provider access goes only
 * through the AI service (`@/lib/ai`); validation happens here, where the
 * schema lives.
 */

import { generateStructured, isAIError } from "@/lib/ai";
import { aiParseError } from "@/lib/ai/errors";
import type { StructuredOnboardingPayload } from "@/lib/onboarding/structured-responses";
import { buildProfilerPrompt, PROFILER_SYSTEM_PROMPT, type ProfilerExtraContext } from "./prompt";
import {
  explorerProfileJsonSchema,
  explorerProfileSchema,
  type ExplorerProfile,
} from "./schema";

export type { ExplorerProfile };

export interface ProfilerResult {
  profile: ExplorerProfile;
  model: string;
  provider: string;
}

/**
 * Runs the profiler over already-structured onboarding context.
 * Throws `AIError` for provider failures and `parse_failed` when the
 * model's output does not satisfy the schema — callers map those to UI
 * copy and retry affordances.
 *
 * On a schema mismatch the call is retried once with the Zod issues
 * appended, so the model can correct the shape. The invented shape is never
 * accepted: a second failure throws.
 */
export async function runStudentProfiler(
  payload: StructuredOnboardingPayload,
  extra?: ProfilerExtraContext
): Promise<ProfilerResult> {
  const basePrompt = buildProfilerPrompt(payload, extra);

  const first = await generateStructured({
    system: PROFILER_SYSTEM_PROMPT,
    prompt: basePrompt,
    jsonSchema: explorerProfileJsonSchema,
    operation: "student_profiler",
  });
  const firstParse = explorerProfileSchema.safeParse(first.value);
  if (firstParse.success) {
    return { profile: firstParse.data, model: first.model, provider: first.provider };
  }

  const issues = firstParse.error.issues
    .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
    .join("; ");
  const second = await generateStructured({
    system: PROFILER_SYSTEM_PROMPT,
    prompt: [
      basePrompt,
      "",
      `Your previous response failed validation: ${issues}.`,
      "Fix exactly these problems and return only the required keys, no others.",
    ].join("\n"),
    jsonSchema: explorerProfileJsonSchema,
    operation: "student_profiler_retry",
  });
  const secondParse = explorerProfileSchema.safeParse(second.value);
  if (!secondParse.success) {
    throw aiParseError(
      "The profiler response did not match the Explorer Profile shape.",
      {
        provider: second.provider,
        model: second.model,
        detail: "schema validation failed after retry",
      }
    );
  }

  return {
    profile: secondParse.data,
    model: second.model,
    provider: second.provider,
  };
}

export { isAIError };
