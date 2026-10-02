"use client";

/**
 * Step 2 — resume (optional). Real file checks (type + 5 MB size); no upload
 * and no parsing service — the "parsed" context is sample data and is
 * labelled as such. "Skip for now" clears the file and advances, at the same
 * prominence as uploading.
 */

import * as React from "react";
import { Button } from "@/components/ui/button";
import { LoryAvatar } from "@/components/onboarding/lory-avatar";
import { ChipEditor } from "./chip-editor";
import { FileText, Loader2, Upload, X, XCircle } from "lucide-react";
import type { ParsedResume } from "@/lib/mock/types";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = [".pdf", ".docx"];
const PARSE_MS = 1500;

/** Sample parse output — labelled in the UI, never presented as real. */
const SAMPLE_CONTEXT = {
  summary:
    "Sample: student helper who keeps classmates' group chats organised and built a small class schedule page.",
  skills: ["HTML", "CSS", "JavaScript", "Figma", "Customer support"],
  experience: ["Sample: class officer — ran events for a 12-person team"],
  education: ["Sample: Senior High School, STEM strand"],
} as const;

type Phase = "idle" | "parsing" | "parsed" | "error";

export interface ResumeStepProps {
  resume: ParsedResume | null;
  onResume: (resume: ParsedResume | null) => void;
  /** Clears the file and moves to the next step. */
  onSkip: () => void;
}

export function ResumeStep({ resume, onResume, onSkip }: ResumeStepProps) {
  const [phase, setPhase] = React.useState<Phase>(resume ? "parsed" : "idle");
  const [error, setError] = React.useState<string | null>(null);
  const [skills, setSkills] = React.useState<string[]>(resume?.skills ?? []);
  const parseTimer = React.useRef<number | null>(null);

  const clearTimer = () => {
    if (parseTimer.current !== null) {
      window.clearTimeout(parseTimer.current);
      parseTimer.current = null;
    }
  };

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
    if (!ALLOWED.includes(ext)) {
      setError("Use a PDF or DOCX file.");
      setPhase("error");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("That file is over 5 MB. Try a smaller one.");
      setPhase("error");
      return;
    }
    setError(null);
    setPhase("parsing");
    clearTimer();
    parseTimer.current = window.setTimeout(() => {
      const parsed: ParsedResume = {
        fileName: file.name,
        ...SAMPLE_CONTEXT,
        skills: [...SAMPLE_CONTEXT.skills],
        experience: [...SAMPLE_CONTEXT.experience],
        education: [...SAMPLE_CONTEXT.education],
      };
      setSkills(parsed.skills);
      setPhase("parsed");
      onResume(parsed);
    }, PARSE_MS);
  };

  const handleRemove = () => {
    clearTimer();
    setPhase("idle");
    setSkills([]);
    setError(null);
    onResume(null);
  };

  React.useEffect(
    () => () => {
      if (parseTimer.current !== null) window.clearTimeout(parseTimer.current);
    },
    []
  );

  const commitSkills = (next: string[]) => {
    setSkills(next);
    if (phase === "parsed" && resume) onResume({ ...resume, skills: next });
  };

  return (
    <div className="grid items-start gap-10 md:grid-cols-[1.2fr_1fr]">
      <div className="max-w-md">
        <h1 className="font-sans font-bold tracking-tight text-3xl md:text-4xl">
          Bring a resume (optional)
        </h1>
        <p className="mt-3 text-muted-foreground">
          We only use it to pre-fill a starting profile, so you answer fewer questions. Skip it
          and the map works exactly the same.
        </p>

        <div className="mt-6 rounded-xl border border-border bg-muted p-4 text-xs text-muted-foreground">
          <span className="rounded-sm bg-lory-yellow/40 px-1.5 py-0.5 font-medium text-foreground">
            Why we ask
          </span>{" "}
          This pre-fills your starting profile. In demo mode the file never leaves your browser —
          nothing is uploaded and nothing is parsed by a server.
        </div>

        {phase === "parsed" && resume ? (
          <div className="mt-6 grid gap-4 rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="flex min-w-0 items-center gap-2 text-sm font-medium">
                <FileText className="size-4 shrink-0 text-lory-blue" aria-hidden />
                <span className="truncate">{resume.fileName}</span>
              </p>
              <Button type="button" variant="ghost" size="sm" onClick={handleRemove}>
                <X className="size-4" aria-hidden />
                Remove
              </Button>
            </div>

            <p className="text-xs leading-relaxed text-muted-foreground">
              <span className="rounded-sm bg-lory-yellow/40 px-1.5 py-0.5 font-medium text-foreground">
                Sample data
              </span>{" "}
              {resume.summary}
            </p>

            <div>
              <p className="text-xs font-medium text-muted-foreground">Skills Lory spotted</p>
              <div className="mt-2">
                <ChipEditor chips={skills} onChange={commitSkills} />
              </div>
            </div>

            <dl className="grid gap-3 text-xs text-muted-foreground">
              <div>
                <dt className="font-medium text-foreground">Experience</dt>
                <dd className="mt-1">{resume.experience.join(" · ")}</dd>
              </div>
              <div>
                <dt className="font-medium text-foreground">Education</dt>
                <dd className="mt-1">{resume.education.join(" · ")}</dd>
              </div>
            </dl>
          </div>
        ) : (
          <div className="mt-6 grid gap-4">
            <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-card p-8 text-center transition-colors hover:border-lory-blue focus-within:ring-2 focus-within:ring-lory-blue focus-within:ring-offset-2">
              {phase === "parsing" ? (
                <>
                  <Loader2 className="size-6 animate-spin text-lory-blue" aria-hidden />
                  <span className="text-sm text-muted-foreground">Reading your file…</span>
                </>
              ) : (
                <>
                  <Upload className="size-6 text-muted-foreground" aria-hidden />
                  <span className="text-sm font-medium">Choose a PDF or DOCX</span>
                  <span className="text-xs text-muted-foreground">Up to 5 MB</span>
                </>
              )}
              <input
                type="file"
                accept=".pdf,.docx"
                className="sr-only"
                disabled={phase === "parsing"}
                onChange={(event) => handleFile(event.target.files?.[0])}
              />
            </label>

            {error ? (
              <p role="alert" className="flex items-center gap-2 text-sm text-lory-burgundy">
                <XCircle className="size-4 shrink-0" aria-hidden />
                {error}
              </p>
            ) : null}

            <Button type="button" variant="outline" size="lg" onClick={onSkip}>
              Skip for now
            </Button>
            <p className="text-xs text-muted-foreground">
              Skipping keeps every later step available. You can add a resume any time.
            </p>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <div className="inline-flex rounded-full bg-lory-pink/20 p-2">
          <LoryAvatar state={phase === "parsing" ? "thinking" : "happy"} size="md" />
        </div>
        <p className="mt-4 text-sm leading-relaxed">
          {phase === "parsing"
            ? "Reading it now — hang tight!"
            : "I can start from a file, or from your answers. Your call."}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Skipping is completely fine. Nothing is locked in.
        </p>
      </div>
    </div>
  );
}
