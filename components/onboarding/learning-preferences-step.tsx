"use client";

import { LEARNING_PREFERENCE_OPTIONS } from "@/lib/onboarding/questions";
import type { OnboardingState } from "@/lib/onboarding/types";
import { ChoiceGroup } from "./choice-group";
import { StepNavigation } from "./step-navigation";

interface LearningPreferencesStepProps {
  state: OnboardingState;
  onChange: (patch: Partial<OnboardingState>) => void;
  onBack: () => void;
  onContinue: () => void;
  onSkip: () => void;
}

export function LearningPreferencesStep({
  state,
  onChange,
  onBack,
  onContinue,
  onSkip,
}: LearningPreferencesStepProps) {
  const toggle = (value: string) => {
    const current = state.learningPreferences;
    onChange({
      learningPreferences: current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value],
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <ChoiceGroup
        name="learning-preferences"
        legend="How do you prefer to learn?"
        hint="Select all that apply. These feed your profile's learning preferences."
        options={[...LEARNING_PREFERENCE_OPTIONS]}
        selected={state.learningPreferences}
        multiple
        onToggle={toggle}
      />
      <StepNavigation
        onBack={onBack}
        onContinue={onContinue}
        onSkip={onSkip}
        skipLabel="Skip for now"
      />
    </div>
  );
}
