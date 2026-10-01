/**
 * Next-question schema — validated shape of `/api/onboarding/next-question`
 * output. A question carries a stable `key` and `topic` so answers map onto
 * the onboarding state without inventing structure.
 */

import { z } from "zod";

const optionSchema = z.object({
  value: z.string().min(1).max(80),
  label: z.string().min(1).max(80),
});

export const nextQuestionSchema = z
  .object({
    done: z.boolean(),
    key: z.string().max(60).default(""),
    topic: z
      .enum([
        "year_level",
        "program",
        "interests",
        "skills",
        "experience",
        "learning",
        "other",
      ])
      .default("other"),
    type: z.enum(["single_choice", "multi_choice", "short_text"]).default("short_text"),
    prompt: z.string().min(1).max(280).default(""),
    options: z.array(optionSchema).max(8).default([]),
  })
  .refine((v) => v.done || v.prompt.length > 0, {
    message: "an unfinished turn needs a prompt",
  })
  .refine((v) => v.done || v.key.length > 0, {
    message: "an unfinished turn needs a key",
  });

export type NextQuestion = z.infer<typeof nextQuestionSchema>;

export const nextQuestionJsonSchema = {
  name: "NextQuestion",
  description:
    "The next onboarding question, or done=true when enough is known.",
  schema: {
    type: "object",
    properties: {
      done: { type: "boolean" },
      key: { type: "string" },
      topic: {
        type: "string",
        enum: [
          "year_level",
          "program",
          "interests",
          "skills",
          "experience",
          "learning",
          "other",
        ],
      },
      type: {
        type: "string",
        enum: ["single_choice", "multi_choice", "short_text"],
      },
      prompt: { type: "string" },
      options: {
        type: "array",
        items: {
          type: "object",
          properties: {
            value: { type: "string" },
            label: { type: "string" },
          },
          required: ["value", "label"],
        },
      },
    },
    required: ["done"],
  },
};
