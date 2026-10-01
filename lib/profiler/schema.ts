/**
 * Explorer Profile schema — the validated shape of the Student Profiler's
 * output and of `profiles.ai_context`.
 *
 * Zod is the enforcement point: the profiler returns `unknown` from the AI
 * service, and nothing reaches the UI or Supabase until it passes this
 * schema. Fields are optional-with-defaults so sparse onboarding answers
 * validate; the model must use empty arrays — never invented content — for
 * anything the student did not provide.
 */

import { z } from "zod";

const evidenceSchema = z.object({
  questionKey: z.string(),
  note: z.string().max(280),
});

const careerUncertaintySchema = z.object({
  isUnsure: z.boolean(),
  explorationSignals: z.array(z.string()).default([]),
});

export const explorerProfileSchema = z.object({
  strengths: z.array(z.string()).default([]),
  developingAreas: z.array(z.string()).default([]),
  unassessedAreas: z.array(z.string()).default([]),
  experience: z.array(z.string()).default([]),
  knowledge: z.array(z.string()).default([]),
  careerUncertainty: careerUncertaintySchema,
  evidence: z.array(evidenceSchema).default([]),
  summary: z.string().max(500),
});

export type ExplorerProfile = z.infer<typeof explorerProfileSchema>;

/**
 * JSON Schema mirror for the AI service (`AIStructuredGenerationInput`).
 * Kept as a hand-written mirror — rather than generated — so the AI layer
 * stays free of a Zod dependency. Update both together when the shape
 * changes.
 */
export const explorerProfileJsonSchema = {
  name: "ExplorerProfile",
  description:
    "Structured Explorer Profile derived only from the student's onboarding answers.",
  schema: {
    type: "object",
    properties: {
      strengths: { type: "array", items: { type: "string" } },
      developingAreas: { type: "array", items: { type: "string" } },
      unassessedAreas: { type: "array", items: { type: "string" } },
      experience: { type: "array", items: { type: "string" } },
      knowledge: { type: "array", items: { type: "string" } },
      careerUncertainty: {
        type: "object",
        properties: {
          isUnsure: { type: "boolean" },
          explorationSignals: { type: "array", items: { type: "string" } },
        },
        required: ["isUnsure"],
      },
      evidence: {
        type: "array",
        items: {
          type: "object",
          properties: {
            questionKey: { type: "string" },
            note: { type: "string" },
          },
          required: ["questionKey", "note"],
        },
      },
      summary: { type: "string" },
    },
    required: ["careerUncertainty", "summary"],
  },
};
