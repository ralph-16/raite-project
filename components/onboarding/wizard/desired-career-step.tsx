"use client";

/**
 * Step 3 — "career in mind". Optional free text; "I'm not sure yet" is a
 * first-class answer (stored as `null`, which scoring treats as no boost).
 * Sample career titles are offered as tappable ideas, never as suggestions
 * Lory is pushing for.
 */

import * as React from "react";
import { Textarea } from "@/components/ui/textarea";
import { LoryAvatar } from "@/components/onboarding/lory-avatar";
import { listCareers } from "@/lib/mock/careers";
import { Sparkles } from "lucide-react";

export interface DesiredCareerStepProps {
  /** Committed value (`null` = skipped or unsure). */
  value: string | null;
  /** Live textarea draft, kept by the wizard so a Back does not lose it. */
  enteredText: string;
  onChange: (value: string | null) => void;
}

export function DesiredCareerStep({ value, enteredText, onChange }: DesiredCareerStepProps) {
  const [unsure, setUnsure] = React.useState(value === null);
  const ideas = listCareers().slice(0, 6);

  return (
    <div className="grid items-start gap-10 md:grid-cols-[1.4fr_1fr]">
      <div className="max-w-2xl">
        <h1 className="font-sans font-bold tracking-tight text-3xl md:text-4xl">
          Is there a career in mind?
        </h1>
        <p className="mt-3 text-muted-foreground">
          A guess, a hunch, or a happy shrug — all good answers. This only nudges your starting
          order, and you can change it later.
        </p>

        <div className="mt-6 max-w-xl rounded-xl border border-border bg-muted p-4 text-xs text-muted-foreground">
          <span className="rounded-sm bg-lory-yellow/40 px-1.5 py-0.5 font-medium text-foreground">
            Why we ask
          </span>{" "}
          If you name a direction, careers close to it get a small sample boost. Leave it blank
          and nothing is penalised.
        </div>

        <div className="mt-6 max-w-xl">
          <Textarea
            value={enteredText}
            rows={4}
            placeholder="For example: something with design, or building apps…"
            aria-label="A career you have in mind"
            onChange={(event) => {
              setUnsure(false);
              onChange(event.target.value.trim() === "" ? null : event.target.value);
            }}
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

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <button
            type="button"
            aria-pressed={unsure}
            onClick={() => {
              setUnsure(true);
              onChange(null);
            }}
            className={
              unsure
                ? "rounded-full border-2 border-primary bg-lory-blue/10 px-4 py-2 text-sm font-medium"
                : "rounded-full border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:border-lory-blue hover:text-foreground"
            }
          >
            I&apos;m not sure yet
          </button>
        </div>

        <div className="mt-8">
          <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
            <Sparkles className="size-4 text-lory-blue" aria-hidden />
            Need ideas? Tap one to fill the box
            <span className="rounded-sm bg-lory-yellow/40 px-1.5 py-0.5 text-xs font-normal text-foreground">
              Sample data
            </span>
          </p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {ideas.map((career) => (
              <li key={career.slug}>
                <button
                  type="button"
                  onClick={() => {
                    setUnsure(false);
                    onChange(career.title);
                  }}
                  className="rounded-full border border-border bg-card px-3.5 py-1.5 text-xs text-muted-foreground transition-colors hover:border-lory-blue hover:text-foreground"
                >
                  {career.title}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <div className="inline-flex rounded-full bg-lory-pink/20 p-2">
          <LoryAvatar state={value ? "happy" : "idle"} size="md" />
        </div>
        <p className="mt-4 text-sm leading-relaxed">
          {value
            ? `Keeping "${value.trim()}" in view while I order your options.`
            : "No idea yet? Perfect — plenty of people start exactly there."}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          This never locks a career in. It only shapes what you see first.
        </p>
      </div>
    </div>
  );
}
