"use client";

import { LoryAvatar, type LoryAvatarState } from "@/components/onboarding/lory-avatar";

/**
 * Left half of the onboarding split screen: a large Lory and one short
 * caption line that changes with the step. The caption is the only place
 * the wizard speaks, so it stays to one sentence.
 */
export interface CompanionProps {
  state: LoryAvatarState;
  caption: string;
}

export function LoryCompanion({ state, caption }: CompanionProps) {
  return (
    <aside
      aria-label="Lory, your guide"
      className="relative flex flex-col items-center justify-center gap-8 rounded-xl border border-border bg-card p-10 lg:items-start"
    >
      <div
        key={`${state}-${caption}`}
        className="animate-pop-in flex size-32 items-center justify-center rounded-full bg-lory-pink/20 sm:size-40"
      >
        <LoryAvatar size="lg" state={state} />
      </div>

      <p
        aria-live="polite"
        className="max-w-xs text-center font-display text-xl leading-snug tracking-tight lg:text-left"
      >
        {caption}
      </p>

      <p className="max-w-xs text-center text-xs leading-relaxed text-muted-foreground lg:text-left">
        No wrong answers. Skip anything.
      </p>
    </aside>
  );
}
