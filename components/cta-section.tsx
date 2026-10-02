"use client";

import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/reveal";
import { useAuthDrawer } from "@/components/auth/auth-drawer-provider";
import { scrollToSection } from "@/lib/utils";

/**
 * START — the closing chapter, inverted against the rest of the page so the
 * final action is the last thing the eye lands on.
 */
export function CTASection() {
  const { openAuth } = useAuthDrawer();

  return (
    <section className="bg-foreground text-background">
      <Reveal className="mx-auto max-w-5xl px-6 py-20 md:py-28">
        <p className="font-sans font-medium text-[11px] uppercase tracking-[0.2em] text-background/70">
          Start somewhere
        </p>

        <h2 className="mt-5 max-w-4xl font-sans font-extrabold tracking-tight text-4xl leading-[1.08] md:text-6xl">
          You don&apos;t need the whole answer.
          <br className="hidden md:block" /> You just need somewhere to start.
        </h2>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Button
            size="lg"
            variant="loryYellow"
            onClick={(event) => openAuth("signup", event.currentTarget)}
          >
            Start exploring
            <ArrowRight data-icon="inline-end" aria-hidden="true" />
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={() => scrollToSection("how-it-works")}
          >
            How it works
          </Button>
        </div>

        <p className="mt-6 font-sans text-xs text-background/70">
          Free to start · Resume optional · You stay in control
        </p>
      </Reveal>
    </section>
  );
}
