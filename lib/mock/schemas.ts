/**
 * Zod schemas for every static JSON file in /data and for the shapes stored
 * in localStorage. Loaders validate once, components only ever see typed
 * data — so a bad data file fails loudly instead of rendering undefined.
 */

import { z } from "zod";

const categorySchema = z.enum(["build", "analyze", "design", "communicate"]);
const demandSchema = z.enum(["high", "medium", "low"]);
const relationshipTypeSchema = z.enum([
  "related",
  "next_level",
  "pivot",
  "alternative",
]);

const salarySchema = z.object({
  median: z.number(),
  currency: z.string().length(3),
  period: z.enum(["hourly", "monthly", "annual"]),
});

const requiredSkillSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  /** 1–5, same range as `career_skills.importance`. */
  importance: z.number().int().min(1).max(5),
});

const relatedCareerSchema = z.object({
  slug: z.string().min(1),
  type: relationshipTypeSchema,
  rationale: z.string().min(1),
  transferable_skills: z.array(z.string().min(1)),
});

export const careerSchema = z.object({
  slug: z.string().min(1),
  title: z.string().min(1),
  category: categorySchema,
  description: z.string().min(1),
  /** Day-to-day detail — mirrors `careers.role_description`. */
  role_description: z.string().min(1),
  daily_work: z.array(z.string().min(1)).min(1),
  required_skills: z.array(requiredSkillSchema).min(1),
  salary: salarySchema,
  market_demand: demandSchema,
  learning_effort_months: z.number().int().min(1).max(120),
  related: z.array(relatedCareerSchema),
  /** Every seeded figure is illustrative; the UI must label it. */
  is_sample_data: z.boolean(),
});

export const careerListSchema = z.object({
  careers: z.array(careerSchema).min(1),
});

/* ------------------------------------------------------------------ *
 * Onboarding questions
 * ------------------------------------------------------------------ */

/** `career_category` weights an option contributes to the match score. */
const weightsSchema = z.object({
  build: z.number().optional(),
  analyze: z.number().optional(),
  design: z.number().optional(),
  communicate: z.number().optional(),
});

const optionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  weights: weightsSchema,
  /** Skill slugs this answer implies (credited in scoring). */
  skills: z.array(z.string().min(1)).optional(),
});

export const questionSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(["single", "multi", "scale", "text"]),
  prompt: z.string().min(1),
  helper: z.string().optional(),
  options: z.array(optionSchema).optional(),
  scale: z
    .object({
      min: z.number().int(),
      max: z.number().int(),
      minLabel: z.string(),
      maxLabel: z.string(),
    })
    .optional(),
  /** Category a scale answer leans towards (its weight at max value). */
  scale_weights: weightsSchema.optional(),
  /** Optional short-text note shown under the choices. */
  allow_text: z.boolean().optional(),
  text_prompt: z.string().optional(),
  /** Every question is skippable — this just controls the default copy. */
  skippable: z.boolean(),
});

export const questionListSchema = z.object({
  questions: z.array(questionSchema).length(8),
});

/* ------------------------------------------------------------------ *
 * Roadmap skill tree
 * ------------------------------------------------------------------ */

const resourceSchema = z.object({
  type: z.enum([
    "course",
    "documentation",
    "tutorial",
    "article",
    "video",
    "project",
    "assessment",
  ]),
  title: z.string().min(1),
  provider: z.string().min(1),
  url: z
    .string()
    .regex(/^https?:\/\/\S+$/, "resource url must be absolute http(s)"),
  duration_minutes: z.number().int().min(1),
  difficulty: z.number().int().min(1).max(5),
  note: z.string().optional(),
});

const nodeSchema = z.object({
  key: z.string().min(1),
  type: z.enum(["skill", "milestone", "project", "proof", "resource_only"]),
  title: z.string().min(1),
  description: z.string().min(1),
  skill_slug: z.string().nullable(),
  tier: z.number().int().min(0),
  lane: z.number().int().min(0),
  estimated_hours: z.number().min(0),
  resources: z.array(resourceSchema),
});

const edgeSchema = z.object({
  node_key: z.string().min(1),
  depends_on_key: z.string().min(1),
});

export const roadmapSchema = z.object({
  schema_version: z.literal(1),
  career_slug: z.string().min(1),
  version: z.number().int().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  nodes: z.array(nodeSchema).min(1),
  edges: z.array(edgeSchema),
  related_careers: z.array(relatedCareerSchema),
});

/* ------------------------------------------------------------------ *
 * Landing copy
 * ------------------------------------------------------------------ */

export const landingCopySchema = z.object({
  hero: z.object({
    eyebrow: z.string(),
    headlineBefore: z.string(),
    headlineAccent: z.string(),
    headlineAfter: z.string(),
    subhead: z.string(),
    primaryCta: z.string(),
    secondaryCta: z.string(),
    trustLine: z.string(),
  }),
  howItWorks: z.object({
    title: z.string(),
    intro: z.string(),
    steps: z
      .array(
        z.object({
          number: z.string(),
          title: z.string(),
          description: z.string(),
        })
      )
      .length(3),
  }),
  features: z.object({
    title: z.string(),
    intro: z.string(),
    items: z
      .array(z.object({ title: z.string(), description: z.string() }))
      .length(4),
  }),
  finalCta: z.object({
    headline: z.string(),
    button: z.string(),
  }),
});

/* ------------------------------------------------------------------ *
 * localStorage envelopes
 * ------------------------------------------------------------------ */

export const mockUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  displayName: z.string(),
  createdAt: z.string(),
});

export const mockSessionSchema = z.object({
  userId: z.string(),
  email: z.string(),
  displayName: z.string(),
  signedInAt: z.string(),
});

export const questionAnswerSchema = z.object({
  selected: z.array(z.string()).optional(),
  value: z.number().optional(),
  text: z.string().optional(),
  skipped: z.boolean().optional(),
});

export const parsedResumeSchema = z.object({
  fileName: z.string(),
  summary: z.string(),
  skills: z.array(z.string()),
  experience: z.array(z.string()),
  education: z.array(z.string()),
});

export const onboardingStateSchema = z.object({
  step: z.number().int().min(0),
  completed: z.boolean(),
  desiredCareer: z.string().nullable(),
  resume: parsedResumeSchema.nullable(),
  answers: z.record(z.string(), questionAnswerSchema),
  skipped: z.array(z.string()),
  updatedAt: z.string(),
});

export const mockProfileSchema = z.object({
  displayName: z.string(),
  email: z.string(),
  desiredCareer: z.string().nullable(),
  resumeSkills: z.array(z.string()),
  interests: z.array(z.string()),
  topCategory: categorySchema.nullable(),
  lorySummary: z.string(),
  onboardingCompleted: z.boolean(),
  updatedAt: z.string(),
});

export const matchSchema = z.object({
  slug: z.string(),
  score: z.number().int().min(0).max(100),
  topReasons: z.array(z.string()).length(2),
});

export const matchListSchema = z.array(matchSchema);

export const roadmapProgressSchema = z.object({
  nodes: z.record(
    z.string(),
    z.enum(["not_started", "in_progress", "completed"])
  ),
  updatedAt: z.string(),
});

export const themeSchema = z.enum(["light", "dark"]);
