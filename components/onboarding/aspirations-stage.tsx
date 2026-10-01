"use client";

import { FormField } from "@/components/auth/form-field";
import { LoryAvatar } from "./lory-avatar";
import { StepNavigation } from "./step-navigation";
import { ChoiceGroup } from "./choice-group";

interface AspirationsStageProps {
  text: string;
  unsure: boolean;
  onText: (value: string) => void;
  onUnsure: (value: boolean) => void;
  onBack: () => void;
  onContinue: () => void;
  onSkip: () => void;
}

/**
 * Optional career aspirations. Free text, an explicit "I'm not sure yet",
 * or skip — all three are first-class. Lory never treats an answer as a
 * decision.
 */
export function AspirationsStage({
  text,
  unsure,
  onText,
  onUnsure,
  onBack,
  onContinue,
  onSkip,
}: AspirationsStageProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start gap-3">
        <LoryAvatar size="sm" state="idle" />
        <p className="text-sm leading-relaxed text-muted-foreground">
          Do you already have a career or industry in mind? If yes, I&apos;ll
          keep it in mind as context. If not, that&apos;s a great place to
          start — most students aren&apos;t sure yet.
        </p>
      </div>

      <ChoiceGroup
        name="aspirations-direction"
        legend="Where are you at right now?"
        options={[
          { value: "idea", label: "I have an idea" },
          { value: "unsure", label: "I'm not sure yet" },
        ]}
        selected={[unsure ? "unsure" : "idea"]}
        onToggle={(value) => onUnsure(value === "unsure")}
      />

      {!unsure ? (
        <FormField
          id="guided-aspirations-text"
          label="What job, career, or industry do you have in mind? (optional)"
          placeholder="e.g. Something with data, or nursing"
          autoComplete="off"
          value={text}
          onChange={(event) => onText(event.target.value)}
          description="Free text is fine. This stays context — never a verdict."
        />
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
