/**
 * Deterministic career scoring — no AI, no randomness.
 *
 * Pure functions only: same inputs always produce the same order, so the
 * result is unit-checkable and honest to label "Lory suggests (sample)".
 *
 *   score = 35 + 0.63 × (categoryPoints + skillPoints + desiredBoost)
 *     categoryPoints  0–50  category weight from the answered questions
 *     skillPoints     0–30  15 per matching skill, capped at two matches
 *     desiredBoost    0–20  desired-career text fuzzy-matches title/slug/category
 *   → clamped to 35–98 (see `SCORE_MIN` / `SCORE_MAX`)
 *
 * Skipped answers are neutral: they add nothing and take nothing away.
 */

import { getCareer, listCareers, normalizeSkill } from "./careers";
import { listQuestions } from "./questions";
import type {
  Career,
  CareerCategory,
  Match,
  QuestionAnswer,
} from "./types";

type Category = CareerCategory;

export const SCORE_MIN = 35;
export const SCORE_MAX = 98;

const CATEGORY_POINTS_MAX = 50;
const SKILL_POINTS_PER_MATCH = 15;
const SKILL_POINTS_CAP = 30;
const DESIRED_BOOST = 20;

/** Fixed order so a tie in category totals always resolves the same way. */
const CATEGORY_ORDER: Category[] = ["build", "analyze", "design", "communicate"];

export interface ScoringInput {
  answers: Record<string, QuestionAnswer>;
  /** Free-text skills from the resume chips plus any answer skills. */
  resumeSkills: string[];
  desiredCareer: string | null;
}

export interface CareerScore {
  slug: string;
  score: number;
  /** Exactly two reasons, always. */
  topReasons: [string, string];
  categoryPoints: number;
  skillMatches: number;
  desiredBoost: boolean;
}

/* ------------------------------------------------------------------ *
 * Skill collection
 * ------------------------------------------------------------------ */

/** Every skill the student has signalled, normalised for matching. */
export function collectStudentSkills(input: ScoringInput): string[] {
  const found = new Set<string>();
  for (const skill of input.resumeSkills) {
    const normalized = normalizeSkill(skill);
    if (normalized) found.add(normalized);
  }
  for (const question of listQuestions()) {
    const answer = input.answers[question.id];
    if (!answer?.selected?.length) continue;
    for (const optionId of answer.selected) {
      const option = question.options?.find((item) => item.id === optionId);
      for (const skill of option?.skills ?? []) {
        const normalized = normalizeSkill(skill);
        if (normalized) found.add(normalized);
      }
    }
  }
  return [...found];
}

function matchingSkills(career: Career, studentSkills: string[]): string[] {
  const matched: string[] = [];
  for (const required of career.required_skills) {
    const hit = studentSkills.some(
      (skill) =>
        skill === normalizeSkill(required.slug) ||
        skill === normalizeSkill(required.name)
    );
    if (hit) matched.push(required.name);
  }
  return matched;
}

/* ------------------------------------------------------------------ *
 * Category weights
 * ------------------------------------------------------------------ */

/** One question's contribution to a single category (0 when neutral). */
function contribution(
  question: ReturnType<typeof listQuestions>[number],
  answer: QuestionAnswer,
  category: Category
): number {
  if (answer.skipped) return 0;

  if (question.kind === "scale") {
    if (typeof answer.value !== "number") return 0;
    const scale = question.scale;
    if (!scale) return 0;
    const span = Math.max(1, scale.max - scale.min);
    const normalised = (answer.value - scale.min) / span; // 0..1
    return normalised * (question.scale_weights?.[category] ?? 0);
  }

  if (!answer.selected?.length) return 0;
  let total = 0;
  for (const optionId of answer.selected) {
    const option = question.options?.find((item) => item.id === optionId);
    total += option?.weights[category] ?? 0;
  }
  return total;
}

/** The most a single category could earn from the questions that were answered. */
function maxPossible(): number {
  let max = 0;
  for (const question of listQuestions()) {
    // Neutral questions (weights empty / scale without weights) contribute
    // nothing to anybody, so they never inflate the denominator.
    let best = 0;
    for (const category of CATEGORY_ORDER) {
      if (question.kind === "scale") {
        const weight = question.scale_weights?.[category] ?? 0;
        best = Math.max(best, weight);
        continue;
      }
      for (const option of question.options ?? []) {
        best = Math.max(best, option.weights[category] ?? 0);
      }
    }
    max += best;
  }
  return max;
}

const MAX_RAW = maxPossible();

/** Raw category total per category for these answers (order = CATEGORY_ORDER). */
export function categoryTotals(input: ScoringInput): Record<Category, number> {
  const totals: Record<Category, number> = {
    build: 0,
    analyze: 0,
    design: 0,
    communicate: 0,
  };
  for (const question of listQuestions()) {
    const answer = input.answers[question.id];
    if (!answer) continue;
    for (const category of CATEGORY_ORDER) {
      totals[category] += contribution(question, answer, category);
    }
  }
  return totals;
}

/** The category with the most energy in the answers (`null` when all skipped). */
export function topCategory(input: ScoringInput): CareerCategory | null {
  const totals = categoryTotals(input);
  let best: CareerCategory | null = null;
  let bestValue = 0;
  for (const category of CATEGORY_ORDER) {
    if (totals[category] > bestValue) {
      best = category;
      bestValue = totals[category];
    }
  }
  return best;
}

/* ------------------------------------------------------------------ *
 * Desired-career fuzzy match
 * ------------------------------------------------------------------ */

function normalizeText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function desiredMatchesCareer(
  desired: string | null,
  career: Career
): boolean {
  if (!desired) return false;
  const needle = normalizeText(desired);
  if (needle.length < 3) return false;
  const title = normalizeText(career.title);
  const slug = career.slug;
  if (title.includes(needle)) return true;
  if (slug.includes(needle.replace(/ /g, "-"))) return true;
  const tokens = needle.split(" ").filter((token) => token.length >= 3);
  return tokens.some(
    (token) =>
      title.includes(token) || slug.includes(token) || career.category === token
  );
}

/* ------------------------------------------------------------------ *
 * Reasons
 * ------------------------------------------------------------------ */

function categoryReason(
  career: Career,
  input: ScoringInput
): string {
  const totals = categoryTotals(input);
  if (totals[career.category] <= 0) {
    return "Sample data: answer a couple of questions and this fills itself in.";
  }
  // The answered question that leaned hardest into this career's category.
  let bestLabel = "";
  let bestWeight = 0;
  for (const question of listQuestions()) {
    const answer = input.answers[question.id];
    if (!answer?.selected?.length) continue;
    for (const optionId of answer.selected) {
      const option = question.options?.find((item) => item.id === optionId);
      const weight = option?.weights[career.category] ?? 0;
      if (weight > bestWeight && option) {
        bestWeight = weight;
        bestLabel = option.label;
      }
    }
  }
  if (!bestLabel) {
    const scale = listQuestions().find(
      (question) =>
        question.kind === "scale" &&
        (question.scale_weights?.[career.category] ?? 0) > 0 &&
        typeof input.answers[question.id]?.value === "number"
    );
    if (scale) {
      const value = input.answers[scale.id]?.value ?? 0;
      const label = value >= 4 ? scale.scale?.maxLabel : scale.scale?.minLabel;
      return `You rated yourself "${label}" on ${scale.prompt.replace(/\?$/, "").toLowerCase()}.`;
    }
    return "Sample data: answer a couple of questions and this fills itself in.";
  }
  return `You picked "${bestLabel}" — that leans towards ${LABEL_FOR_CATEGORY[career.category]}.`;
}

const LABEL_FOR_CATEGORY: Record<Category, string> = {
  build: "work where you make and fix things",
  analyze: "work where you figure out what is true",
  design: "work where you shape how something looks and feels",
  communicate: "work where you plan and explain ideas",
};

function skillReason(career: Career, skills: string[]): string {
  if (!skills.length) {
    return "Sample data: add skills on your profile and this reason gets specific.";
  }
  const list =
    skills.length === 1
      ? skills[0]
      : `${skills.slice(0, -1).join(", ")} and ${skills[skills.length - 1]}`;
  return `You already bring ${list}, which this path uses.`;
}

function desiredReason(desired: string): string {
  return `You wrote "${desired.trim()}" as a career you have in mind.`;
}

const SAMPLE_FALLBACK = "Sample data: a starting point to explore, not a verdict.";

/* ------------------------------------------------------------------ *
 * Public API
 * ------------------------------------------------------------------ */

/**
 * Scores every career for these answers. Deterministic: ties resolve by
 * market demand (high → low), then learning time, then slug.
 */
export function scoreCareers(input: ScoringInput): CareerScore[] {
  const studentSkills = collectStudentSkills(input);
  const totals = categoryTotals(input);

  const scored = listCareers().map((career) => {
    const raw = totals[career.category];
    const categoryPoints =
      MAX_RAW > 0 ? Math.round((raw / MAX_RAW) * CATEGORY_POINTS_MAX) : 0;

    const matches = matchingSkills(career, studentSkills);
    const skillPoints = Math.min(
      Math.round(matches.length * SKILL_POINTS_PER_MATCH),
      SKILL_POINTS_CAP
    );

    const desiredBoost = desiredMatchesCareer(input.desiredCareer, career);
    const total = categoryPoints + skillPoints + (desiredBoost ? DESIRED_BOOST : 0);
    const score = Math.max(
      SCORE_MIN,
      Math.min(SCORE_MAX, Math.round(SCORE_MIN + (total * (SCORE_MAX - SCORE_MIN)) / 100))
    );

    const reasons = [
      categoryReason(career, input),
      skillReason(career, matches),
      desiredBoost && input.desiredCareer ? desiredReason(input.desiredCareer) : "",
      SAMPLE_FALLBACK,
    ].filter(Boolean);

    return {
      slug: career.slug,
      score,
      topReasons: [reasons[0], reasons[1]] as [string, string],
      categoryPoints,
      skillMatches: matches.length,
      desiredBoost,
    } satisfies CareerScore;
  });

  return scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const careerA = getCareer(a.slug);
    const careerB = getCareer(b.slug);
    const demand = DEMAND_RANK[careerB?.market_demand ?? "medium"] -
      DEMAND_RANK[careerA?.market_demand ?? "medium"];
    if (demand !== 0) return demand;
    const months = (careerA?.learning_effort_months ?? 0) - (careerB?.learning_effort_months ?? 0);
    if (months !== 0) return months;
    return a.slug.localeCompare(b.slug);
  });
}

const DEMAND_RANK = { high: 2, medium: 1, low: 0 } as const;

/** Storage shape for `kl.matches`. */
export function toMatches(scores: CareerScore[]): Match[] {
  return scores.map((item) => ({
    slug: item.slug,
    score: item.score,
    topReasons: [...item.topReasons],
  }));
}

/* ------------------------------------------------------------------ *
 * "Lory's read on you" — template based, no career verdicts
 * ------------------------------------------------------------------ */

/** Top three interest labels, in the student's own words, question order. */
export function topInterests(input: ScoringInput, limit = 3): string[] {
  return interestsFrom(input, listQuestions().map((question) => question.id), limit);
}

/** Interest labels from one set of question ids, in question order. */
function interestsFrom(
  input: ScoringInput,
  questionIds: string[],
  limit: number
): string[] {
  const labels: string[] = [];
  for (const questionId of questionIds) {
    const question = listQuestions().find((item) => item.id === questionId);
    if (!question) continue;
    const answer = input.answers[question.id];
    if (!answer?.selected?.length) continue;
    for (const optionId of answer.selected) {
      const option = question.options?.find((item) => item.id === optionId);
      if (option && !labels.includes(option.label)) labels.push(option.label);
    }
    if (labels.length >= limit) break;
  }
  return labels.slice(0, limit);
}

const CATEGORY_PHRASE: Record<Category, string> = {
  build: "building and fixing things",
  analyze: "figuring out how things work",
  design: "making things look and feel right",
  communicate: "explaining ideas and connecting with people",
};

function listPhrase(items: string[]): string {
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

/** One paragraph. Uses the student's words, never decides anything for them. */
export function buildLorySummary(input: ScoringInput): string {
  const freeTime = interestsFrom(input, ["free-time"], 2);
  const matters = interestsFrom(input, ["job-matters"], 2);
  const category = topCategory(input);
  const desired = input.desiredCareer?.trim();

  if (!freeTime.length && !matters.length && !category) {
    return "You skipped a lot, and that is completely fine — there really are no wrong answers. Open whichever career sounds interesting and I will adjust the map as we learn what you like. (Sample)";
  }

  const clauses: string[] = [];
  if (freeTime.length) {
    clauses.push(`You drift towards ${listPhrase(freeTime).toLowerCase()}`);
  }
  if (matters.length) {
    clauses.push(
      `${freeTime.length ? "and you" : "You"} care most about ${listPhrase(matters).toLowerCase()}`
    );
  }
  if (!clauses.length) clauses.push("You kept most of the options open");

  const categoryPhrase = category
    ? `. That leans towards ${CATEGORY_PHRASE[category]}`
    : "";
  const desiredPhrase = desired
    ? `. You mentioned "${desired.trim()}", so I will keep it in view`
    : "";

  return `${clauses.join(" ")}${categoryPhrase}${desiredPhrase}. I will show you a few possible paths and you decide what fits. (Sample)`;
}
