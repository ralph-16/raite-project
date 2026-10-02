import { Bird } from "lucide-react";

import { cn } from "@/lib/utils";

export type LoryAvatarState = "idle" | "thinking" | "happy" | "confused";

interface LoryAvatarProps {
  size?: "sm" | "md" | "lg";
  /** Companion state. Drives motion and tint; always paired with text nearby. */
  state?: LoryAvatarState;
}

/**
 * Lory mark: parrot companion in a soft tinted circle. Static tint only —
 * ambient float retired per AGENTS.md §8 (no constant floating). `thinking`
 * uses the shimmer loading utility while the student waits,
 * `happy`/`confused` are still frames for done/error moments. State is never
 * the only signal — surrounding copy always says what is happening.
 */
export function LoryAvatar({ size = "md", state = "idle" }: LoryAvatarProps) {
  return (
    <div
      role="img"
      aria-label={`Lory is ${state}`}
      className={cn(
        "inline-flex items-center justify-center rounded-full text-foreground",
        state === "confused" ? "bg-lory-hot-pink/10" : "bg-lory-pink/20",
        state === "thinking" && "shimmer",
        size === "sm" && "size-10",
        size === "md" && "size-14",
        size === "lg" && "size-20"
      )}
    >
      <Bird
        aria-hidden="true"
        className={cn(
          size === "sm" && "size-5",
          size === "md" && "size-7",
          size === "lg" && "size-10"
        )}
      />
    </div>
  );
}
