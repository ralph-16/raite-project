import { NextResponse } from "next/server";

import { generateStructured, isAIError } from "@/lib/ai";
import { aiParseError } from "@/lib/ai/errors";
import { nextQuestionJsonSchema, nextQuestionSchema } from "@/lib/qa/schema";
import { createClient } from "@/lib/supabase/server";

/**
 * Contextual Q&A endpoint. Stateless: the client sends everything answered
 * so far plus aspirations and a resume summary, and gets back the single
 * next question (or `done: true`). Server-enforced rules: at most 8
 * questions per run, and `done` is forced once 8 answers exist.
 *
 * Prompt rules: never repeat covered topics, always allow skip / "not
 * sure", Lory voice, and no career is ever recommended in a question.
 * Raw vendor errors stay in server logs only.
 */

export const dynamic = "force-dynamic";

const MAX_QUESTIONS = 8;

/**
 * The session cookie reaches route handlers (middleware refreshes it on
 * page navigations; handlers read it directly), so a signed-in student's id
 * is available here for per-student context. Best-effort by design: a
 * missing or expired session never blocks a question — the flow also works
 * signed out, and `userId` is simply null then.
 */
async function resolveUserId(): Promise<string | null> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    return data.user?.id ?? null;
  } catch {
    return null;
  }
}

interface HistoryAnswer {
  key?: string;
  topic?: string;
  prompt?: string;
  answer?: string;
}

const SYSTEM_PROMPT = [
  "You are Lory, a cheerful study-buddy guide helping a student explore",
  "what they enjoy and know. You ask ONE short follow-up question at a time.",
  "",
  "Strict rules:",
  "1. Cover study context first if unknown: year level, then program. After",
  "   that, explore interests, skills tried, experience, and how they like",
  "   to learn. Never repeat a topic already covered by the resume summary,",
  "   the aspirations, or earlier answers.",
  "2. Use the topic enum honestly: year_level, program, interests, skills,",
  "   experience, learning, or other.",
  "3. For year_level use single_choice with exactly these option values:",
  "   first_year, second_year, third_year, fourth_year, graduate, working.",
  "4. Keep prompts to one short sentence in a warm, casual voice. Plain text,",
  "   no markdown. The UI always adds Skip and \"I'm not sure yet\", so never",
  "   put those in options.",
  "5. NEVER name, rank, or recommend a career or job. Explore, don't decide.",
  "6. Set done=true when you have enough to build a profile (aim for 5 to 8",
  "   questions) or when nothing new remains to ask.",
].join("\n");

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { status: "error", message: "Request body must be valid JSON." },
      { status: 400 }
    );
  }

  const input = body as {
    answers?: HistoryAnswer[];
    aspirations?: string;
    unsure?: boolean;
    resumeSummary?: string;
  };
  const answers = Array.isArray(input.answers) ? input.answers : [];
  const userId = await resolveUserId();

  if (answers.length >= MAX_QUESTIONS) {
    return NextResponse.json({
      status: "ok",
      done: true,
      count: answers.length,
      userId,
    });
  }

  const history =
    answers.length > 0
      ? answers
          .map(
            (a, i) =>
              `${i + 1}. [${a.topic ?? "other"}] ${a.prompt ?? a.key ?? "question"} → ${a.answer ?? "(skipped)"}`
          )
          .join("\n")
      : "(no answers yet)";

  const prompt = [
    `Questions answered so far: ${answers.length} of max ${MAX_QUESTIONS}.`,
    ...(input.aspirations ? [`Career aspirations (student's own words): ${input.aspirations}`] : []),
    ...(input.unsure ? ["The student is not sure about a career direction yet."] : []),
    ...(input.resumeSummary
      ? [`Resume summary (already covered, do not re-ask): ${input.resumeSummary}`]
      : ["No resume provided."]),
    "",
    "Answer history (topic, question → answer):",
    history,
    "",
    "Return the next question, or done=true. Respond with JSON only.",
  ].join("\n");

  try {
    const first = await generateStructured({
      system: SYSTEM_PROMPT,
      prompt,
      jsonSchema: nextQuestionJsonSchema,
      operation: "onboarding_next_question",
    });
    const parsed = nextQuestionSchema.safeParse(first.value);
    if (parsed.success) {
      return NextResponse.json({
        status: "ok",
        ...parsed.data,
        count: answers.length + 1,
        userId,
      });
    }

    const issues = parsed.error.issues
      .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("; ");
    const second = await generateStructured({
      system: SYSTEM_PROMPT,
      prompt: `${prompt}\n\nYour previous response failed validation: ${issues}. Fix exactly these problems.`,
      jsonSchema: nextQuestionJsonSchema,
      operation: "onboarding_next_question_retry",
    });
    const reparsed = nextQuestionSchema.safeParse(second.value);
    if (!reparsed.success) {
      throw aiParseError("The question output did not match the expected shape.", {
        provider: second.provider,
        model: second.model,
        detail: "schema validation failed after retry",
      });
    }
    return NextResponse.json({
      status: "ok",
      ...reparsed.data,
      count: answers.length + 1,
      userId,
    });
  } catch (error) {
    if (isAIError(error)) {
      const message =
        error.code === "unavailable"
          ? error.message
          : "Lory lost the thread for a moment. Try again.";
      return NextResponse.json(
        { status: "error", code: error.code, message, retryable: error.retryable },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { status: "error", message: "Something went wrong. Try again." },
      { status: 500 }
    );
  }
}
