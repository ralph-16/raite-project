"use client";

/**
 * Header strip: greeting + "Lory's read on you" + retake link.
 *
 * The summary comes from `kl.profile` (built at onboarding finish by the
 * deterministic scorer) and is always labelled as a sample suggestion. When
 * onboarding was never finished the strip shows the empty state instead.
 */

import Link from "next/link";

import { LoryAvatar } from "@/components/onboarding/lory-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { CareerCategory, MockProfile } from "@/lib/mock/types";

const CATEGORY_PHRASE: Record<CareerCategory, string> = {
  build: "building and fixing things",
  analyze: "figuring out how things work",
  design: "making things look and feel right",
  communicate: "explaining ideas and connecting with people",
};

export interface LoryReadStripProps {
  displayName: string;
  profile: MockProfile | null;
}

export function LoryReadStrip({ displayName, profile }: LoryReadStripProps) {
  return (
    <section aria-label="Your read" className="rounded-xl border border-border bg-card p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <LoryAvatar size="md" state="idle" />
          <div>
            <h1 className="font-display font-normal text-3xl md:text-4xl">
              Hi, {displayName}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {profile
                ? "Here is where you left off — everything below is a starting point."
                : "You don't have to know yet. Start with one round of questions."}
            </p>
          </div>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/onboarding?retake=1">Retake questions</Link>
        </Button>
      </div>

      <div className="mt-5 border-t border-border pt-5">
        {profile ? (
          <>
            <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
              Lory&apos;s read on you
              <Badge variant="highlight">Lory suggests (sample)</Badge>
            </div>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              {profile.lorySummary}
            </p>
            {profile.interests.length > 0 ? (
              <ul className="mt-3 flex flex-wrap gap-2">
                {profile.interests.map((interest) => (
                  <li key={interest}>
                    <Badge variant="outline">{interest}</Badge>
                  </li>
                ))}
              </ul>
            ) : null}
            {profile.topCategory ? (
              <p className="mt-3 text-xs text-muted-foreground">
                Your answers lean towards {CATEGORY_PHRASE[profile.topCategory]}{" "}
                (sample).
              </p>
            ) : null}
          </>
        ) : (
          <>
            <p className="max-w-2xl text-sm text-muted-foreground">
              No read yet — answer eight skippable questions once and this fills
              in. About three minutes, and skipping is a real answer.
            </p>
            <Button asChild className="mt-3">
              <Link href="/onboarding">Answer the questions</Link>
            </Button>
          </>
        )}
      </div>
    </section>
  );
}
