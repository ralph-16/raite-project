"use client";

import { EXPERIENCE_OPTIONS } from "@/lib/onboarding/questions";
import type { OnboardingState } from "@/lib/onboarding/types";
import { ChoiceGroup } from "./choice-group";
import { StepNavigation } from "./step-navigation";

interface ExperienceStepProps {
  state: OnboardingState;
  onChange: (patch: Partial<OnboardingState>) => void;
  onBack: () => void;
  onContinue: () => void;
  onSkip: () => void;
}

export function ExperienceStep({
  state,
  onChange,
  onBack,
  onContinue,
  onSkip,
}: ExperienceStepProps) {
  const toggle = (value: string) => {
    const current = state.experience.kinds;
    let next: string[];
    if (value === "none-yet") {
      next = current.includes("none-yet") ? [] : ["none-yet"];
    } else {
      const withoutNone = current.filter((v) => v !== "none-yet");
      next = withoutNone.includes(value)
        ? withoutNone.filter((v) => v !== value)
        : [...withoutNone, value];
    }
    onChange({ experience: { ...state.experience, kinds: next } });
  };

  return (
    <div className="flex flex-col gap-6">
      <ChoiceGroup
        name="experience"
        legend="What have you actually done so far?"
        hint="We care about what you've demonstrated, not just courses you've finished. 'None yet' is a perfectly good answer."
        options={[...EXPERIENCE_OPTIONS]}
        selected={state.experience.kinds}
        multiple
        onToggle={toggle}
      />
      <div className="flex flex-col gap-2">
        <label
          htmlFor="onboarding-experience-details"
          className="text-sm font-medium"
        >
          Anything you want to add? (optional)
        </label>
        <textarea
          id="onboarding-experience-details"
          value={state.experience.details ?? ""}
          onChange={(event) =>
            onChange({
              experience: { ...state.experience, details: event.target.value },
            })
          }
          rows={3}
          placeholder="e.g. Built a class website with two classmates."
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />
      </div>
      {/* Keep the shared labelled-input pattern available for future fields. */}
      <StepNavigation
        onBack={onBack}
        onContinue={onContinue}
        onSkip={onSkip}
        skipLabel="Skip for now"
      />
    </div>
  );
}
