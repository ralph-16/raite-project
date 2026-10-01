"use client";

import { FormField } from "@/components/auth/form-field";
import { YEAR_LEVEL_OPTIONS } from "@/lib/onboarding/questions";
import type { OnboardingState, YearLevel } from "@/lib/onboarding/types";
import { ChoiceGroup } from "./choice-group";
import { StepNavigation } from "./step-navigation";

interface StudentInformationStepProps {
  state: OnboardingState;
  errors: Record<string, string>;
  onChange: (patch: Partial<OnboardingState>) => void;
  onBack: () => void;
  onContinue: () => void;
}

export function StudentInformationStep({
  state,
  errors,
  onChange,
  onBack,
  onContinue,
}: StudentInformationStepProps) {
  return (
    <div className="flex flex-col gap-6">
      <ChoiceGroup
        name="year-level"
        legend="What year level are you in?"
        options={[...YEAR_LEVEL_OPTIONS]}
        selected={state.yearLevel ? [state.yearLevel] : []}
        error={errors.yearLevel}
        onToggle={(value) =>
          onChange({ yearLevel: value as YearLevel })
        }
      />
      <FormField
        id="onboarding-program"
        label="Program / Course"
        placeholder="e.g. BS Computer Science"
        required
        autoComplete="off"
        value={state.program ?? ""}
        error={errors.program}
        onChange={(event) => onChange({ program: event.target.value })}
      />
      <p className="text-xs text-muted-foreground">
        We ask this so Lory can personalize your exploration. Nothing else is
        needed here.
      </p>
      <StepNavigation onBack={onBack} onContinue={onContinue} />
    </div>
  );
}
