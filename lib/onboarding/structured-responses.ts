/**
 * Maps the client-side `OnboardingState` to the database shape.
 *
 * Target tables: `onboarding_sessions` / `onboarding_questions` /
 * `onboarding_responses`, `profiles`, `resumes`.
 *
 * Nothing here writes to the database or calls AI — it only builds the
 * payload the future AI Student Profiler will consume:
 *
 *   Onboarding UI → OnboardingState → StructuredResponses → AI Profiler
 */

import type { OnboardingState } from "./types";

export interface StructuredResponse {
  /** Matches `onboarding_questions.key`. */
  questionKey: string;
  /** Human-readable answer shown back to the student. */
  answer: string | null;
  /** Machine-readable payload for `onboarding_responses.answer_data`. */
  answerData: Record<string, unknown>;
  /** Present when the question was skipped. */
  skipped?: boolean;
}

export interface StructuredOnboardingPayload {
  responses: StructuredResponse[];
  profilePatch: {
    year_level?: string;
    program?: string;
    interests?: string[];
    learning_preferences?: Record<string, unknown>;
    career_aspiration?: string | null;
    career_aspiration_industry?: string | null;
    career_aspiration_source?: "student" | null;
  };
  resume: {
    /** `true` when the student chose to skip; `false` when selected/none. */
    skipped: boolean;
    fileName?: string;
    /** `parse_status` equivalent — always `skipped` or `pending` here.
     *  Parsing is explicitly out of scope. */
    parseStatus: "skipped" | "pending";
  };
}

function joinOrNull(parts: string[]): string | null {
  const cleaned = parts.map((p) => p.trim()).filter(Boolean);
  return cleaned.length > 0 ? cleaned.join(", ") : null;
}

export function toStructuredResponses(
  state: OnboardingState
): StructuredOnboardingPayload {
  const interestsAnswer = joinOrNull([
    ...state.interests,
    state.interestsOther?.trim() ? `Other: ${state.interestsOther.trim()}` : "",
  ]);

  const skillAnswers = state.skills.filter((s) => s.familiarity !== "not_tried");
  const experienceAnswer = joinOrNull(state.experience.kinds);
  const learningAnswer = joinOrNull(state.learningPreferences);

  const aspiration = state.careerAspiration;
  const careerAnswer =
    aspiration.direction === "has_idea"
      ? joinOrNull([aspiration.targetCareer ?? "", aspiration.targetIndustry ?? ""])
      : aspiration.direction === "unsure"
        ? joinOrNull(aspiration.explorationSignals ?? [])
        : null;

  const responses: StructuredResponse[] = [
    {
      questionKey: "year_level",
      answer: state.yearLevel ?? null,
      answerData: state.yearLevel ? { selected: [state.yearLevel] } : {},
      ...(state.yearLevel ? {} : { skipped: true as const }),
    },
    {
      questionKey: "program",
      answer: state.program?.trim() || null,
      answerData: state.program?.trim() ? { value: state.program.trim() } : {},
      ...(state.program?.trim() ? {} : { skipped: true as const }),
    },
    {
      questionKey: "interests",
      answer: interestsAnswer,
      answerData: {
        selected: state.interests,
        other: state.interestsOther?.trim() || null,
      },
      ...(interestsAnswer ? {} : { skipped: true as const }),
    },
    {
      questionKey: "skills",
      answer:
        skillAnswers.length > 0
          ? skillAnswers.map((s) => `${s.skillName}: ${s.familiarity}`).join("; ")
          : null,
      answerData: {
        skills: state.skills.map((s) => ({
          slug: s.skillSlug,
          familiarity: s.familiarity,
        })),
      },
      ...(skillAnswers.length > 0 ? {} : { skipped: true as const }),
    },
    {
      questionKey: "experience",
      answer: experienceAnswer,
      answerData: {
        selected: state.experience.kinds,
        details: state.experience.details?.trim() || null,
      },
      ...(experienceAnswer || state.experience.details?.trim()
        ? {}
        : { skipped: true as const }),
    },
    {
      questionKey: "career_direction",
      answer: aspiration.direction ?? null,
      answerData: aspiration.direction
        ? { selected: [aspiration.direction] }
        : {},
      ...(aspiration.direction ? {} : { skipped: true as const }),
    },
    {
      questionKey: "target_career",
      answer: aspiration.direction === "has_idea" ? careerAnswer : null,
      answerData:
        aspiration.direction === "has_idea"
          ? {
              targetCareer: aspiration.targetCareer?.trim() || null,
              targetIndustry: aspiration.targetIndustry?.trim() || null,
            }
          : {},
      ...(aspiration.direction === "has_idea" && careerAnswer
        ? {}
        : { skipped: true as const }),
    },
    {
      questionKey: "lost_exploration",
      answer: aspiration.direction === "unsure" ? careerAnswer : null,
      answerData:
        aspiration.direction === "unsure"
          ? { selected: aspiration.explorationSignals ?? [] }
          : {},
      ...(aspiration.direction === "unsure" && careerAnswer
        ? {}
        : { skipped: true as const }),
    },
    {
      questionKey: "learning_preferences",
      answer: learningAnswer,
      answerData: { selected: state.learningPreferences },
      ...(learningAnswer ? {} : { skipped: true as const }),
    },
  ];

  return {
    responses,
    profilePatch: {
      year_level: state.yearLevel,
      program: state.program?.trim() || undefined,
      interests: [
        ...state.interests,
        ...(state.interestsOther?.trim() ? [state.interestsOther.trim()] : []),
      ],
      learning_preferences: { selected: state.learningPreferences },
      career_aspiration:
        aspiration.direction === "has_idea" ? careerAnswer : null,
      career_aspiration_industry:
        aspiration.direction === "has_idea"
          ? aspiration.targetIndustry?.trim() || null
          : null,
      career_aspiration_source:
        aspiration.direction === "has_idea" ? "student" : null,
    },
    resume: {
      skipped: state.resume.status === "skipped",
      fileName: state.resume.fileName,
      parseStatus: state.resume.status === "selected" ? "pending" : "skipped",
    },
  };
}
