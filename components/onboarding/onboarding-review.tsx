"use client";

import { Button } from "@/components/ui/button";
import { YEAR_LEVEL_OPTIONS } from "@/lib/onboarding/questions";
import type { OnboardingState } from "@/lib/onboarding/types";
import { cn } from "@/lib/utils";
import { StepNavigation } from "./step-navigation";

interface OnboardingReviewProps {
  state: OnboardingState;
  onEdit: (step: number) => void;
  onBack: () => void;
  onFinish: () => void;
  isSaving: boolean;
  saveError: string | null;
}

function yearLevelLabel(value: string | undefined): string {
  return (
    YEAR_LEVEL_OPTIONS.find((o) => o.value === value)?.label ?? "Not provided"
  );
}

interface RowProps {
  title: string;
  status: "Provided" | "Skipped" | "Not provided";
  summary: string;
  stepIndex: number;
  onEdit: (step: number) => void;
}

function ReviewRow({ title, status, summary, stepIndex, onEdit }: RowProps) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-medium text-foreground">{title}</h2>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-xs",
              status === "Provided" && "bg-lory-blue/10 text-lory-blue",
              status === "Skipped" && "bg-muted text-muted-foreground",
              status === "Not provided" && "bg-muted text-muted-foreground"
            )}
          >
            {status}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">{summary}</p>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onEdit(stepIndex)}
      >
        Edit
      </Button>
    </div>
  );
}

/**
 * Review step. Shows only what the student actually provided — never invents
 * missing information. Each row links back to its step for editing.
 */
export function OnboardingReview({
  state,
  onEdit,
  onBack,
  onFinish,
  isSaving,
  saveError,
}: OnboardingReviewProps) {
  const interestSummary =
    state.interests.length > 0
      ? [...state.interests, state.interestsOther?.trim()]
          .filter(Boolean)
          .join(", ")
      : "Not provided";

  const skillSummary =
    state.skills.length > 0
      ? state.skills.map((s) => `${s.skillName} (${s.familiarity})`).join(", ")
      : "Not provided";

  const experienceSummary =
    state.experience.kinds.length > 0
      ? [
          ...state.experience.kinds,
          state.experience.details?.trim()
            ? `Note: ${state.experience.details.trim()}`
            : "",
        ]
          .filter(Boolean)
          .join(", ")
      : "Not provided";

  const aspiration = state.careerAspiration;
  const careerSummary =
    aspiration.direction === "has_idea"
      ? [aspiration.targetCareer?.trim(), aspiration.targetIndustry?.trim()]
          .filter(Boolean)
          .join(" — ") || "Has an idea (details not provided)"
      : aspiration.direction === "unsure"
        ? (aspiration.explorationSignals ?? []).length > 0
          ? `Exploring: ${(aspiration.explorationSignals ?? []).join(", ")} (no career assigned)`
          : "Not sure yet (no signals selected)"
        : "Not provided";

  const learningSummary =
    state.learningPreferences.length > 0
      ? state.learningPreferences.join(", ")
      : "Not provided";

  const resumeSummary =
    state.resume.status === "selected"
      ? `${state.resume.fileName} (selected on this device, not uploaded or parsed)`
      : state.resume.status === "skipped"
        ? "Skipped"
        : state.resume.status === "invalid"
          ? "Invalid file — none kept"
          : "Not provided";

  return (
    <div className="flex flex-col gap-4">
      <ReviewRow
        title="Student Information"
        status={state.yearLevel && state.program?.trim() ? "Provided" : "Not provided"}
        summary={`${yearLevelLabel(state.yearLevel)} · ${state.program?.trim() || "No program entered"}`}
        stepIndex={1}
        onEdit={onEdit}
      />
      <ReviewRow
        title="Interests"
        status={state.interests.length > 0 ? "Provided" : "Not provided"}
        summary={interestSummary}
        stepIndex={2}
        onEdit={onEdit}
      />
      <ReviewRow
        title="Skills"
        status={state.skills.length > 0 ? "Provided" : "Skipped"}
        summary={skillSummary}
        stepIndex={3}
        onEdit={onEdit}
      />
      <ReviewRow
        title="Experience"
        status={state.experience.kinds.length > 0 ? "Provided" : "Skipped"}
        summary={experienceSummary}
        stepIndex={4}
        onEdit={onEdit}
      />
      <ReviewRow
        title="Career Direction"
        status={aspiration.direction ? "Provided" : "Skipped"}
        summary={careerSummary}
        stepIndex={5}
        onEdit={onEdit}
      />
      <ReviewRow
        title="Learning Preferences"
        status={state.learningPreferences.length > 0 ? "Provided" : "Skipped"}
        summary={learningSummary}
        stepIndex={6}
        onEdit={onEdit}
      />
      <ReviewRow
        title="Resume"
        status={
          state.resume.status === "selected"
            ? "Provided"
            : state.resume.status === "skipped"
              ? "Skipped"
              : "Not provided"
        }
        summary={resumeSummary}
        stepIndex={7}
        onEdit={onEdit}
      />

      {saveError ? (
        <p role="alert" className="text-sm text-destructive">
          {saveError}
        </p>
      ) : null}

      <StepNavigation
        onBack={onBack}
        onContinue={onFinish}
        continueLabel={isSaving ? "Creating your profile..." : "Finish My Profile"}
      />
    </div>
  );
}
