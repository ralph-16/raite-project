/**
 * Parsed-resume schema — the validated shape of `/api/resume/parse` output
 * and of `resumes.parsed_context`.
 *
 * Mirrors DATABASE.md (`{ summary, skills, experience, education, projects }`).
 * Everything is optional-with-defaults: an empty or thin resume validates
 * with empty arrays, never invented entries.
 */

import { z } from "zod";

export const parsedResumeSchema = z.object({
  summary: z.string().max(500).default(""),
  skills: z.array(z.string().max(80)).default([]),
  experience: z.array(z.string().max(200)).default([]),
  education: z.array(z.string().max(200)).default([]),
  projects: z.array(z.string().max(200)).default([]),
});

export type ParsedResume = z.infer<typeof parsedResumeSchema>;

/**
 * JSON Schema mirror for the AI service. Hand-written so the AI layer stays
 * free of a Zod dependency — update both together.
 */
export const parsedResumeJsonSchema = {
  name: "ParsedResume",
  description:
    "Skills, experience, education, and projects extracted only from the provided resume.",
  schema: {
    type: "object",
    properties: {
      summary: { type: "string" },
      skills: { type: "array", items: { type: "string" } },
      experience: { type: "array", items: { type: "string" } },
      education: { type: "array", items: { type: "string" } },
      projects: { type: "array", items: { type: "string" } },
    },
    required: [],
  },
};
