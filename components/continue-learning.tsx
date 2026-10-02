"use client";

/**
 * "Continue learning" row: any career map with saved node progress, with its
 * percentage, the next node to open, and a link into the roadmap. Empty state
 * explains where progress will appear (no fake numbers).
 */

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";

export interface ContinueItem {
  slug: string;
  title: string;
  percent: number;
  nextNode: string | null;
}

export interface ContinueLearningProps {
  items: ContinueItem[];
}

export function ContinueLearning({ items }: ContinueLearningProps) {
  return (
    <section
      aria-labelledby="continue-heading"
      className="flex flex-col gap-3"
    >
      <h2
        id="continue-heading"
        className="font-display font-normal text-2xl md:text-3xl"
      >
        Continue learning
      </h2>

      {items.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>No map open yet</EmptyTitle>
            <EmptyDescription>
              Open a career below, then start Level 01. Lory keeps your place
              right here.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {items.map((item) => (
            <li key={item.slug}>
              <Card className="flex h-full flex-col gap-3 p-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-display font-normal text-lg">
                    {item.title}
                  </p>
                  <span className="font-mono text-sm text-muted-foreground">
                    {item.percent}%
                  </span>
                </div>
                <div
                  className="h-2 overflow-hidden rounded-full bg-muted"
                  role="progressbar"
                  aria-valuenow={item.percent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${item.title} progress`}
                >
                  <div
                    className="h-full origin-left rounded-full bg-primary"
                    style={{ transform: `scaleX(${item.percent / 100})` }}
                  />
                </div>
                {item.nextNode ? (
                  <p className="text-xs text-muted-foreground">
                    Next up: {item.nextNode}
                  </p>
                ) : null}
                <Button asChild size="sm" className="self-start">
                  <Link href={`/roadmap/${item.slug}`}>Continue</Link>
                </Button>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
