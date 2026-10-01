/**
 * Typed loader for /data/careers.json.
 *
 * Swap point: replacing this file with Supabase reads
 * (`careers` + `career_skills` + `career_relationships`) changes nothing
 * above it — components only import `listCareers()` / `getCareer()`.
 */

import careerData from "@/data/careers.json";

import { careerListSchema } from "./schemas";
import type { Career } from "./types";

const parsed = careerListSchema.parse(careerData);

const bySlug = new Map<string, Career>(
  parsed.careers.map((career) => [career.slug, career])
);

/** All 8 seeded careers, in file order (stable — used as the score tiebreak). */
export function listCareers(): Career[] {
  return parsed.careers;
}

/** One career by slug, or `undefined` when the slug is unknown. */
export function getCareer(slug: string): Career | undefined {
  return bySlug.get(slug);
}

/** Skill lookup across all careers — used to explain a match. */
export function findRequiredSkill(
  career: Career,
  skill: string
): Career["required_skills"][number] | undefined {
  const needle = normalizeSkill(skill);
  return career.required_skills.find(
    (required) =>
      normalizeSkill(required.slug) === needle ||
      normalizeSkill(required.name) === needle
  );
}

/** Lower-case, strip spaces/hyphens/slashes so "UI Design" === "ui-design". */
export function normalizeSkill(skill: string): string {
  return skill.toLowerCase().replace(/[^a-z0-9]/g, "");
}
