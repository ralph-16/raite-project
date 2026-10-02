"use client";

/**
 * Step 12 — finish. Plays an honest ~2.5s "drawing your map" beat, then runs
 * the deterministic scorer in the browser (no AI, no network), writes
 * `kl.matches`, `kl.profile` and the completed `kl.onboarding`, and hands off
 * to /home. Reduced motion shortens the beat.
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import { LoryAvatar } from "@/components/onboarding/lory-avatar";
import { isAnswered, listQuestions } from "@/lib/mock/questions";
import { buildLorySummary, scoreCareers, toMatches, topCategory, topInterests } from "@/lib/mock/scoring";
import type { ScoringInput } from "@/lib/mock/scoring";
import { loadSession, saveMatches, saveOnboarding, saveProfile } from "@/lib/mock/storage";
import type { OnboardingState } from "@/lib/mock/types";

const FULL_MS = 2500;
const REDUCED_MS = 400;

export interface FinishStepProps {
  state: OnboardingState;
}

export function FinishStep({ state }: FinishStepProps) {
  const router = useRouter();
  const [progress, setProgress] = React.useState(0);
  const finishedRef = React.useRef(false);

  const handled = listQuestions().filter((question) =>
    isAnswered(question, state.answers)
  ).length;

  React.useEffect(() => {
    if (finishedRef.current) return;
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const total = reduced ? REDUCED_MS : FULL_MS;
    const start = performance.now();
    let frame = 0;

    const complete = () => {
      if (finishedRef.current) return;
      finishedRef.current = true;

      const input: ScoringInput = {
        answers: state.answers,
        resumeSkills: state.resume?.skills ?? [],
        desiredCareer: state.desiredCareer,
      };
      const now = new Date().toISOString();
      const session = loadSession();

      saveMatches(toMatches(scoreCareers(input)));
      saveProfile({
        displayName: session?.displayName ?? "Student",
        email: session?.email ?? "",
        desiredCareer: state.desiredCareer,
        resumeSkills: input.resumeSkills,
        interests: topInterests(input),
        topCategory: topCategory(input),
        lorySummary: buildLorySummary(input),
        onboardingCompleted: true,
        updatedAt: now,
      });
      saveOnboarding({ ...state, completed: true, updatedAt: now });
      router.push("/home");
    };

    const tick = (now: number) => {
      const ratio = Math.min(1, (now - start) / total);
      setProgress(Math.round(ratio * 100));
      if (ratio < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        complete();
      }
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [router, state]);

  return (
    <div className="mx-auto max-w-md text-center">
      <div className="flex justify-center">
        <div className="animate-pop-in inline-flex rounded-full bg-lory-pink/20 p-2">
          <LoryAvatar state="thinking" size="lg" />
        </div>
      </div>
      <h1 className="mt-6 font-display font-normal text-3xl md:text-4xl">Drawing your map…</h1>
      <p className="mt-3 text-muted-foreground">
        Lining up {handled} of {listQuestions().length} questions with sample career data and
        sketching your learning lanes.
      </p>

      <div className="mt-8" aria-live="polite">
        <div
          className="h-3 overflow-hidden rounded-full border border-border bg-muted"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Building your map"
        >
          <div
            className="h-full origin-left rounded-full bg-gradient-to-r from-lory-blue to-lory-pink transition-transform duration-200 ease-out"
            style={{ transform: `scaleX(${progress / 100})` }}
          />
        </div>
        <p className="mt-2 font-mono text-xs text-muted-foreground">{progress}%</p>
      </div>

      <p className="mt-6 text-xs text-muted-foreground">
        <span className="rounded-sm bg-lory-yellow/40 px-1.5 py-0.5 font-medium text-foreground">
          Demo data
        </span>{" "}
        Everything here is computed in your browser — no AI call is made and nothing is uploaded.
      </p>
    </div>
  );
}
