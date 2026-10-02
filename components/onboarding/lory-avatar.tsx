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

const STATE_IMAGE: Record<LoryAvatarState, string> = {
  idle: "/lory/lory-idle.png",
  thinking: "/lory/lory-thinking.png",
  happy: "/lory/lory-happy.png",
  confused: "/lory/lory-confused.png",
  celebrating: "/lory/lory-celebrating.png",
  encouraging: "/lory/lory-encouraging.png",
  determined: "/lory/lory-determined.png",
  welcoming: "/lory/lory-welcoming.png",
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
