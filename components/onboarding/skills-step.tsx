"use client";

import * as React from "react";

import { Label } from "@/components/ui/label";
import { FALLBACK_SKILLS, SKILL_FAMILIARITY_OPTIONS } from "@/lib/onboarding/questions";
import type {
  OnboardingState,
  SkillFamiliarity,
} from "@/lib/onboarding/types";
import { cn } from "@/lib/utils";
import { StepNavigation } from "./step-navigation";

interface ReferenceSkill {
  slug: string;
  name: string;
}

interface SkillsStepProps {
  state: OnboardingState;
  onChange: (patch: Partial<OnboardingState>) => void;
  onBack: () => void;
  onContinue: () => void;
  onSkip: () => void;
}

/**
 * Skills / knowledge step. Reads the reference skill list from Supabase
 * (`skills` table, world-readable) when available, with static fallback
 * examples otherwise. Nothing is hardcoded as a career — these are
 * exploratory familiarity signals for the future profiler.
 */
export function SkillsStep({
  state,
  onChange,
  onBack,
  onContinue,
  onSkip,
}: SkillsStepProps) {
  const [referenceSkills, setReferenceSkills] = React.useState<ReferenceSkill[]>([
    ...FALLBACK_SKILLS,
  ]);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const response = await fetch("/api/skills");
        if (!response.ok) return;
        const data: unknown = await response.json();
        if (cancelled) return;
        if (
          typeof data === "object" &&
          data !== null &&
          Array.isArray((data as { skills: unknown }).skills)
        ) {
          const skills = (data as { skills: ReferenceSkill[] }).skills;
          if (skills.length > 0) setReferenceSkills(skills);
        }
      } catch {
        if (!cancelled)
          setLoadError("Reference skills could not load. Showing examples instead.");
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const familiarityFor = (slug: string): SkillFamiliarity | undefined =>
    state.skills.find((s) => s.skillSlug === slug)?.familiarity;

  const setFamiliarity = (slug: string, name: string, level: SkillFamiliarity) => {
    const existing = state.skills.filter((s) => s.skillSlug !== slug);
    if (level === "not_tried") {
      onChange({ skills: existing });
      return;
    }
    onChange({
      skills: [...existing, { skillSlug: slug, skillName: name, familiarity: level }],
    });
  };

  return (
    <div className="flex flex-col gap-6">
      {loadError ? (
        <p role="status" className="text-xs text-muted-foreground">
          {loadError}
        </p>
      ) : null}
      <div className="flex flex-col gap-5">
        {referenceSkills.map((skill) => {
          const current = familiarityFor(skill.slug);
          return (
            <fieldset key={skill.slug} className="flex flex-col gap-2">
              <legend className="text-sm font-medium text-foreground">
                {skill.name}
              </legend>
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={`${skill.name} familiarity`}>
                {SKILL_FAMILIARITY_OPTIONS.map((option) => {
                  const checked = current === option.value;
                  return (
                    <label
                      key={option.value}
                      className={cn(
                        "inline-flex min-h-11 cursor-pointer items-center rounded-xl border px-3 py-2 text-xs transition-colors",
                        "focus-within:ring-2 focus-within:ring-lory-blue focus-within:ring-offset-2",
                        checked
                          ? option.value === "not_tried"
                            ? "border-border bg-muted text-muted-foreground"
                            : "border-lory-blue bg-lory-blue/10 text-foreground"
                          : "border-border bg-card text-foreground hover:bg-muted"
                      )}
                    >
                      <input
                        type="radio"
                        name={`skill-${skill.slug}`}
                        value={option.value}
                        checked={checked}
                        onChange={() =>
                          setFamiliarity(
                            skill.slug,
                            skill.name,
                            option.value as SkillFamiliarity
                          )
                        }
                        className="sr-only"
                      />
                      <span>{option.label}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          );
        })}
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Label htmlFor="skills-unlisted-note" className="sr-only">
          Unlisted skills note
        </Label>
        <p id="skills-unlisted-note">
          Only mark what applies — unmarked skills stay unassessed. The full
          reference list lives in the database; these are examples to start
          from.
        </p>
      </div>
      <StepNavigation
        onBack={onBack}
        onContinue={onContinue}
        onSkip={onSkip}
        skipLabel="Skip for now"
      />
    </div>
  );
}
