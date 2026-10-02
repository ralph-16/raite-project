"use client";

import * as React from "react";
import { FileUp, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  ACCEPTED_RESUME_EXTENSIONS,
  ACCEPTED_RESUME_TYPES,
  MAX_RESUME_BYTES,
} from "@/lib/onboarding/questions";
import type { OnboardingState } from "@/lib/onboarding/types";
import { StepNavigation } from "./step-navigation";

interface ResumeStepProps {
  state: OnboardingState;
  onChange: (patch: Partial<OnboardingState>) => void;
  onBack: () => void;
  onContinue: () => void;
  onSkip: () => void;
}

/**
 * Optional resume UI. Client-side selection + validation only.
 * No upload, no parsing, no AI analysis happens here — the structure is
 * compatible with the `resumes` table for a later task.
 */
export function ResumeStep({
  state,
  onChange,
  onBack,
  onContinue,
  onSkip,
}: ResumeStepProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const resume = state.resume;

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    const validType = ACCEPTED_RESUME_TYPES.includes(file.type);
    const validExt = /\.(pdf|docx)$/i.test(file.name);
    if (!validType && !validExt) {
      onChange({
        resume: {
          status: "invalid",
          fileName: file.name,
          error: "Only PDF or DOCX files are supported.",
        },
      });
      return;
    }
    if (file.size > MAX_RESUME_BYTES) {
      onChange({
        resume: {
          status: "invalid",
          fileName: file.name,
          error: "File is too large. Keep it under 10 MB.",
        },
      });
      return;
    }
    // Selected on this device only — not uploaded, not parsed.
    onChange({
      resume: {
        status: "selected",
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type || "unknown",
        error: undefined,
      },
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="font-sans font-semibold tracking-tight text-lg">
          Want Lory to learn a little more about your background?
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Your resume is optional. It only provides additional context for
          your personalized experience.
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          What you told Lory is the primary source. A resume is only extra
          context.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <input
          ref={inputRef}
          id="onboarding-resume-file"
          type="file"
          accept={ACCEPTED_RESUME_EXTENSIONS}
          className="sr-only"
          aria-label="Upload resume (PDF or DOCX)"
          onChange={(event) => handleFile(event.target.files?.[0])}
        />
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            onClick={() => inputRef.current?.click()}
          >
            <FileUp data-icon="inline-start" aria-hidden="true" />
            {resume.status === "selected" ? "Choose a different file" : "Upload Resume"}
          </Button>
          {resume.status === "selected" ? (
            <Button
              type="button"
              variant="ghost"
              onClick={() => onChange({ resume: { status: "none" } })}
            >
              Remove file
            </Button>
          ) : null}
        </div>

        <div aria-live="polite" className="flex flex-col gap-2 text-sm">
          {resume.status === "none" ? (
            <p className="text-muted-foreground">
              No resume selected. Supported files: PDF, DOCX.
            </p>
          ) : null}
          {resume.status === "selected" ? (
            <p className="rounded-md border border-border bg-muted p-3 text-foreground">
              Selected: {resume.fileName}. Kept on this device for now — it
              has not been uploaded or parsed. Upload connects to secure
              storage in a later step.
            </p>
          ) : null}
          {resume.status === "invalid" ? (
            <p
              role="alert"
              className="flex items-start gap-2 rounded-md border border-destructive/40 p-3 text-destructive"
            >
              <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              <span>
                {resume.fileName ? `${resume.fileName}: ` : ""}
                {resume.error ?? "That file could not be used."}
              </span>
            </p>
          ) : null}
          {resume.status === "skipped" ? (
            <p className="text-muted-foreground">
              Skipped — you can add a resume later.
            </p>
          ) : null}
        </div>
      </div>

      <StepNavigation
        onBack={onBack}
        onContinue={onContinue}
        continueLabel={
          resume.status === "selected" ? "Continue with resume" : "Continue"
        }
        onSkip={onSkip}
        skipLabel="Skip for Now"
      />
    </div>
  );
}
