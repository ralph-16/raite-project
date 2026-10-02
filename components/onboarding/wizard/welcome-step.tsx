"use client";

/**
 * Step 1 — welcome. Opens the loop (Discover → Diagnose → …) and states the
 * demo rules up front: mock data, browser-only, nothing decides for you.
 */

import { Button } from "@/components/ui/button";
import { LoryAvatar } from "@/components/onboarding/lory-avatar";
import { CheckCircle2, Circle, XCircle } from "lucide-react";

const LOOP = ["Discover", "Diagnose", "Map", "Learn", "Prove", "Reassess"] as const;

export interface WelcomeStepProps {
  /** Offered when the run already finished and a fresh demo is wanted. */
  onStartOver: () => void;
}

export function WelcomeStep({ onStartOver }: WelcomeStepProps) {
  return (
    <div className="grid items-start gap-10 md:grid-cols-[1.2fr_1fr]">
      <div className="max-w-md">
        <h1 className="font-sans font-extrabold tracking-tight text-4xl md:text-5xl">
          Let&apos;s find your direction.
        </h1>
        <p className="mt-4 text-muted-foreground">
          Twelve light steps. Answer, skip, or say you&apos;re not sure yet — every option is a
          real answer, and you can retake this any time from your profile.
        </p>

        <ol className="mt-8 grid gap-2">
          {LOOP.map((label, i) => (
            <li key={label} className="flex items-center gap-3 text-sm">
              <span className="grid size-6 place-items-center rounded-full border border-border font-sans text-xs text-muted-foreground">
                {i + 1}
              </span>
              <span>{label}</span>
            </li>
          ))}
        </ol>

        <div className="mt-8 rounded-xl border border-dashed border-border bg-muted p-4 text-xs text-muted-foreground">
          <span className="rounded-sm bg-lory-yellow/40 px-1.5 py-0.5 font-medium text-foreground">
            Demo data
          </span>{" "}
          This build runs on mock mode: sample careers, sample roadmaps, answers saved only in
          this browser. No AI runs and nothing leaves your device.
          <div className="mt-3">
            <Button type="button" variant="outline" size="sm" onClick={onStartOver}>
              Reset demo answers
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <div className="animate-pop-in inline-flex rounded-full bg-lory-pink/20 p-2">
          <LoryAvatar state="idle" size="lg" />
        </div>
        <p className="mt-4 text-sm leading-relaxed text-foreground">
          Hi, I&apos;m Lory! I&apos;ll ask a few light questions, then draw a map you can edit.
          Nothing here decides anything for you.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">Skip whenever you like.</p>
        <ul className="mt-5 grid gap-2 text-sm">
          <li className="flex items-center gap-2 text-muted-foreground">
            <CheckCircle2 className="size-4 shrink-0 text-lory-green" aria-hidden />
            Answer once, change it anytime
          </li>
          <li className="flex items-center gap-2 text-muted-foreground">
            <CheckCircle2 className="size-4 shrink-0 text-lory-green" aria-hidden />
            Sample data stays clearly labelled
          </li>
          <li className="flex items-center gap-2 text-muted-foreground">
            <XCircle className="size-4 shrink-0 text-lory-burgundy" aria-hidden />
            No forced commitments, ever
          </li>
          <li className="flex items-center gap-2 text-muted-foreground">
            <Circle className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            Your resume stays optional
          </li>
        </ul>
      </div>
    </div>
  );
}
