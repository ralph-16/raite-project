"use client";

/**
 * One question per screen (steps 4–11). Kinds: `single`, `multi` (capped at
 * three), `scale` (1–5 from the data), `text`.
 *
 * Two escape hatches everywhere, per the product rules:
 * - "I'm not sure yet" → stored as `{ skipped: true }` (an explicit answer
 *   scoring treats as zero evidence).
 * - Footer "Skip this one" → answer removed entirely, id logged in `skipped`.
 */

import * as React from "react";
import { Textarea } from "@/components/ui/textarea";
import { LoryAvatar } from "@/components/onboarding/lory-avatar";
import { listQuestions } from "@/lib/mock/questions";
import { Check, Minus, Plus } from "lucide-react";
import type { OnboardingQuestion, QuestionAnswer } from "@/lib/mock/types";

const MULTI_MAX = 3;

export interface QuestionStepProps {
  question: OnboardingQuestion;
  answer: QuestionAnswer | undefined;
  onChange: (answer: QuestionAnswer | null) => void;
}

export function QuestionStep({ question, answer, onChange }: QuestionStepProps) {
  const number = listQuestions().findIndex((item) => item.id === question.id) + 1;
  const unsure = answer?.skipped === true;
  const selected = answer?.skipped ? [] : (answer?.selected ?? []);
  const scale = question.scale ?? { min: 1, max: 5, minLabel: "Not yet", maxLabel: "A lot" };
  const scaleValue = answer?.skipped || typeof answer?.value !== "number" ? undefined : answer.value;

  /** Keeps the optional free-text note when the choice part changes. */
  const keepText = (patch: QuestionAnswer): QuestionAnswer => {
    if (answer?.text) patch.text = answer.text;
    return patch;
  };

  const toggleOption = (optionId: string) => {
    if (unsure) {
      onChange(keepText({ selected: [optionId] }));
      return;
    }
    if (selected.includes(optionId)) {
      const next = selected.filter((item) => item !== optionId);
      onChange(next.length === 0 ? (answer?.text ? { text: answer.text } : null) : keepText({ selected: next }));
      return;
    }
    if (selected.length >= MULTI_MAX) return;
    onChange(keepText({ selected: [...selected, optionId] }));
  };

  const toggleUnsure = () => {
    if (unsure) {
      onChange(answer?.text ? { text: answer.text } : null);
      return;
    }
    onChange(answer?.text ? { skipped: true, text: answer.text } : { skipped: true });
  };

  const setScale = (next: number) => {
    const clamped = Math.min(scale.max, Math.max(scale.min, next));
    onChange(keepText({ value: clamped }));
  };

  const setText = (text: string) => {
    const base: QuestionAnswer = { ...answer };
    if (text.trim() === "") delete base.text;
    else base.text = text;
    const hasContent =
      Boolean(base.selected?.length) ||
      typeof base.value === "number" ||
      base.skipped === true ||
      Boolean(base.text);
    onChange(hasContent ? base : null);
  };

  const isUnsureSelected = (active: boolean) =>
    active
      ? "flex w-full items-center justify-between gap-3 rounded-xl border-2 border-primary bg-lory-blue/10 px-4 py-3.5 text-left text-sm font-medium transition-colors"
      : "flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3.5 text-left text-sm transition-colors hover:border-lory-blue";

  return (
    <div className="grid items-start gap-10 md:grid-cols-[1.4fr_1fr]">
      <div className="max-w-2xl">
        <p className="font-mono text-xs text-muted-foreground">
          Question {number} of {listQuestions().length}
        </p>
        <h1 className="mt-2 font-display font-normal text-3xl md:text-4xl">{question.prompt}</h1>

        {question.helper ? (
          <div className="mt-4 max-w-md rounded-xl border border-border bg-muted p-4 text-xs text-muted-foreground">
            <span className="rounded-sm bg-lory-yellow/40 px-1.5 py-0.5 font-medium text-foreground">
              Why we ask
            </span>{" "}
            {question.helper}
          </div>
        ) : null}

        <div className="mt-8">
          {question.kind === "single" || question.kind === "multi" ? (
            <ul className="grid gap-2">
              {question.options?.map((option) => {
                const active = selected.includes(option.id);
                const full =
                  question.kind === "multi" && selected.length >= MULTI_MAX && !active;
                return (
                  <li key={option.id}>
                    <button
                      type="button"
                      aria-pressed={active}
                      disabled={full}
                      onClick={() => toggleOption(option.id)}
                      className={
                        active
                          ? "flex w-full items-center justify-between gap-3 rounded-xl border-2 border-primary bg-lory-blue/10 px-4 py-3.5 text-left text-sm font-medium transition-colors"
                          : "flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3.5 text-left text-sm transition-colors hover:border-lory-blue disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-border"
                      }
                    >
                      <span>{option.label}</span>
                      {active ? (
                        <Check className="size-4 shrink-0 text-lory-blue" aria-hidden />
                      ) : null}
                    </button>
                  </li>
                );
              })}
              <li>
                <button
                  type="button"
                  aria-pressed={unsure}
                  onClick={toggleUnsure}
                  className={isUnsureSelected(unsure)}
                >
                  <span>I&apos;m not sure yet</span>
                  {unsure ? (
                    <Check className="size-4 shrink-0 text-lory-blue" aria-hidden />
                  ) : null}
                </button>
              </li>
            </ul>
          ) : null}

          {question.kind === "multi" && selected.length >= MULTI_MAX ? (
            <p className="mt-2 text-xs text-muted-foreground" role="status">
              Three&apos;s the limit — tap one to swap it out.
            </p>
          ) : null}

          {question.kind === "scale" ? (
            <div>
              <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
                <button
                  type="button"
                  aria-label="One point less"
                  disabled={scaleValue === undefined || scaleValue <= scale.min}
                  onClick={() => setScale((scaleValue ?? scale.max) - 1)}
                  className="grid size-11 shrink-0 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:border-lory-blue hover:text-foreground disabled:opacity-40"
                >
                  <Minus className="size-4" aria-hidden />
                </button>
                <div className="flex flex-1 justify-center gap-2">
                  {Array.from({ length: scale.max - scale.min + 1 }, (_, i) => scale.min + i).map(
                    (n) => {
                      const active = scaleValue === n;
                      return (
                        <button
                          key={n}
                          type="button"
                          aria-label={`${n} of ${scale.max}`}
                          aria-pressed={active}
                          onClick={() => setScale(n)}
                          className={
                            active
                              ? "grid size-11 place-items-center rounded-full bg-primary font-mono text-sm text-primary-foreground"
                              : "grid size-11 place-items-center rounded-full border border-border font-mono text-sm text-muted-foreground transition-colors hover:border-lory-blue hover:text-foreground"
                          }
                        >
                          {n}
                        </button>
                      );
                    }
                  )}
                </div>
                <button
                  type="button"
                  aria-label="One point more"
                  disabled={scaleValue === undefined || scaleValue >= scale.max}
                  onClick={() => setScale((scaleValue ?? scale.min) + 1)}
                  className="grid size-11 shrink-0 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:border-lory-blue hover:text-foreground disabled:opacity-40"
                >
                  <Plus className="size-4" aria-hidden />
                </button>
              </div>
              <div className="mt-2 flex justify-between px-2 text-xs text-muted-foreground">
                <span>{scale.minLabel}</span>
                <span>{scale.maxLabel}</span>
              </div>
              <div className="mt-5">
                <button
                  type="button"
                  aria-pressed={unsure}
                  onClick={toggleUnsure}
                  className={
                    unsure
                      ? "rounded-full border-2 border-primary bg-lory-blue/10 px-4 py-2 text-sm font-medium"
                      : "rounded-full border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:border-lory-blue hover:text-foreground"
                  }
                >
                  I&apos;m not sure yet
                </button>
              </div>
            </div>
          ) : null}

          {question.kind === "text" ? (
            <div className="max-w-xl">
              <Textarea
                value={answer?.text ?? ""}
                rows={5}
                placeholder="Type anything — rough notes are fine."
                aria-label={question.prompt}
                onChange={(event) => setText(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    document.getElementById("onboarding-continue")?.click();
                  }
                }}
              />
              <p className="mt-2 text-xs text-muted-foreground">
                Shift + Enter for a new line. Enter continues.
              </p>
            </div>
          ) : null}

          {question.allow_text && question.kind !== "text" ? (
            <div className="mt-6 max-w-xl">
              <label className="block text-sm font-medium" htmlFor={`note-${question.id}`}>
                {question.text_prompt ?? "Anything else? (optional)"}
              </label>
              <input
                id={`note-${question.id}`}
                type="text"
                value={answer?.text ?? ""}
                onChange={(event) => setText(event.target.value)}
                placeholder="Optional note"
                className="mt-2 h-11 w-full rounded-md border border-input bg-transparent px-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lory-blue focus-visible:ring-offset-2"
              />
            </div>
          ) : null}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <div className="inline-flex rounded-full bg-lory-pink/20 p-2">
          <LoryAvatar state={answer ? "happy" : "idle"} size="md" />
        </div>
        <p aria-live="polite" className="mt-4 text-sm leading-relaxed">
          {answer
            ? "Locked in as a draft — go back any time and change it."
            : "Answer, skip, or say you're unsure. All three are genuinely fine."}
        </p>
        <p className="mt-3 text-xs text-muted-foreground">
          Lory uses this to order possibilities, never to pick one for you.
        </p>
      </div>
    </div>
  );
}
