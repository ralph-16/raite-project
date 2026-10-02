"use client";

/**
 * Career detail modal (MVP screen: career detail). Shadcn Dialog, scrollable
 * on small screens, always with a DialogTitle for a11y.
 *
 * Honesty rules: every seeded figure carries a "Sample data" badge, the
 * alignment block is labelled "Lory suggests (sample)", and nothing here
 * tells the student what to become.
 */

import Link from "next/link";

import {
  BookmarkButton,
  alignmentLabel,
  alignmentTone,
  categoryLabel,
  demandLabel,
  formatSalary,
} from "@/components/career-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getCareer } from "@/lib/mock/careers";
import type { Career, CareerRelationshipType } from "@/lib/mock/types";

const RELATIONSHIP_LABEL: Record<CareerRelationshipType, string> = {
  related: "Related",
  next_level: "Next level",
  pivot: "Pivot",
  alternative: "Alternative",
};

export interface CareerModalProps {
  career: Career | null;
  score: number | null;
  reasons: string[];
  isSaved: boolean;
  onToggleSave: (slug: string) => void;
  /** Swap the modal to a related career (used by the related list). */
  onOpenCareer: (slug: string) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CareerModal({
  career,
  score,
  reasons,
  isSaved,
  onToggleSave,
  onOpenCareer,
  open,
  onOpenChange,
}: CareerModalProps) {
  return (
    <Dialog open={open && career !== null} onOpenChange={onOpenChange}>
      {career ? (
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{categoryLabel(career.category)}</Badge>
              {career.is_sample_data ? (
                <Badge variant="quiet">Sample data</Badge>
              ) : null}
            </div>
            <DialogTitle className="font-sans font-bold tracking-tight text-2xl">
              {career.title}
            </DialogTitle>
            <DialogDescription>{career.description}</DialogDescription>
          </DialogHeader>

          {score !== null ? (
            <section aria-label="Alignment" className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-sans text-3xl text-foreground">
                  {score}%
                </span>
                <Badge variant={alignmentTone(score)}>
                  {alignmentLabel(score)}
                </Badge>
                <Badge variant="highlight">Lory suggests (sample)</Badge>
              </div>
              <ul className="flex flex-col gap-1">
                {reasons.map((reason) => (
                  <li
                    key={reason}
                    className="text-sm text-muted-foreground"
                  >
                    {reason}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground">
                A starting point to explore, not a verdict — you decide what
                fits.
              </p>
            </section>
          ) : (
            <p className="text-sm text-muted-foreground">
              Answer the questions once and your alignment shows up here.
            </p>
          )}

          <section aria-label="Day to day" className="flex flex-col gap-2">
            <h3 className="text-sm font-medium">What you&apos;d do</h3>
            <p className="text-sm text-muted-foreground">
              {career.role_description}
            </p>
            <ul className="flex flex-col gap-1.5">
              {career.daily_work.map((item) => (
                <li
                  key={item}
                  className="flex gap-2 text-sm text-muted-foreground"
                >
                  <span aria-hidden className="text-primary">
                    —
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section
            aria-label="Skills"
            className="flex flex-col gap-3 rounded-xl border border-border p-4"
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-medium">Skills it leans on</h3>
              <Badge variant="quiet">Sample data</Badge>
            </div>
            <ul className="flex flex-col gap-2">
              {career.required_skills.map((skill) => (
                <li
                  key={skill.slug}
                  className="flex items-center justify-between gap-3"
                >
                  <span className="text-sm">{skill.name}</span>
                  <span className="flex items-center gap-2">
                    <span
                      aria-hidden
                      className="flex gap-0.5"
                    >
                      {Array.from({ length: 5 }, (_, i) => (
                        <span
                          key={i}
                          className={
                            i < skill.importance
                              ? "h-1.5 w-3 rounded-sm bg-primary"
                              : "h-1.5 w-3 rounded-sm bg-muted"
                          }
                        />
                      ))}
                    </span>
                    <span className="font-sans text-xs text-muted-foreground">
                      {skill.importance}/5
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section aria-label="Figures" className="flex flex-col gap-2">
            <h3 className="text-sm font-medium">Figures</h3>
            <dl className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <div className="rounded-xl border border-border p-3">
                <dt className="text-xs text-muted-foreground">
                  Typical pay
                </dt>
                <dd className="mt-1 font-sans text-sm">
                  {formatSalary(career)}
                </dd>
              </div>
              <div className="rounded-xl border border-border p-3">
                <dt className="text-xs text-muted-foreground">
                  Market demand
                </dt>
                <dd className="mt-1 font-sans text-sm">
                  {demandLabel(career.market_demand)}
                </dd>
              </div>
              <div className="rounded-xl border border-border p-3">
                <dt className="text-xs text-muted-foreground">
                  Time to learn
                </dt>
                <dd className="mt-1 font-sans text-sm">
                  ~{career.learning_effort_months} months
                </dd>
              </div>
            </dl>
            {career.is_sample_data ? (
              <p className="text-xs text-muted-foreground">
                Illustrative figures for the demo — treat them as a rough
                orientation, not a promise.
              </p>
            ) : null}
          </section>

          {career.related.length > 0 ? (
            <section aria-label="Related careers" className="flex flex-col gap-2">
              <h3 className="text-sm font-medium">Where this can lead</h3>
              <ul className="flex flex-col gap-2">
                {career.related.map((item) => {
                  const target = getCareer(item.slug);
                  return (
                    <li
                      key={`${item.type}-${item.slug}`}
                      className="rounded-xl border border-border p-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <Badge variant="outline">
                          {RELATIONSHIP_LABEL[item.type]}
                        </Badge>
                        <button
                          type="button"
                          onClick={() => onOpenCareer(item.slug)}
                          className="text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lory-blue focus-visible:ring-offset-2 rounded-sm"
                        >
                          {target?.title ?? item.slug}
                        </button>
                      </div>
                      <p className="mt-1.5 text-xs text-muted-foreground">
                        {item.rationale}
                      </p>
                      <p className="mt-1 font-sans text-xs text-muted-foreground">
                        Transferable: {item.transferable_skills.join(", ")}
                      </p>
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}

          <DialogFooter>
            <BookmarkButton
              slug={career.slug}
              title={career.title}
              isSaved={isSaved}
              onSave={onToggleSave}
            />
            <Button type="button" asChild>
              <Link href={`/roadmap/${career.slug}`}>Open roadmap</Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      ) : null}
    </Dialog>
  );
}
