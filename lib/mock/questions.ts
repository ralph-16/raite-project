/**
 * Typed loader for /data/questions.json — the 8 onboarding questions
 * (wizard steps 4–11). Answers are stored against `question.id`.
 */

import questionData from "@/data/questions.json";

import { questionListSchema } from "./schemas";
import type { QuestionAnswer, QuestionList } from "./types";

const parsed = questionListSchema.parse(questionData);

/** The 8 questions in the order they are asked. */
export function listQuestions(): QuestionList {
  return parsed.questions;
}

export function getQuestion(id: string): QuestionList[number] | undefined {
  return parsed.questions.find((question) => question.id === id);
}

/** True when the student answered (or explicitly skipped) this question. */
export function isAnswered(
  question: QuestionList[number],
  answers: Record<string, QuestionAnswer>
): boolean {
  const answer = answers[question.id];
  if (!answer) return false;
  if (answer.skipped) return true;
  if (question.kind === "scale") return typeof answer.value === "number";
  if (question.kind === "text") return Boolean(answer.text?.trim());
  return Boolean(answer.selected && answer.selected.length > 0);
}

/** Human-readable rendering of an answer, used on /profile. */
export function formatAnswer(
  question: QuestionList[number],
  answer: QuestionAnswer | undefined
): string {
  if (!answer) return "Not answered";
  if (answer.skipped) return "Skipped";
  const labels: string[] = [];
  if (question.kind === "scale" && typeof answer.value === "number") {
    const scale = question.scale;
    labels.push(
      scale
        ? `${answer.value} of ${scale.max} — ${answer.value <= 2 ? scale.minLabel : answer.value >= 4 ? scale.maxLabel : "Somewhere in between"}`
        : String(answer.value)
    );
  }
  if (answer.selected?.length) {
    for (const id of answer.selected) {
      const option = question.options?.find((item) => item.id === id);
      labels.push(option ? option.label : id);
    }
  }
  if (answer.text?.trim()) labels.push(`Note: ${answer.text.trim()}`);
  return labels.length ? labels.join(" · ") : "Not answered";
}
