"use client";

import * as React from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { OnboardingQuestion } from "@/lib/onboarding/types";
import { ChoiceGroup } from "./choice-group";

export interface QuestionFieldValue {
  openText?: string;
  singleSelected?: string;
  multiSelected?: string[];
  booleanValue?: boolean;
  scaleValue?: number;
}

interface QuestionFieldProps {
  question: OnboardingQuestion;
  value: QuestionFieldValue;
  error?: string;
  onChange: (next: QuestionFieldValue) => void;
}

/**
 * Generic renderer for every `onboarding_question_type`. New static or
 * AI-generated questions reuse this — no per-question page needed.
 */
export function QuestionField({
  question,
  value,
  error,
  onChange,
}: QuestionFieldProps) {
  const errorId = error ? `${question.key}-error` : undefined;

  switch (question.type) {
    case "open":
      return (
        <div className="flex flex-col gap-2">
          <Label htmlFor={question.key}>{question.prompt}</Label>
          <Input
            id={question.key}
            value={value.openText ?? ""}
            onChange={(event) =>
              onChange({ ...value, openText: event.target.value })
            }
            aria-invalid={error ? true : undefined}
            aria-describedby={errorId}
          />
          {error ? (
            <p id={errorId} role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
        </div>
      );
    case "single_choice":
      return (
        <ChoiceGroup
          name={question.key}
          legend={question.prompt}
          options={(question.options ?? []).map((o) => ({ ...o }))}
          selected={value.singleSelected ? [value.singleSelected] : []}
          error={error}
          onToggle={(next) =>
            onChange({
              ...value,
              singleSelected:
                value.singleSelected === next ? undefined : next,
            })
          }
        />
      );
    case "multi_choice":
      return (
        <ChoiceGroup
          name={question.key}
          legend={question.prompt}
          options={(question.options ?? []).map((o) => ({ ...o }))}
          selected={value.multiSelected ?? []}
          multiple
          error={error}
          onToggle={(next) => {
            const current = value.multiSelected ?? [];
            onChange({
              ...value,
              multiSelected: current.includes(next)
                ? current.filter((v) => v !== next)
                : [...current, next],
            });
          }}
        />
      );
    case "boolean": {
      const selected =
        value.booleanValue === undefined ? [] : [String(value.booleanValue)];
      return (
        <ChoiceGroup
          name={question.key}
          legend={question.prompt}
          options={[
            { value: "true", label: "Yes" },
            { value: "false", label: "No" },
          ]}
          selected={selected}
          error={error}
          onToggle={(next) =>
            onChange({ ...value, booleanValue: next === "true" })
          }
        />
      );
    }
    case "scale": {
      const scaleOptions = (question.options ?? []).map((o) => ({ ...o }));
      const fallback = [1, 2, 3, 4, 5].map((n) => ({
        value: String(n),
        label: String(n),
      }));
      const selected =
        value.scaleValue === undefined ? [] : [String(value.scaleValue)];
      return (
        <div
          role="radiogroup"
          aria-label={question.prompt}
          className={cn("flex flex-col gap-3")}
        >
          <span className="text-base font-medium text-foreground">
            {question.prompt}
          </span>
          <div className="flex flex-wrap gap-2">
            {(scaleOptions.length > 0 ? scaleOptions : fallback).map((o) => {
              const checked = selected.includes(o.value);
              return (
                <label
                  key={o.value}
                  className={cn(
                    "inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-xl border px-4 py-2.5 text-sm transition-colors",
                    "focus-within:ring-2 focus-within:ring-lory-blue focus-within:ring-offset-2",
                    checked
                      ? "border-lory-blue bg-lory-blue/10"
                      : "border-border bg-card hover:bg-muted"
                  )}
                >
                  <input
                    type="radio"
                    name={question.key}
                    value={o.value}
                    checked={checked}
                    onChange={() =>
                      onChange({ ...value, scaleValue: Number(o.value) })
                    }
                    className="sr-only"
                  />
                  <span aria-hidden="true">{o.label}</span>
                </label>
              );
            })}
          </div>
          {error ? (
            <p id={errorId} role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
        </div>
      );
    }
    default:
      return null;
  }
}
