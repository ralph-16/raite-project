"use client";

import { FormField } from "@/components/auth/form-field";
import { INTEREST_OPTIONS } from "@/lib/onboarding/questions";
import type { OnboardingState } from "@/lib/onboarding/types";
import { ChoiceGroup } from "./choice-group";
import { StepNavigation } from "./step-navigation";

interface InterestsStepProps {
  state: OnboardingState;
  errors: Record<string, string>;
  onChange: (patch: Partial<OnboardingState>) => void;
  onBack: () => void;
  onContinue: () => void;
}

export function InterestsStep({
  state,
  errors,
  onChange,
  onBack,
  onContinue,
}: InterestsStepProps) {
  const toggle = (value: string) => {
    const current = state.interests;
    onChange({
      interests: current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value],
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <ChoiceGroup
        name="interests"
        legend="What are you naturally interested in?"
        hint="These are exploratory signals, not career assignments. They help Lory personalize later — nothing is decided here."
        options={[...INTEREST_OPTIONS]}
        selected={state.interests}
        multiple
        error={errors.interests}
        onToggle={toggle}
      />
      <FormField
        id="onboarding-interests-other"
        label="Other interest (optional)"
        placeholder="Anything else you enjoy?"
        autoComplete="off"
        value={state.interestsOther ?? ""}
        onChange={(event) => onChange({ interestsOther: event.target.value })}
      />
      <StepNavigation onBack={onBack} onContinue={onContinue} />
    </div>
  );
}
