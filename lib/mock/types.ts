/**
 * Mock-mode data model.
 *
 * Two groups:
 * 1. Content types (career, question, roadmap, copy) — Zod schemas live in
 *    `schemas.ts`, these are their inferred types.
 * 2. Persisted types — exactly what `lib/mock/storage.ts` writes to
 *    localStorage, one interface per storage key.
 *
 * Field and enum names mirror `supabase/DATABASE.md` so a later swap to
 * Supabase is a loader change, not a model change.
 */

import type { z } from "zod";
import type {
  careerSchema,
  careerListSchema,
  questionListSchema,
  roadmapSchema,
  landingCopySchema,
} from "./schemas";

/* ------------------------------------------------------------------ *
 * Content (static JSON in /data)
 * ------------------------------------------------------------------ */

export type Career = z.infer<typeof careerSchema>;
export type CareerList = z.infer<typeof careerListSchema>;
export type CareerCategory = Career["category"];
export type MarketDemand = Career["market_demand"];
export type CareerRelationshipType = Career["related"][number]["type"];

export type QuestionList = z.infer<typeof questionListSchema>["questions"];
export type OnboardingQuestion = QuestionList[number];
export type QuestionKind = OnboardingQuestion["kind"];
export type QuestionOption = NonNullable<OnboardingQuestion["options"]>[number];
export type OptionWeights = QuestionOption["weights"];

export type Roadmap = z.infer<typeof roadmapSchema>;
export type RoadmapNode = Roadmap["nodes"][number];
export type RoadmapNodeType = RoadmapNode["type"];
export type RoadmapEdge = Roadmap["edges"][number];
export type RoadmapResource = RoadmapNode["resources"][number];
export type ResourceKind = RoadmapResource["type"];

export type LandingCopy = z.infer<typeof landingCopySchema>;

/* ------------------------------------------------------------------ *
 * Enum mirrors (DATABASE.md)
 * ------------------------------------------------------------------ */

/** `node_progress_status` — `locked` is derived, never stored. */
export type NodeProgressStatus = "not_started" | "in_progress" | "completed";

/** Derived node state (computed from progress + edges). */
export type NodeState = "locked" | "available" | "in_progress" | "completed";

/** `skill_state` — used by the fake resume parse result. */
export type SkillState = "not_assessed" | "started" | "developing" | "demonstrated" | "strong";

export type ThemeMode = "light" | "dark";

/* ------------------------------------------------------------------ *
 * Persisted — one interface per storage key
 * ------------------------------------------------------------------ */

/** `kl.users` — local account book. Passwords are never stored. */
export interface MockUser {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
}

/** `kl.session` — who is signed in on this device. */
export interface MockSession {
  userId: string;
  email: string;
  displayName: string;
  signedInAt: string;
}

/**
 * One answer, shaped like `onboarding_responses.answer_data` (jsonb):
 * `{"selected": [...]}` / `{"value": 4}` plus the optional free-text note.
 * `skipped: true` means the student chose "I'm not sure yet" / "Skip".
 */
export interface QuestionAnswer {
  selected?: string[];
  value?: number;
  text?: string;
  skipped?: boolean;
}

/** Fake resume parse output — mirrors `resumes.parsed_context`. */
export interface ParsedResume {
  fileName: string;
  summary: string;
  skills: string[];
  experience: string[];
  education: string[];
}

/** `kl.onboarding` — the resumable wizard state. */
export interface OnboardingState {
  /** 0-based index into the wizard step list. */
  step: number;
  completed: boolean;
  /** Free text from the "career in mind" step (nullable is valid). */
  desiredCareer: string | null;
  resume: ParsedResume | null;
  answers: Record<string, QuestionAnswer>;
  /** Question ids the student skipped outright. */
  skipped: string[];
  updatedAt: string;
}

/** `kl.profile` — the readable student profile shown on /profile. */
export interface MockProfile {
  displayName: string;
  email: string;
  desiredCareer: string | null;
  resumeSkills: string[];
  /** Option labels the student picked, kept in their own words. */
  interests: string[];
  topCategory: CareerCategory | null;
  lorySummary: string;
  onboardingCompleted: boolean;
  updatedAt: string;
}

/** `kl.matches` — `{slug, score, topReasons[2]}` per the spec. */
export interface Match {
  slug: string;
  score: number;
  topReasons: string[];
}

/** `kl.progress.<careerSlug>` — per-node status, keyed by `node.key`. */
export interface RoadmapProgress {
  nodes: Record<string, NodeProgressStatus>;
  updatedAt: string;
}
