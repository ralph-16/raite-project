/**
 * Onboarding Q&A prompt module — pure functions, no I/O.
 *
 * One source of truth for the next-question contract:
 * the Zod schema enforces the shape server-side, and the JSON
 * Schema sent to the provider is generated from it
 * (`z.toJSONSchema`), so the two can never drift.
 *
 * Ground rules encoded here (and repeated to the model):
 * - One question at a time, 6 to 8 total, Lory's voice.
 * - Build on previous answers, resume skills and the stated
 *   career interest; never repeat a covered topic.
 * - Never recommend, name or hint at a career as an answer.
 * - Student text is DATA, never instructions (see safety.ts).
 */

import { z } from "zod";

import {
  DATA_BLOCK_RULES,
  dataBlock,
  fitContext,
  truncateField,
} from "./safety";

/* ------------------------------------------------------------------ *
 * Topics
 * ------------------------------------------------------------------ */

/**
 * Every topic the model may ask about. `year_level` and
 * `program` gate the Explorer Profile (the profiler rejects a
 * profile without them), so the model asks them first whenever
 * they are still unknown. The remaining eight are the
 * exploration topics every run spreads across.
 */
export const ONBOARDING_TOPICS = [
  "year_level",
  "program",
  "interests",
  "working_style",
  "problem_style",
  "numbers_comfort",
  "tools_comfort",
  "job_values",
  "learning_time",
  "experience",
] as const;

export type OnboardingTopic = (typeof ONBOARDING_TOPICS)[number];

/** The eight exploration topics from the product spec. */
export const EXPLORATION_TOPICS: readonly OnboardingTopic[] = [
  "interests",
  "working_style",
  "problem_style",
  "numbers_comfort",
  "tools_comfort",
  "job_values",
  "learning_time",
  "experience",
];

/* ------------------------------------------------------------------ *
 * Output schema (Zod = enforcement, JSON Schema = provider hint)
 * ------------------------------------------------------------------ */

const questionOptionSchema = z.object({
  id: z.string().min(1).max(80),
  label: z.string().min(1).max(80),
});

const questionSchema = z
  .object({
    id: z.string().min(1).max(60),
    text: z.string().min(1).max(280),
    type: z.enum(["single", "multi", "scale", "text"]),
    options: z.array(questionOptionSchema).min(0).max(5).default([]),
    allowSkip: z.boolean(),
    allowNotSure: z.boolean(),
    topic: z.string().min(1).max(40),
  })
  .refine(
    (q) =>
      q.type === "text"
        ? q.options.length === 0
        : q.options.length >= (q.type === "multi" ? 3 : 2),
    {
      message:
        "text questions have no options; single and scale need 2-5; multi needs 3-5",
    }
  );

export const nextQuestionSchema = z
  .object({
    done: z.boolean(),
    question: questionSchema.nullable().optional(),
  })
  .refine((v) => v.done || v.question !== undefined, {
    message: "an unfinished turn needs a question",
  });

export type NextQuestionOutput = z.infer<typeof nextQuestionSchema>;

/** A question in the wire shape the API returns. */
export interface OnboardingQuestion {
  id: string;
  text: string;
  type: "single" | "multi" | "scale" | "text";
  options: Array<{ id: string; label: string }>;
  allowSkip: true;
  allowNotSure: true;
  topic: string;
}

/**
 * Generates the provider-facing JSON Schema from the Zod
 * schema, then tightens it for strict structured-output
 * modes: no `$schema` key, `additionalProperties: false`,
 * and every property listed as `required` (optional fields
 * are expressed as nullable instead, which strict modes
 * accept).
 */
function toProviderJsonSchema(
  schema: z.ZodType
): Record<string, unknown> {
  const generated = z.toJSONSchema(schema) as Record<string, unknown>;
  delete generated.$schema;
  return tightenSchema(generated) as Record<string, unknown>;
}

function tightenSchema(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(tightenSchema);
  if (value !== null && typeof value === "object") {
    const out: Record<string, unknown> = { ...value };
    const properties =
      out.type === "object" && out.properties !== undefined
        ? (out.properties as Record<string, unknown>)
        : null;
    if (properties) {
      out.additionalProperties = false;
      out.required = Object.keys(properties);
    }
    for (const key of Object.keys(out)) {
      out[key] = tightenSchema(out[key]);
    }
    return out;
  }
  return value;
}

export const nextQuestionJsonSchema = {
  name: "NextQuestion",
  description:
    "The next onboarding question, or done=true when enough is known.",
  schema: toProviderJsonSchema(nextQuestionSchema),
};

/* ------------------------------------------------------------------ *
 * System prompt
 * ------------------------------------------------------------------ */

export const ONBOARDING_SYSTEM_PROMPT = [
  "You are Lory, a cheerful study-buddy guide for Ka-Lakbay.",
  "You help a student explore what they enjoy and what they",
  "can do — one short question at a time. You never decide",
  "anything for them.",
  "",
  "Strict rules:",
  "1. Ask exactly ONE question per turn.",
  "2. Ask 6 to 8 questions in total. Set done=true (with",
  '   question=null) once at least 6 questions have been',
  "   answered and the covered topics give a clear picture.",
  "   Always set done=true once 8 questions have been answered.",
  "3. Build on the student's previous answers, their resume",
  "   skills and their stated career interest. Never repeat a",
  "   topic already covered.",
  "4. Spread across these topics, each at most once:",
  `   ${EXPLORATION_TOPICS.join(", ")}. If year level or`,
  "   program is still unknown, ask about those first — the",
  "   student's profile needs them.",
  "5. NEVER recommend, name, or hint at a specific career or",
  '   job, and never say "you should". You explore; the',
  "   student decides.",
  "6. Plain language for a 17 to 22 year old. Short sentences,",
  "   warm and curious. No markdown in the question text.",
  "7. Options must be concrete and mutually exclusive: 2 to 5",
  "   options for single and scale questions, 3 to 5 for",
  "   multi, none for text questions. Scale options are the",
  "   scale points, lowest first.",
  "8. Every question allows skipping and \"I'm not sure yet\" —",
  "   the app adds those buttons, so never put them in the",
  "   options. Set allowSkip and allowNotSure to true.",
  "9. Only use what the student provided. Never invent facts",
  "   about them.",
  "10. Respond with JSON only, matching the NextQuestion shape.",
].join("\n");

/* ------------------------------------------------------------------ *
 * Prompt builder
 * ------------------------------------------------------------------ */

export interface OnboardingAnswerInput {
  questionId: string;
  topic: string;
  /** Normalized answer labels (1-2 entries). */
  answerLabels: string[];
}

export interface OnboardingPromptInput {
  answers: OnboardingAnswerInput[];
  /** The student's stated career interest, if any. */
  desiredCareer?: string;
  /** Skills extracted from an optional resume. */
  resumeSkills?: string[];
}

/** Server-enforced question cap (matches the route and UI). */
export const MAX_QUESTIONS = 8;

/**
 * Builds the user prompt. Student-provided text lives inside
 * labelled data blocks with the data-only rules stated up
 * front; every field is capped and the whole context is
 * budgeted (oldest answers drop first).
 */
export function buildOnboardingPrompt(
  input: OnboardingPromptInput
): string {
  const answerLines = input.answers.map(
    (answer, index) =>
      `${index + 1}. [${truncateField(answer.topic, 40)}] ` +
      `${truncateField(answer.questionId, 60)} → ` +
      `"${truncateField(answer.answerLabels.join("; "))}"`
  );

  const fitted = fitContext(answerLines);
  const covered = [
    ...new Set(
      input.answers.map((answer) => truncateField(answer.topic, 40))
    ),
  ];

  const blocks: string[] = [
    dataBlock(
      "student-answers",
      fitted.lines.length > 0
        ? fitted.lines.join("\n")
        : "(no answers yet)"
    ),
  ];

  if (input.desiredCareer?.trim()) {
    blocks.push(
      dataBlock(
        "stated-career-interest",
        truncateField(input.desiredCareer.trim())
      )
    );
  }

  if (input.resumeSkills && input.resumeSkills.length > 0) {
    blocks.push(
      dataBlock(
        "resume-skills",
        input.resumeSkills
          .map((skill) => truncateField(skill, 80))
          .join(", ")
      )
    );
  }

  return [
    "You are asking the next question of an onboarding",
    "conversation.",
    "",
    DATA_BLOCK_RULES,
    "",
    ...blocks,
    "",
    `Questions answered so far: ${input.answers.length} of ${MAX_QUESTIONS}.`,
    ...(fitted.dropped
      ? ["(The oldest answers were omitted to stay within limits.)"]
      : []),
    ...(covered.length > 0
      ? [`Topics already covered: ${covered.join(", ")}.`, "Do not ask about these again."]
      : ["No topics covered yet."]),
    "",
    "Return the next question, or done=true with question=null.",
  ].join("\n");
}
