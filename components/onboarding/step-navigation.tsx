import { Button } from "@/components/ui/button";

interface StepNavigationProps {
  onBack?: () => void;
  onContinue?: () => void;
  continueLabel?: string;
  /** Shown when the step is optional. */
  onSkip?: () => void;
  skipLabel?: string;
  disableContinue?: boolean;
  isSaving?: boolean;
}

/** Consistent Back / Continue / Skip controls for every onboarding step. */
export function StepNavigation({
  onBack,
  onContinue,
  continueLabel = "Continue",
  onSkip,
  skipLabel = "Skip for now",
  disableContinue = false,
  isSaving = false,
}: StepNavigationProps) {
  return (
    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        {onBack ? (
          <Button
            type="button"
            variant="ghost"
            onClick={onBack}
            disabled={isSaving}
          >
            Back
          </Button>
        ) : null}
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {onSkip ? (
          <Button
            type="button"
            variant="outline"
            onClick={onSkip}
            disabled={isSaving}
          >
            {skipLabel}
          </Button>
        ) : null}
        {onContinue ? (
          <Button
            type="button"
            onClick={onContinue}
            disabled={disableContinue || isSaving}
            aria-busy={isSaving}
          >
            {isSaving ? "Saving..." : continueLabel}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
