import Image from "next/image";

import { cn } from "@/lib/utils";

export type LoryAvatarState =
  | "idle"
  | "thinking"
  | "happy"
  | "confused"
  | "celebrating"
  | "encouraging"
  | "determined"
  | "welcoming";

/**
 * One portrait per mood, from the Lory set in `public/lory/`. Mood is
 * decorative — the surrounding copy always says what is happening.
 */
const STATE_IMAGE: Record<LoryAvatarState, string> = {
  idle: "/lory/LORY SITTING.png",
  thinking: "/lory/LORY THINKING.png",
  happy: "/lory/LORY FACING FORWARD HAPPY.png",
  confused: "/lory/LORY CONFUSED.png",
  celebrating: "/lory/LORY FIGURED IT OUT.png",
  encouraging: "/lory/LORY CUTE.png",
  determined: "/lory/LORY SERIOUS.png",
  welcoming: "/lory/LORY.png",
};

const SIZE_PX = { sm: 40, md: 56, lg: 80 } as const;

interface LoryAvatarProps {
  size?: keyof typeof SIZE_PX;
  /** Companion mood. Drives which portrait renders; surrounding copy always says what is happening. */
  state?: LoryAvatarState;
}

/**
 * Lory portraits (one PNG per mood in `public/lory/`). Static frames only —
 * ambient float retired per AGENTS.md §8. `thinking` keeps the shimmer
 * loading utility while the student waits. Mood is never the only signal.
 */
export function LoryAvatar({ size = "md", state = "idle" }: LoryAvatarProps) {
  const px = SIZE_PX[size];
  return (
    <span
      role="img"
      aria-label={`Lory is ${state}`}
      className={cn("inline-flex shrink-0 items-center justify-center", state === "thinking" && "shimmer rounded-full")}
    >
      <Image
        src={STATE_IMAGE[state]}
        alt=""
        width={px}
        height={px}
        className="object-contain"
      />
    </span>
  );
}
