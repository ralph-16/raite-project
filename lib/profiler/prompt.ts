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
 */

import type { StructuredOnboardingPayload } from "@/lib/onboarding/structured-responses";

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

function answeredLines(
  payload: StructuredOnboardingPayload
): string[] {
  return payload.responses
    .filter((r) => !r.skipped && r.answer)
    .map((r) => `- ${r.questionKey}: ${r.answer}`);
}

/**
 * Renders the student's context as labelled answer lines plus the
 * machine-readable detail the model may need (familiarity levels, selected
 * option values). Skipped questions are omitted entirely so the model has
 * nothing to hallucinate from.
 */
export function buildProfilerPrompt(
  payload: StructuredOnboardingPayload,
  extra?: ProfilerExtraContext
): string {
  const lines = answeredLines(payload);
  const detail = JSON.stringify(
    Object.fromEntries(
      payload.responses
        .filter((r) => !r.skipped)
        .map((r) => [r.questionKey, r.answerData])
    )
  );

  const aspiration = payload.profilePatch.career_aspiration;
  const industry = payload.profilePatch.career_aspiration_industry;

  return [
    "Build the Explorer Profile from these onboarding answers.",
    "Questions the student skipped are omitted — treat them as unknown.",
    "",
    "Answers:",
    ...(lines.length > 0 ? lines : ["(no answers provided)"]),
    "",
    "Answer detail (machine-readable):",
    detail,
    ...(aspiration
      ? ["", `Stated aspiration (student's own words, not a recommendation): ${aspiration}`]
      : []),
    ...(industry ? [`Stated industry of interest: ${industry}`] : []),
    ...(payload.resume.skipped
      ? ["", "The student skipped the optional resume — no resume context exists."]
      : []),
    ...(extra?.resumeSummary
      ? ["", `Resume summary (extracted from the student's own resume): ${extra.resumeSummary}`]
      : []),
    ...(extra?.answers && extra.answers.length > 0
      ? [
          "",
          "Contextual Q&A (raw, student's own words; skipped = unknown):",
          ...extra.answers.map(
            (a) =>
              `- [${a.topic ?? "other"}] ${a.prompt ?? "question"} → ${
                a.skipped ? "(skipped)" : (a.answer ?? "(skipped)")
              }`
          ),
        ]
      : []),
    "",
    "Respond with JSON only, matching the ExplorerProfile schema.",
  ].join("\n");
}
