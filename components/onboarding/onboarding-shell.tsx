interface OnboardingShellProps {
  /** 1-based position within the 8 user-facing steps. Null for intro/done. */
  stepNumber: number | null;
  totalSteps?: number;
  title: string;
  /** Lory companion line shown above the step content. */
  loryMessage?: string;
  children: React.ReactNode;
}

/**
 * Guided-journey frame: progress, heading, and one topic at a time.
 * Keeps the conversational feel while questions stay structured.
 */
export function OnboardingShell({
  stepNumber,
  totalSteps = 8,
  title,
  loryMessage,
  children,
}: OnboardingShellProps) {
  const progressPercent =
    stepNumber === null
      ? 0
      : Math.round((stepNumber / totalSteps) * 100);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-10">
      {stepNumber !== null ? (
        <div className="flex flex-col gap-2">
          <p
            className="text-sm text-muted-foreground"
            role="status"
            aria-label={`Step ${stepNumber} of ${totalSteps}`}
          >
            Step {stepNumber} of {totalSteps}
          </p>
          <div
            role="progressbar"
            aria-valuenow={stepNumber}
            aria-valuemin={1}
            aria-valuemax={totalSteps}
            aria-label="Onboarding progress"
            className="h-2 w-full overflow-hidden rounded-full bg-muted"
          >
            <div
              className="h-full rounded-full bg-primary transition-transform"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      ) : null}

      <h1 className="font-display text-3xl font-normal md:text-4xl">{title}</h1>

      {loryMessage ? (
        <div
          aria-live="polite"
          className="rounded-xl border border-border bg-muted p-4 text-sm leading-relaxed text-foreground"
        >
          <span className="font-medium">Lory: </span>
          {loryMessage}
        </div>
      ) : null}

      <div className="flex flex-col gap-6">{children}</div>
    </div>
  );
}
