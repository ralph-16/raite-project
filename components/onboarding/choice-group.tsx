import * as React from "react";

import { cn } from "@/lib/utils";

export interface ChoiceOption {
  value: string;
  label: string;
  description?: string;
}

interface ChoiceGroupProps {
  name: string;
  legend: string;
  hint?: string;
  options: readonly ChoiceOption[];
  /** Selected values. Length > 1 only when `multiple` is true. */
  selected: string[];
  multiple?: boolean;
  error?: string;
  onToggle: (value: string) => void;
}

/**
 * Accessible single/multi-choice group. Renders real radio/checkbox inputs so
 * keyboard navigation and screen readers work without extra wiring.
 */
export function ChoiceGroup({
  name,
  legend,
  hint,
  options,
  selected,
  multiple = false,
  error,
  onToggle,
}: ChoiceGroupProps) {
  const type = multiple ? "checkbox" : "radio";
  const errorId = error ? `${name}-error` : undefined;
  const hintId = hint ? `${name}-hint` : undefined;

  return (
    <fieldset
      aria-describedby={cn(hintId, errorId) || undefined}
      aria-invalid={error ? true : undefined}
      className="flex flex-col gap-3"
    >
      <legend className="text-base font-medium text-foreground">{legend}</legend>
      {hint ? (
        <p id={hintId} className="text-sm text-muted-foreground">
          {hint}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const checked = selected.includes(option.value);
          return (
            <label
              key={option.value}
              className={cn(
                "inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border px-4 py-2.5 text-sm transition-colors",
                "focus-within:ring-2 focus-within:ring-lory-blue focus-within:ring-offset-2",
                checked
                  ? "border-lory-blue bg-lory-blue/10 text-foreground"
                  : "border-border bg-card text-foreground hover:bg-muted"
              )}
              title={option.description}
            >
              <input
                type={type}
                name={name}
                value={option.value}
                checked={checked}
                onChange={() => onToggle(option.value)}
                className="size-4 shrink-0 accent-primary"
              />
              <span>{option.label}</span>
            </label>
          );
        })}
      </div>
      {error ? (
        <p id={errorId} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
