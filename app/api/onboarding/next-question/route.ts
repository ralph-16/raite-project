import { NextResponse } from "next/server";
import { z } from "zod";

import { generateStructured, isAIError } from "@/lib/ai";
import { aiParseError } from "@/lib/ai/errors";
import type { OnboardingQuestion } from "@/lib/ai/prompts/onboarding";
import {
  buildOnboardingPrompt,
  MAX_QUESTIONS,
  nextQuestionJsonSchema,
  nextQuestionSchema,
  ONBOARDING_SYSTEM_PROMPT,
  type NextQuestionOutput,
  type OnboardingAnswerInput,
} from "@/lib/ai/prompts/onboarding";
import { createClient } from "@/lib/supabase/server";
import fallbackData from "@/data/onboarding-fallback.json";

/**
 * Contextual onboarding Q&A endpoint.
 *
 * The client sends everything answered so far (question ids,
 * topics, answer labels) plus the optional career interest and
 * resume skills. The route returns the single next question, or
 * `done: true`. It is stateless — the client owns the history.
 *
 * Safety properties, enforced here:
 * - The body is Zod-validated and size-capped; `user_id` is
 *   never read from the body (the session supplies it).
 * - Student text reaches the model only inside labelled data
 *   blocks, capped per field and in total (see
 *   lib/ai/prompts/safety.ts).
 * - A signed-in session is required whenever a real provider is
 *   configured (`AI_PROVIDER` other than "mock").
 * - Onboarding never dead-ends: if every provider fails, or
 *   the output fails Zod after one feedback retry, the next
 *   unanswered question from the static fallback script is
 *   served with `source: "fallback"`.
 *
 * Raw vendor errors stay in server logs only.
 */

export const dynamic = "force-dynamic";

/** Upper bound for a request body (the real payload is ~2 KB). */
const MAX_BODY_BYTES = 32 * 1024;

const answerInputSchema = z
  .object({
    questionId: z.string().min(1).max(60),
    topic: z.string().min(1).max(40),
    answerLabel: z.string().min(1).max(300).optional(),
    answerLabels: z.array(z.string().min(1).max(300)).max(5).optional(),
  })
  .refine(
    (a) => a.answerLabel !== undefined || a.answerLabels !== undefined,
    { message: "each answer needs an answerLabel or answerLabels" }
  );

const nextQuestionRequestSchema = z.object({
  answers: z.array(answerInputSchema).max(MAX_QUESTIONS),
  desiredCareer: z.string().min(1).max(300).optional(),
  resumeSkills: z.array(z.string().min(1).max(80)).max(20).optional(),
});

type NextQuestionRequest = z.infer<
  typeof nextQuestionRequestSchema
>;

const FALLBACK_QUESTIONS: OnboardingQuestion[] = (
  fallbackData as { questions: OnboardingQuestion[] }
).questions;

/** One validated answer from the request body. */
type AnswerInput = NextQuestionRequest["answers"][number];

/** Normalizes the wire input into the prompt module's shape. */
function toAnswerInput(answer: AnswerInput): OnboardingAnswerInput {
  return {
    questionId: answer.questionId,
    topic: answer.topic,
    answerLabels:
      answer.answerLabels ?? (answer.answerLabel ? [answer.answerLabel] : []),
  };
}

/**
 * True when a real (non-mock) provider is configured. Mock
 * mode is the credential-free path used by the UI demo and by
 * tests, so it does not require a session.
 */
function isRealProviderMode(): boolean {
  return (process.env.AI_PROVIDER?.trim() || "mock") !== "mock";
}

interface NextQuestionResult {
  output: NextQuestionOutput;
  /** Provider and model that actually answered. */
  provider: string;
  model: string;
}

/**
 * Asks the model, retrying once with Zod's error feedback
 * (the same retry the profiler uses). A provider-level
 * `parse_failed` (empty or non-JSON content) is treated like
 * a validation failure and gets the same single retry.
 */
async function askForNextQuestion(
  prompt: string
): Promise<NextQuestionResult> {
  let feedback: string | null = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    const attemptPrompt = feedback
      ? `${prompt}\n\n${feedback}`
      : prompt;

    let value: unknown;
    let provider = "";
    let model = "";
    try {
      const result = await generateStructured({
        system: ONBOARDING_SYSTEM_PROMPT,
        prompt: attemptPrompt,
        jsonSchema: nextQuestionJsonSchema,
        operation:
          attempt === 0
            ? "onboarding_next_question"
            : "onboarding_next_question_retry",
      });
      value = result.value;
      provider = result.provider;
      model = result.model;
    } catch (error) {
      // Only a parse failure is worth a feedback retry;
      // everything else (auth, rate limits, 5xx) propagates.
      if (
        attempt === 0 &&
        isAIError(error) &&
        error.code === "parse_failed"
      ) {
        feedback =
          "Your previous response was not valid JSON. Respond with JSON only, matching the NextQuestion shape.";
        continue;
      }
      throw error;
    }

    const parsed = nextQuestionSchema.safeParse(value);
    if (parsed.success) {
      return { output: parsed.data, provider, model };
    }

    if (attempt === 0) {
      const issues = parsed.error.issues
        .map(
          (issue) =>
            `${issue.path.join(".") || "(root)"}: ${issue.message}`
        )
        .join("; ");
      feedback = [
        "Your previous response failed validation.",
        `Provider: ${provider}, model: ${model}.`,
        `Issues: ${issues}`,
        "Fix exactly these problems and respond with JSON only.",
      ].join(" ");
      continue;
    }

    throw aiParseError(
      "The question output did not match the expected shape.",
      { provider, model, detail: "schema validation failed after retry" }
    );
  }

  // Unreachable: the loop either returns or throws.
  throw aiParseError("The question output could not be produced.", {
    detail: "unexpected retry-loop exit",
  });
}

/** Next unanswered fallback question, or null when exhausted. */
function nextFallbackQuestion(
  coveredTopics: Set<string>,
  askedIds: Set<string>
): OnboardingQuestion | null {
  for (const question of FALLBACK_QUESTIONS) {
    if (!coveredTopics.has(question.topic) && !askedIds.has(question.id)) {
      return question;
    }
  }
  return null;
}

export async function POST(request: Request) {
  // 1. Read and cap the body before parsing anything.
  let body: unknown;
  try {
    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) {
      return NextResponse.json(
        {
          status: "error",
          code: "too_large",
          message: "That request is too large. Try again.",
        },
        { status: 413 }
      );
    }
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json(
      { status: "error", message: "Request body must be valid JSON." },
      { status: 400 }
    );
  }

  // 2. Validate the shape. Unknown fields (including any
  //    client-sent user_id) are stripped and never trusted.
  const parsedRequest = nextQuestionRequestSchema.safeParse(body);
  if (!parsedRequest.success) {
    const issues = parsedRequest.error.issues
      .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("; ");
    return NextResponse.json(
      {
        status: "error",
        code: "invalid_request",
        message: "The answers could not be read. Try again.",
        detail: issues,
      },
      { status: 400 }
    );
  }

  const { answers, desiredCareer, resumeSkills } = parsedRequest.data;

  // 3. Session. Real provider mode requires a signed-in
  //    student; the user id always comes from the session.
  let userId: string | null = null;
  if (isRealProviderMode()) {
    try {
      const supabase = await createClient();
      const { data } = await supabase.auth.getUser();
      userId = data.user?.id ?? null;
    } catch {
      userId = null;
    }
    if (!userId) {
      return NextResponse.json(
        {
          status: "error",
          code: "unauthorized",
          message: "Sign in to continue with Lory.",
        },
        { status: 401 }
      );
    }
  }

  // 4. Question cap: the run is over.
  if (answers.length >= MAX_QUESTIONS) {
    return NextResponse.json({
      status: "ok",
      done: true,
      question: null,
      count: answers.length,
      userId,
      source: "route",
      provider: null,
      model: null,
    });
  }

  // 5. Build the prompt from data blocks and ask the model.
  const prompt = buildOnboardingPrompt({
    answers: answers.map(toAnswerInput),
    desiredCareer,
    resumeSkills,
  });

  const coveredTopics = new Set(answers.map((a) => a.topic));
  const askedIds = new Set(answers.map((a) => a.questionId));

  try {
    const { output, provider, model } = await askForNextQuestion(
      prompt
    );

    if (output.done || !output.question) {
      return NextResponse.json({
        status: "ok",
        done: true,
        question: null,
        count: answers.length,
        userId,
        source: "ai",
        provider,
        model,
      });
    }

    return NextResponse.json({
      status: "ok",
      done: false,
      question: output.question,
      count: answers.length + 1,
      userId,
      source: "ai",
      provider,
      model,
    });
  } catch (error) {
    // 6. Never dead-end: serve the static fallback script.
    if (isAIError(error)) {
      const fallback = nextFallbackQuestion(coveredTopics, askedIds);
      if (fallback) {
        return NextResponse.json({
          status: "ok",
          done: false,
          question: fallback,
          count: answers.length + 1,
          userId,
          source: "fallback",
          provider: null,
          model: null,
          error: { code: error.code, retryable: error.retryable },
        });
      }
      // Fallback exhausted: finish the run instead of failing.
      return NextResponse.json({
        status: "ok",
        done: true,
        question: null,
        count: answers.length,
        userId,
        source: "fallback",
        provider: null,
        model: null,
        error: { code: error.code, retryable: error.retryable },
      });
    }
    return NextResponse.json(
      { status: "error", message: "Something went wrong. Try again." },
      { status: 500 }
    );
  }
}
