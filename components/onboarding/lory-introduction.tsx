import { Button } from "@/components/ui/button";
import { LoryAvatar } from "./lory-avatar";

interface LoryIntroductionProps {
  onBegin: () => void;
}

/** Step 0 — Meet Lory. Static placeholder copy; AI messaging comes later. */
export function LoryIntroduction({ onBegin }: LoryIntroductionProps) {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-6 px-6 py-16 text-center md:py-20">
      <LoryAvatar size="lg" />
      <h1 className="font-sans font-extrabold tracking-tight text-5xl md:text-7xl">
        Meet <span className="text-lory-blue">Lory</span>
      </h1>
      <p className="max-w-md text-lg text-foreground">
        Hey! I&apos;m Lory. I don&apos;t know what your future looks like yet.
        Let&apos;s figure it out together.
      </p>
      <div className="flex w-full max-w-md flex-col gap-2 rounded-xl border border-border bg-card p-5 text-left text-sm leading-relaxed text-muted-foreground">
        <p>I&apos;m an AI companion. I&apos;ll ask you some questions.</p>
        <p>There are no wrong answers, and you can skip where it fits.</p>
        <p>
          My goal is to help you explore possibilities — not to decide your
          career for you.
        </p>
      </div>
      <p className="max-w-md text-xs leading-relaxed text-muted-foreground">
        Lory is an AI. Suggestions are possibilities to explore, not guarantees
        about your future.
      </p>
      <Button type="button" size="lg" onClick={onBegin} className="min-w-44">
        Let&apos;s Begin
      </Button>
    </div>
  );
}
