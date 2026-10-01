import "server-only";

/**
 * Resume parsing — same pattern as the Student Profiler: model output →
 * Zod validation → typed result, with one Zod-error retry.
 *
 * Privacy: file bytes and parsed text are never logged. The AI logger only
 * ever sees provider, model, duration, and outcome.
 */

import { generateStructured } from "@/lib/ai";
import { aiParseError } from "@/lib/ai/errors";
import type { AIAttachment } from "@/lib/ai/types";
import { parsedResumeJsonSchema, parsedResumeSchema, type ParsedResume } from "./schema";

export type { ParsedResume };

const SYSTEM_PROMPT = [
  "You extract structured facts from a student's resume.",
  "Strict rules:",
  "1. Copy ONLY what is written in the resume. Never invent skills, jobs,",
  "   schools, or projects. If a section is absent, return an empty array.",
  "2. Keep every string short and plain. No markdown.",
  "3. The summary (max 2 sentences) describes what the resume contains,",
  "   not what the student should do.",
].join("\n");

export interface ResumeParseResult {
  parsed: ParsedResume;
  model: string;
  provider: string;
}

/**
 * Parses resume content. PDFs arrive as a file attachment; DOCX arrives as
 * pre-extracted text (see the route). Either way the model sees the content
 * exactly once, inside this call.
 */
export async function runResumeParse(input: {
  text?: string;
  attachment?: AIAttachment;
}): Promise<ResumeParseResult> {
  const prompt = [
    "Extract skills, experience entries, education, and projects from this resume.",
    ...(input.text ? ["", "Resume text:", input.text] : []),
    ...(input.attachment
      ? ["", "The attached PDF is the resume. Extract from it."]
      : []),
    "",
    "Respond with JSON only, matching the ParsedResume schema.",
  ].join("\n");

  const base = {
    system: SYSTEM_PROMPT,
    jsonSchema: parsedResumeJsonSchema,
    operation: "resume_parse",
  } as const;

  const first = await generateStructured({
    ...base,
    prompt,
    ...(input.attachment ? { attachments: [input.attachment] } : {}),
  });
  const firstParse = parsedResumeSchema.safeParse(first.value);
  if (firstParse.success) {
    return { parsed: firstParse.data, model: first.model, provider: first.provider };
  }

  const issues = firstParse.error.issues
    .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
    .join("; ");
  const second = await generateStructured({
    ...base,
    prompt: `${prompt}\n\nYour previous response failed validation: ${issues}. Fix exactly these problems.`,
    ...(input.attachment ? { attachments: [input.attachment] } : {}),
  });
  const secondParse = parsedResumeSchema.safeParse(second.value);
  if (!secondParse.success) {
    throw aiParseError("The resume output did not match the expected shape.", {
      provider: second.provider,
      model: second.model,
      detail: "schema validation failed after retry",
    });
  }
  return { parsed: secondParse.data, model: second.model, provider: second.provider };
}
