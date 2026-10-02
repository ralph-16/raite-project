/**
 * Guided onboarding state (flow v2): intro → resume → aspirations →
 * AI contextual Q&A → completion.
 *
 * One object in the flow component + localStorage (`GUIDED_STORAGE_KEY`) so
 * refresh never loses answers. On completion it maps onto the existing
 * `OnboardingState` (see `toOnboardingState`) and reuses `/api/profiler`
 * unchanged.
 */

import type { ParsedResume } from "@/lib/resume/parse";
import type {
  OnboardingState,
  SkillFamiliarity,
  YearLevel,
} from "./types";

export type ResumeStageStatus =
  | "none"
  | "parsing"
  | "parsed"
  | "invalid"
  | "failed"
  | "skipped";

export interface GuidedResume {
  status: ResumeStageStatus;
  fileName?: string;
  error?: string;
  consent: boolean;
  parsed?: ParsedResume;
  /** Student-corrected skills, comma-separated (split on use). */
  correctedSkills?: string;
}

export interface GuidedAspirations {
  text: string;
  unsure: boolean;
  skipped: boolean;
}

export interface GuidedAnswer {
  key: string;
  topic: string;
  prompt: string;
  type: string;
  /** Human-readable answer, or "(skipped)" / "(not sure)". */
  answer: string;
  skipped: boolean;
}

export interface GuidedState {
  resume: GuidedResume;
  aspirations: GuidedAspirations;
  answers: GuidedAnswer[];
  qaDone: boolean;
}

export const GUIDED_STORAGE_KEY = "ka-lakbay-guided-v1";

export const INITIAL_GUIDED_STATE: GuidedState = {
  resume: { status: "none", consent: false },
  aspirations: { text: "", unsure: false, skipped: false },
  answers: [],
  qaDone: false,
};

const YEAR_LEVELS: YearLevel[] = [
  "first_year",
  "second_year",
  "third_year",
  "fourth_year",
  "graduate",
  "working",
];

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function splitList(value: string): string[] {
  return value
    .split(/[,;\n]+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

/** Splits a comma-separated skills string (resume edit field). */
export function splitSkillList(value: string): string[] {
  return splitList(value);
}

function answersFor(state: GuidedState, topic: string): GuidedAnswer[] {
  return state.answers.filter((a) => a.topic === topic && !a.skipped);
}

/**
 * Maps guided answers + resume onto the existing profiler input contract.
 * Skipped topics stay empty — nothing is invented. If required fields
 * (year level, program, interests) are missing, the profiler 400s and the
 * completion screen offers to continue without a profile.
 */
export function toOnboardingState(state: GuidedState): OnboardingState {
  const yearAnswer = answersFor(state, "year_level")[0]?.answer.trim();
  const yearLevel = YEAR_LEVELS.includes(yearAnswer as YearLevel)
    ? (yearAnswer as YearLevel)
    : undefined;

  const program = answersFor(state, "program")[0]?.answer.trim() || "";

  const interests = answersFor(state, "interests").flatMap((a) =>
    splitList(a.answer)
  );

  const resumeSkills =
    state.resume.correctedSkills !== undefined
      ? splitList(state.resume.correctedSkills)
      : (state.resume.parsed?.skills ?? []);
  const qaSkills = answersFor(state, "skills").flatMap((a) =>
    splitList(a.answer)
  );
  const skills = [...resumeSkills, ...qaSkills]
    .map((name) => name.trim())
    .filter(Boolean)
    .filter((name, i, all) => all.indexOf(name) === i)
    .map((skillName) => ({
      skillSlug: slugify(skillName) || "skill",
      skillName,
      familiarity: "used" as SkillFamiliarity,
    }));

  const resume = state.resume.parsed;
  const experienceDetails = [
    ...(resume?.experience ?? []),
    ...(resume?.education ?? []).map((e) => `Education: ${e}`),
    ...(resume?.projects ?? []).map((p) => `Project: ${p}`),
    ...answersFor(state, "experience").map((a) => a.answer),
  ].filter(Boolean);

  const learningPreferences = [
    ...answersFor(state, "learning"),
    ...answersFor(state, "learning_time"),
  ].flatMap((a) => splitList(a.answer));

  const aspiration = state.aspirations.unsure
    ? { direction: "unsure" as const, explorationSignals: [] }
    : state.aspirations.text.trim()
      ? {
          direction: "has_idea" as const,
          targetCareer: state.aspirations.text.trim(),
          targetIndustry: "",
        }
      : { direction: undefined };

  return {
    yearLevel,
    program,
    interests,
    interestsOther: "",
    skills,
    experience: { kinds: [], details: experienceDetails.join("\n") },
    careerAspiration: aspiration,
    learningPreferences,
    resume: {
      status:
        state.resume.status === "skipped"
          ? "skipped"
          : state.resume.status === "parsed"
            ? "selected"
            : "none",
      fileName: state.resume.fileName,
    },
  };
}

/** Snapshot the completion screen saves for the /home placeholder. */
export interface HomeSnapshot {
  profile: import("@/lib/profiler/schema").ExplorerProfile | null;
  model: string | null;
  program?: string;
  yearLevel?: string;
  interests: string[];
  note?: string;
  completedAt: string;
  dev: boolean;
}

export const HOME_SNAPSHOT_KEY = "ka-lakbay-home-v1";
