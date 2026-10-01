"use client";

import { FormField } from "@/components/auth/form-field";
import {
  CAREER_IDEA_OPTIONS,
  LOST_EXPLORATION_OPTIONS,
} from "@/lib/onboarding/questions";
import type { OnboardingState } from "@/lib/onboarding/types";
import { ChoiceGroup } from "./choice-group";
import { StepNavigation } from "./step-navigation";

interface CareerDirectionStepProps {
  state: OnboardingState;
  onChange: (patch: Partial<OnboardingState>) => void;
  onBack: () => void;
  onContinue: () => void;
  onSkip: () => void;
}

/**
 * Career direction with two branches: "I have an idea" (optional free text)
 * and "I'm not sure yet" (the "I'm Lost" exploration path). Neither branch
 * assigns a career — the future AI uses these as exploration signals.
 */
export function CareerDirectionStep({
  state,
  onChange,
  onBack,
  onContinue,
  onSkip,
}: CareerDirectionStepProps) {
  const aspiration = state.careerAspiration;
  const setAspiration = (
    patch: Partial<typeof aspiration>
  ) => onChange({ careerAspiration: { ...aspiration, ...patch } });

  const toggleSignal = (value: string) => {
    const current = aspiration.explorationSignals ?? [];
    setAspiration({
      explorationSignals: current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value],
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <ChoiceGroup
        name="career-direction"
        legend="Do you already have a career or industry in mind?"
        options={[
          { value: "has_idea", label: "I have an idea" },
          { value: "unsure", label: "I'm not sure yet" },
        ]}
        selected={aspiration.direction ? [aspiration.direction] : []}
        onToggle={(value) =>
          setAspiration({
            direction: value as "has_idea" | "unsure",
          })
        }
      />

      {aspiration.direction === "has_idea" ? (
        <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4">
          <ChoiceGroup
            name="career-idea-preset"
            legend="Any of these close? (optional)"
            options={[...CAREER_IDEA_OPTIONS]}
            selected={
              aspiration.targetCareer &&
              CAREER_IDEA_OPTIONS.some((o) => o.value === aspiration.targetCareer)
                ? [aspiration.targetCareer]
                : []
            }
            onToggle={(value) => setAspiration({ targetCareer: value })}
          />
          <FormField
            id="onboarding-target-career"
            label="Target job or career (optional)"
            placeholder="e.g. Something else — type freely"
            autoComplete="off"
            value={aspiration.targetCareer ?? ""}
            onChange={(event) =>
              setAspiration({ targetCareer: event.target.value })
            }
          />
          <FormField
            id="onboarding-target-industry"
            label="Target industry (optional)"
            placeholder="e.g. Technology, Healthcare"
            autoComplete="off"
            value={aspiration.targetIndustry ?? ""}
            onChange={(event) =>
              setAspiration({ targetIndustry: event.target.value })
            }
          />
          <p className="text-xs text-muted-foreground">
            Free text is fine — Lory will interpret it later. You can also
            leave this blank.
          </p>
        </div>
      ) : null}

      {aspiration.direction === "unsure" ? (
        <div className="flex flex-col gap-4 rounded-xl border border-border bg-muted p-4">
          <p className="text-sm font-medium text-foreground">
            That&apos;s okay — there are no wrong answers here.
          </p>
          <ChoiceGroup
            name="lost-exploration"
            legend="What sounds more interesting?"
            hint="These are exploration dimensions, not career recommendations. Nothing is decided from this step."
            options={[...LOST_EXPLORATION_OPTIONS]}
            selected={aspiration.explorationSignals ?? []}
            multiple
            onToggle={toggleSignal}
          />
        </div>
      ) : null}

      <StepNavigation
        onBack={onBack}
        onContinue={onContinue}
        onSkip={onSkip}
        skipLabel="Skip for now"
      />
    </div>
  );
}
