import Link from "next/link";

import { Button } from "@/components/ui/button";
import { StudentProfile } from "@/components/student-profile";
import type { ExplorerProfile } from "@/lib/profiler/schema";
import { LoryAvatar } from "./lory-avatar";

export interface OnboardingCompletionProps {
  profile?: ExplorerProfile | null;
  program?: string;
  yearLevelLabel?: string;
  interests?: string[];
  modelLabel?: string | null;
  persistDetail?: string | null;
}

/**
 * Completion state. Shows the AI-generated Explorer Profile when profiling
 * succeeded, then routes to /home. Career matching and roadmaps remain
 * future steps and are not faked here.
 */
export function OnboardingCompletion({
  profile,
  program,
  yearLevelLabel,
  interests,
  modelLabel,
  persistDetail,
}: OnboardingCompletionProps) {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-6 px-6 py-16 text-center md:py-20">
      <LoryAvatar size="lg" state={profile ? "happy" : "idle"} />
      <h1 className="font-sans font-bold tracking-tight text-3xl font-normal md:text-4xl">
        You did it!
      </h1>
      <div
        aria-live="polite"
        className="max-w-md rounded-xl border border-border bg-muted p-4 text-sm leading-relaxed text-foreground"
      >
        <span className="font-medium">Lory: </span>
        Nice! That tells me a little more about you. Here&apos;s what I put
        together from your answers.
      </div>

      {profile ? (
        <div className="w-full text-left">
          <StudentProfile
            profile={profile}
            program={program}
            yearLevelLabel={yearLevelLabel}
            interests={interests}
            modelLabel={modelLabel}
          />
        </div>
      ) : null}

      {persistDetail ? (
        <p role="status" className="max-w-md text-xs text-muted-foreground">
          {persistDetail}
        </p>
      ) : null}

      <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
        Career matching and roadmaps come next — nothing below is a career
        decision.
      </p>
      <Button asChild size="lg">
        <Link href="/home">Go to home</Link>
      </Button>
    </div>
  );
}
