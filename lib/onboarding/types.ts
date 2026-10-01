/**
 * Onboarding state model.
 *
 * Single structured object owned by the onboarding flow. It is kept in one
 * place (the flow component + localStorage) until submission, then mapped to
 * structured responses for `onboarding_sessions` / `onboarding_questions` /
 * `onboarding_responses`, `profiles`, and `resumes` (see
 * `structured-responses.ts`).
 *
 * No AI generation happens here — this is the shell the future AI Student
 * Profiler will plug into.
 */

/** Matches the `year_level` enum in the database. */
export type YearLevel =
  | "first_year"
  | "second_year"
  | "third_year"
  | "fourth_year"
  | "graduate"
  | "working";

/** Matches the `onboarding_question_type` enum in the database. */
export type OnboardingQuestionType =
  | "open"
  | "single_choice"
  | "multi_choice"
  | "boolean"
  | "scale";

/** Matches the `skill_state` enum for future profiler mapping. */
export type SkillFamiliarity =
  | "not_tried"
  | "used"
  | "learned"
  | "comfortable"
  | "built";

export interface SkillResponse {
  skillSlug: string;
  skillName: string;
  familiarity: SkillFamiliarity;
}

export interface ExperienceResponse {
  kinds: string[];
  details?: string;
}

export interface CareerAspirationResponse {
  /** "has_idea" | "unsure" | undefined (not answered yet). */
  direction?: "has_idea" | "unsure";
  targetCareer?: string;
  targetIndustry?: string;
  /** Exploration dimensions selected on the "I'm Lost" branch. */
  explorationSignals?: string[];
}

export type ResumeStatus =
  | "none"
  | "selected"
  | "invalid"
  | "skipped";

export interface ResumeResponse {
  status: ResumeStatus;
  /** Kept client-side only. Never uploaded or parsed in this task. */
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  error?: string;
}

export interface OnboardingState {
  yearLevel?: YearLevel;
  program?: string;

  interests: string[];
  interestsOther?: string;

  skills: SkillResponse[];

  experience: ExperienceResponse;

  careerAspiration: CareerAspirationResponse;

  learningPreferences: string[];

  resume: ResumeResponse;
}

export const INITIAL_ONBOARDING_STATE: OnboardingState = {
  yearLevel: undefined,
  program: "",
  interests: [],
  interestsOther: "",
  skills: [],
  experience: { kinds: [], details: "" },
  careerAspiration: {
    direction: undefined,
    targetCareer: "",
    targetIndustry: "",
    explorationSignals: [],
  },
  learningPreferences: [],
  resume: { status: "none" },
};

/** Generic question shape — mirrors `onboarding_questions` columns. */
export interface OnboardingQuestion {
  key: string;
  type: OnboardingQuestionType;
  prompt: string;
  options?: Array<{ value: string; label: string; description?: string }>;
  position: number;
  dependsOnKey?: string;
  required?: boolean;
}

/** Step identifiers in display order. */
export type OnboardingStepId =
  | "intro"
  | "student-info"
  | "interests"
  | "skills"
  | "experience"
  | "career"
  | "learning"
  | "resume"
  | "review"
  | "done";

export const ONBOARDING_STORAGE_KEY = "ka-lakbay-onboarding-v1";
