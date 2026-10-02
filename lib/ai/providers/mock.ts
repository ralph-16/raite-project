import "server-only";

/**
 * Mock provider — the development and test implementation.
 *
 * Deterministic, requires no credentials, and runs entirely server-side. It
 * exists so the AI architecture can be exercised end to end before a vendor is
 * chosen.
 *
 * It does NOT pretend to be a real model. It does not reason, does not produce
 * student-facing recommendations, and its output is explicitly labelled in the
 * returned metadata. Any feature built on top of it in development must treat
 * the result as a placeholder, never as advice for a real student.
 */

import type {
  AIProvider,
  AIStructuredGenerationInput,
  AITextGenerationInput,
  AITextGenerationResult,
} from "../types";

const PROVIDER_ID = "mock";
const DEFAULT_MODEL = "mock-echo-v1";

/** Deterministic label returned in place of model output. */
const MOCK_PREFIX = "Ka-Lakbay AI infrastructure is working.";

/** Artificial latency so timing behaviour is observable in development. */
const MOCK_LATENCY_MS = 50;

/**
 * Schema-valid fixtures for every AI route that uses structured
 * output, keyed by the caller's `jsonSchema.name`. This is what
 * makes `AI_PROVIDER=mock` exercisable end to end: the UI and
 * tests get real, schema-valid shapes without a live model.
 *
 * Every fixture is deterministic and explicitly labelled
 * (`metadata.mock = true`) so it can never be mistaken for
 * model-generated advice.
 */
const NEXT_QUESTION_FIXTURES: Array<Record<string, unknown>> = [
  {
    done: false,
    key: "year_level",
    topic: "year_level",
    type: "single_choice",
    prompt: "What year are you in right now?",
    options: [
      { value: "first_year", label: "First year" },
      { value: "second_year", label: "Second year" },
      { value: "third_year", label: "Third year" },
      { value: "fourth_year", label: "Fourth year" },
      { value: "graduate", label: "Already graduated" },
      { value: "working", label: "Working" },
    ],
  },
  {
    done: false,
    key: "program",
    topic: "program",
    type: "short_text",
    prompt: "What are you studying?",
    options: [],
  },
  {
    done: false,
    key: "interests",
    topic: "interests",
    type: "multi_choice",
    prompt: "What do you enjoy doing in your free time? Pick all that apply.",
    options: [
      { value: "building", label: "Building things" },
      { value: "writing", label: "Writing" },
      { value: "helping", label: "Helping people" },
      { value: "numbers", label: "Numbers and puzzles" },
      { value: "design", label: "Design and art" },
    ],
  },
  {
    done: false,
    key: "skills",
    topic: "skills",
    type: "multi_choice",
    prompt: "Which of these have you actually tried? Pick all that apply.",
    options: [
      { value: "coding", label: "Coding" },
      { value: "design", label: "Design" },
      { value: "data", label: "Data and spreadsheets" },
      { value: "writing", label: "Writing" },
      { value: "presenting", label: "Presenting" },
    ],
  },
  {
    done: false,
    key: "experience",
    topic: "experience",
    type: "short_text",
    prompt: "Tell me about a project or job you learned something from.",
    options: [],
  },
  {
    done: false,
    key: "learning_time",
    topic: "learning",
    type: "single_choice",
    prompt: "How much time could you spend learning each week?",
    options: [
      { value: "under_1h", label: "Under an hour" },
      { value: "1-3h", label: "1 to 3 hours" },
      { value: "4-7h", label: "4 to 7 hours" },
      { value: "8h_plus", label: "8+ hours" },
    ],
  },
  {
    done: false,
    key: "working_style",
    topic: "other",
    type: "single_choice",
    prompt: "Do you prefer working with others or on your own?",
    options: [
      { value: "alone", label: "Mostly on my own" },
      { value: "mixed", label: "A mix of both" },
      { value: "team", label: "Mostly with others" },
    ],
  },
  {
    done: false,
    key: "job_values",
    topic: "other",
    type: "multi_choice",
    prompt: "What matters most to you in a job? Pick all that apply.",
    options: [
      { value: "learning", label: "Learning new things" },
      { value: "people", label: "Working with people" },
      { value: "creative", label: "Creative freedom" },
      { value: "stability", label: "Stability" },
      { value: "impact", label: "Visible impact" },
    ],
  },
];

/**
 * Honest placeholder profile: every list is empty because the mock
 * never read any student answers. The summary says so plainly.
 */
const EXPLORER_PROFILE_FIXTURE: Record<string, unknown> = {
  strengths: [],
  developingAreas: [],
  unassessedAreas: [],
  experience: [],
  knowledge: [],
  careerUncertainty: { isUnsure: true, explorationSignals: [] },
  evidence: [],
  summary:
    "Mock profile (AI_PROVIDER=mock): no real profile was generated. Use a real provider for an actual Explorer Profile.",
};

/** Reads "Questions answered so far: N" from the route's prompt. */
function answeredCount(prompt: string): number {
  const match = /Questions answered so far:\s*(\d+)/.exec(prompt);
  return match ? Number(match[1]) : 0;
}

function buildFixture(
  schemaName: string,
  input: AIStructuredGenerationInput
): Record<string, unknown> {
  if (schemaName === "NextQuestion") {
    const index = Math.min(
      Math.max(answeredCount(input.prompt), 0),
      NEXT_QUESTION_FIXTURES.length - 1
    );
    return NEXT_QUESTION_FIXTURES[index];
  }
  if (schemaName === "ExplorerProfile") return EXPLORER_PROFILE_FIXTURE;
  // Unknown schema: the caller's Zod validation will reject it, which
  // is the honest outcome — the mock cannot fabricate every shape.
  return {};
}

export class MockProvider implements AIProvider {
  readonly id = PROVIDER_ID;
  readonly defaultModel = DEFAULT_MODEL;

  /** Needs no API key, so it is always available. */
  isAvailable(): boolean {
    return true;
  }

  async generateText(
    input: AITextGenerationInput
  ): Promise<AITextGenerationResult> {
    await delay(MOCK_LATENCY_MS);

    return {
      text: buildResponse(input),
      model: input.model ?? this.defaultModel,
      provider: this.id,
      usage: estimateUsage(input),
      metadata: {
        mock: true,
        operation: input.operation ?? null,
        note: "Deterministic mock output. Not model-generated.",
      },
    };
  }

  /**
   * Structured path: returns a deterministic, schema-valid
   * fixture for the requested shape (see `buildFixture`), so
   * mock mode never needs a live model to walk a flow.
   */
  async generateStructured(
    input: AIStructuredGenerationInput
  ): Promise<AITextGenerationResult> {
    await delay(MOCK_LATENCY_MS);

    const fixture = buildFixture(input.jsonSchema.name, input);

    return {
      text: JSON.stringify(fixture),
      model: input.model ?? this.defaultModel,
      provider: this.id,
      usage: estimateUsage(input),
      metadata: {
        mock: true,
        operation: input.operation ?? null,
        schema: input.jsonSchema.name,
        note: "Deterministic mock fixture. Not model-generated.",
      },
    };
  }
}

/**
 * Echoes the request back in a stable, predictable form so a caller can confirm
 * the pipeline carried every field through: system, prompt, model and options.
 */
function buildResponse(input: AITextGenerationInput): string {
  const lines = [MOCK_PREFIX];

  if (input.system) lines.push(`System: ${input.system}`);
  lines.push(`Prompt: ${input.prompt}`);

  if (input.model) lines.push(`Model: ${input.model}`);
  if (typeof input.temperature === "number") {
    lines.push(`Temperature: ${input.temperature}`);
  }
  if (typeof input.maxTokens === "number") {
    lines.push(`Max tokens: ${input.maxTokens}`);
  }

  return lines.join("\n");
}

/**
 * Naive whitespace-token count, so the usage shape is exercised without
 * pretending to match any real provider's tokenizer.
 */
function estimateUsage(input: AITextGenerationInput): {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
} {
  const inputText = [input.system, input.prompt].filter(Boolean).join(" ");
  const inputTokens = countTokens(inputText);
  const outputTokens = countTokens(buildResponse(input));

  return { inputTokens, outputTokens, totalTokens: inputTokens + outputTokens };
}

function countTokens(value: string): number {
  const trimmed = value.trim();
  return trimmed.length === 0 ? 0 : trimmed.split(/\s+/).length;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
