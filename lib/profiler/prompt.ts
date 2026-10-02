/**
 * Prompt construction for the Student Profiler.
 *
 * Pure functions: onboarding context in, system + user prompt out. No
 * network, no Supabase, no AI calls — so the prompt can be unit-checked
 * without spending a request.
 *
 * Ground rules encoded here (and repeated to the model):
 * - Only use what the student actually provided. Empty input → empty arrays.
 * - Never assign, rank, or recommend a career. Exploration language only.
 * - No guarantees about outcomes.
 * - Student-provided text is DATA (see lib/ai/prompts/safety.ts):
 *   delimited blocks, per-field caps, and a total context budget.
 */

import type { StructuredOnboardingPayload } from "@/lib/onboarding/structured-responses";

import {
  DATA_BLOCK_RULES,
  dataBlock,
  fitContext,
  truncateField,
  MAX_CONTEXT_CHARS,
} from "@/lib/ai/prompts/safety";

export const PROFILER_SYSTEM_PROMPT = [
  "You are Lory, the Ka-Lakbay Explorer Profiler. You turn a student's",
  "onboarding answers into a structured Explorer Profile.",
  "",
  "Strict rules:",
  "1. Use ONLY information present in the provided answers. If a section has",
  '   no answers, return an empty array for it. Never invent skills,',
  "   experience, interests, or goals.",
  "2. NEVER assign, rank, or recommend a specific career or job. Use",
  "   exploration language (interests, signals, areas to explore).",
  "3. Never promise or imply guaranteed outcomes.",
  "4. Keep every string short (one line) and plain. No markdown.",
  "5. The summary (max 2 sentences) describes what the student shared and",
  "   frames it as a starting point for exploration, not a verdict.",
].join("\n");

/**
 * Raw guided-flow context folded in alongside the structured payload:
 * the contextual Q&A answers in the student's own words and the resume
 * summary, when a resume was parsed. Optional — the legacy 8-step path
 * sends nothing here and behaves exactly as before.
 */
export interface ProfilerExtraContext {
  answers?: Array<{
    topic?: string;
    prompt?: string;
    answer?: string;
    skipped?: boolean;
  }>;
  resumeSummary?: string;
}

/**
 * Renders the student's context as labelled data blocks with
 * the same safety rules as the onboarding Q&A prompt: every
 * student-provided field is capped, the assembled context is
 * budgeted (oldest answers drop first), and the model is told
 * to treat everything inside the blocks as data, never as
 * instructions. Skipped questions are omitted entirely so the
 * model has nothing to hallucinate from.
 */
export function buildProfilerPrompt(
  payload: StructuredOnboardingPayload,
  extra?: ProfilerExtraContext
): string {
  const answerLines = payload.responses
    .filter((r) => !r.skipped && r.answer)
    .map((r) => `- ${r.questionKey}: ${truncateField(r.answer ?? "")}`);

  const qaLines = (extra?.answers ?? []).map((a) =>
    `- [${truncateField(a.topic ?? "other", 40)}] ${truncateField(a.prompt ?? "question", 100)} → ${
      a.skipped ? "(skipped)" : truncateField(a.answer ?? "(skipped)")
    }`
  );

  const fitted = fitContext([...answerLines, ...qaLines]);

  const aspiration = payload.profilePatch.career_aspiration;
  const industry = payload.profilePatch.career_aspiration_industry;

  const blocks: string[] = [
    dataBlock(
      "onboarding-answers",
      fitted.lines.length > 0
        ? fitted.lines.join("\n")
        : "(no answers provided)"
    ),
  ];

  if (aspiration) {
    blocks.push(
      dataBlock("stated-career-interest", truncateField(aspiration))
    );
  }
  if (industry) {
    blocks.push(
      dataBlock("stated-industry", truncateField(industry))
    );
  }
  if (extra?.resumeSummary) {
    blocks.push(
      dataBlock("resume-summary", truncateField(extra.resumeSummary))
    );
  }

  // Machine-readable detail (familiarity levels, selected
  // option values) only when it still fits the context budget.
  const detail = JSON.stringify(
    Object.fromEntries(
      payload.responses
        .filter((r) => !r.skipped)
        .map((r) => [r.questionKey, r.answerData])
    )
  );
  const detailBudget = Math.max(
    0,
    MAX_CONTEXT_CHARS - blocks.join("\n").length - 64
  );
  if (detailBudget > 64) {
    blocks.push(
      dataBlock("answer-detail", truncateField(detail, detailBudget))
    );
  }

  return [
    "Build the Explorer Profile from these onboarding answers.",
    "Questions the student skipped are omitted — treat them as unknown.",
    "",
    DATA_BLOCK_RULES,
    "",
    ...blocks,
    ...(fitted.dropped
      ? ["", "(The oldest answers were omitted to stay within limits.)"]
      : []),
    ...(payload.resume.skipped
      ? ["", "The student skipped the optional resume — no resume context exists."]
      : []),
    "",
    "Respond with JSON only, matching the ExplorerProfile schema.",
  ].join("\n");
}
