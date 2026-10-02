"use client";

/**
 * Career exploration card (§7.2 career-card).
 *
 * Sibling buttons — the bookmark toggle never nests inside the card-open
 * button, so both stay keyboard-reachable. Alignment % always ships with its
 * reason and a text label (colour is never the only signal).
 */

import { Bookmark, BookmarkCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Career, CareerCategory, MarketDemand } from "@/lib/mock/types";

/** Spec thresholds: Strong ≥ 65, Good ≥ 50, otherwise Exploring. */
export function alignmentLabel(score: number): "Strong" | "Good" | "Exploring" {
  if (score >= 65) return "Strong";
  if (score >= 50) return "Good";
  return "Exploring";
}

export type BadgeTone = "info" | "highlight" | "quiet";

export function alignmentTone(score: number): BadgeTone {
  if (score >= 65) return "info";
  if (score >= 50) return "highlight";
  return "quiet";
}

export function categoryLabel(category: CareerCategory): string {
  const labels: Record<CareerCategory, string> = {
    build: "Build",
    analyze: "Analyze",
    design: "Design",
    communicate: "Communicate",
  };
  return labels[category];
}

export function demandLabel(demand: MarketDemand): string {
  const labels: Record<MarketDemand, string> = {
    high: "High demand",
    medium: "Steady demand",
    low: "Niche demand",
  };
  return labels[demand];
}

export function formatSalary(career: Career): string {
  const { median, currency, period } = career.salary;
  const money = new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(median);
  const suffix =
    period === "annual" ? "/year" : period === "monthly" ? "/month" : "/hour";
  return `${money}${suffix}`;
}

export interface CareerCardProps {
  career: Career;
  /** `null` when the student has not finished the questions yet. */
  alignmentPercent: number | null;
  /** One Lory reason, shown next to the percentage (§5). */
  reason: string | null;
  isSaved: boolean;
  onSave: (slug: string) => void;
  onClick: (slug: string) => void;
}

export function CareerCard({
  career,
  alignmentPercent,
  reason,
  isSaved,
  onSave,
  onClick,
}: CareerCardProps) {
  return (
    <Card className="relative h-full transition-colors hover:border-lory-blue/60">
      <button
        type="button"
        aria-pressed={isSaved}
        aria-label={
          isSaved ? `Remove ${career.title} from saved` : `Save ${career.title}`
        }
        onClick={() => onSave(career.slug)}
        className="absolute right-2 top-2 z-10 grid size-11 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lory-blue focus-visible:ring-offset-2"
      >
        {isSaved ? (
          <BookmarkCheck aria-hidden />
        ) : (
          <Bookmark aria-hidden />
        )}
      </button>

      <button
        type="button"
        onClick={() => onClick(career.slug)}
        className="flex h-full flex-col rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lory-blue focus-visible:ring-offset-2"
      >
        <CardHeader className="pb-3 pr-14">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{categoryLabel(career.category)}</Badge>
            {alignmentPercent !== null ? (
              <Badge variant={alignmentTone(alignmentPercent)}>
                {alignmentLabel(alignmentPercent)}
              </Badge>
            ) : null}
          </div>
          <CardTitle className="font-sans font-semibold tracking-tight text-lg">
            {career.title}
          </CardTitle>
          {alignmentPercent !== null ? (
            <p className="flex items-baseline gap-2">
              <span className="font-sans text-2xl text-foreground">
                {alignmentPercent}%
              </span>
              <span className="text-xs text-muted-foreground">alignment</span>
            </p>
          ) : null}
        </CardHeader>

        <CardContent className="flex flex-1 flex-col gap-3">
          {reason && alignmentPercent !== null ? (
            <p className="line-clamp-2 text-xs text-muted-foreground">
              {reason}
            </p>
          ) : null}
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {career.description}
          </p>
          <div className="mt-auto flex flex-wrap items-center gap-2">
            <span className="font-sans text-xs text-muted-foreground">
              {formatSalary(career)} · {demandLabel(career.market_demand)} · ~
              {career.learning_effort_months} months
            </span>
            {career.is_sample_data ? (
              <Badge variant="quiet">Sample data</Badge>
            ) : null}
          </div>
        </CardContent>
      </button>
    </Card>
  );
}

export interface BookmarkButtonProps {
  slug: string;
  title: string;
  isSaved: boolean;
  onSave: (slug: string) => void;
  /** Larger footprint for use in the career modal footer. */
  size?: "sm" | "default";
}

/** Shared save control so the card and the modal never drift apart. */
export function BookmarkButton({
  title,
  isSaved,
  onSave,
  slug,
  size = "default",
}: BookmarkButtonProps) {
  return (
    <Button
      type="button"
      variant="outline"
      size={size}
      aria-pressed={isSaved}
      aria-label={isSaved ? `Remove ${title} from saved` : `Save ${title}`}
      onClick={() => onSave(slug)}
    >
      {isSaved ? (
        <BookmarkCheck data-icon="inline-start" aria-hidden />
      ) : (
        <Bookmark data-icon="inline-start" aria-hidden />
      )}
      {isSaved ? "Saved" : "Save"}
    </Button>
  );
}
