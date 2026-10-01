"use client";

import * as React from "react";
import { FileUp, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ParsedResume } from "@/lib/resume/parse";
import { LoryAvatar } from "./lory-avatar";
import { StepNavigation } from "./step-navigation";

interface ResumeUploadStageProps {
  fileName?: string;
  status: "none" | "parsing" | "parsed" | "invalid" | "failed" | "skipped";
  error?: string;
  parsed?: ParsedResume;
  correctedSkills: string;
  onFile: (file: File) => void;
  onSkillsEdit: (value: string) => void;
  onBack: () => void;
  onContinue: () => void;
  onSkip: () => void;
}

/**
 * Optional resume upload. Explains why the resume is asked for, validates
 * client-side first (server re-validates), and shows extracted skills for
 * correction before continuing. Skip is equally prominent.
 */
export function ResumeUploadStage({
  fileName,
  status,
  error,
  parsed,
  correctedSkills,
  onFile,
  onSkillsEdit,
  onBack,
  onContinue,
  onSkip,
}: ResumeUploadStageProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start gap-3">
        <LoryAvatar
          size="sm"
          state={
            status === "parsing"
              ? "thinking"
              : status === "invalid" || status === "failed"
                ? "confused"
                : "idle"
          }
        />
        <p className="text-sm leading-relaxed text-muted-foreground">
          If you have a resume handy, I can pull out the skills and experience
          already on it — so I don&apos;t ask you about them again. No resume?
          Totally fine, we&apos;ll just chat instead.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <input
          ref={inputRef}
          id="guided-resume-file"
          type="file"
          accept=".pdf,.docx"
          className="sr-only"
          aria-label="Upload resume (PDF or DOCX, up to 5 MB)"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onFile(file);
            event.target.value = "";
          }}
        />
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            disabled={status === "parsing"}
            onClick={() => inputRef.current?.click()}
          >
            <FileUp data-icon="inline-start" aria-hidden="true" />
            {status === "parsing" ? "Reading resume..." : "Upload resume"}
          </Button>
        </div>

        <div aria-live="polite" className="flex flex-col gap-2 text-sm">
          {status === "none" ? (
            <p className="text-muted-foreground">
              PDF or DOCX, up to 5 MB. Nothing is stored yet — I only read it
              to fill in your profile.
            </p>
          ) : null}
          {status === "parsing" ? (
            <div className="flex flex-col gap-2" role="status">
              <div className="shimmer h-4 w-48 rounded bg-muted" aria-hidden="true" />
              <p className="text-muted-foreground">
                Reading {fileName} — hold on a moment.
              </p>
            </div>
          ) : null}
          {status === "parsed" && parsed ? (
            <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
              <p className="text-sm text-foreground">
                Here&apos;s what I found in {fileName}. Fix anything I got
                wrong — this is what I&apos;ll remember.
              </p>
              {parsed.summary ? (
                <p className="text-sm text-muted-foreground">{parsed.summary}</p>
              ) : null}
              <div className="flex flex-col gap-2">
                <Label htmlFor="guided-resume-skills">
                  Skills (comma-separated, editable)
                </Label>
                <Input
                  id="guided-resume-skills"
                  value={correctedSkills}
                  onChange={(event) => onSkillsEdit(event.target.value)}
                />
              </div>
              {parsed.experience.length > 0 ? (
                <p className="text-sm text-muted-foreground">
                  Experience: {parsed.experience.join("; ")}
                </p>
              ) : null}
              {parsed.education.length > 0 ? (
                <p className="text-sm text-muted-foreground">
                  Education: {parsed.education.join("; ")}
                </p>
              ) : null}
              <p className="text-xs text-muted-foreground">
                Lory suggests · AI-generated from your resume. Check it before
                continuing.
              </p>
            </div>
          ) : null}
          {(status === "invalid" || status === "failed") && (
            <p
              role="alert"
              className="flex items-start gap-2 rounded-md border border-destructive/40 p-3 text-destructive"
            >
              <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              <span>{error ?? "That file could not be used."}</span>
            </p>
          )}
          {status === "skipped" ? (
            <p className="text-muted-foreground">
              Skipped — chatting works just as well.
            </p>
          ) : null}
        </div>
      </div>

      <StepNavigation
        onBack={onBack}
        onContinue={onContinue}
        continueLabel={status === "parsed" ? "Continue with resume" : "Continue"}
        onSkip={onSkip}
        skipLabel="Skip for now"
      />
    </div>
  );
}
