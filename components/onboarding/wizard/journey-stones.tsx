"use client";

import { cn } from "@/lib/utils";

/**
 * Journey progress: stepping stones (Ka-Lakbay = a journey) with the
 * current position marked by the Mellow highlight.
 *
 * The path is decorative — `aria-hidden` — and the real announcement is the
 * visible "Step n of N" text rendered by the wizard.
 */
interface JourneyStonesProps {
  total: number;
  current: number;
}

export function JourneyStones({ total, current }: JourneyStonesProps) {
  return (
    <ol
      aria-hidden="true"
      className="flex items-center gap-1.5"
      data-testid="journey-stones"
    >
      {Array.from({ length: total }, (_, index) => {
        const done = index < current;
        const active = index === current;
        return (
          <li key={index} className="flex items-center">
            <span
              className={cn(
                "block h-2.5 rounded-full transition-all duration-300",
                done && "w-6 bg-primary",
                active && "w-9 bg-lory-yellow shadow-[0_0_0_3px_hsl(var(--lory-yellow)/0.25)]",
                !done && !active && "w-2.5 bg-border"
              )}
            />
            {index < total - 1 ? (
              <span
                className={cn(
                  "h-px w-2 transition-colors",
                  done ? "bg-primary" : "bg-border"
                )}
              />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
