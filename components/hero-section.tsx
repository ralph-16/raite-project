"use client";

import { Button } from "@/components/ui/button";
import { useAuthDrawer } from "@/components/auth/auth-drawer-provider";
import { scrollToSection } from "@/lib/utils";

/**
 * Decorative typography only — these words are possibilities, never
 * recommendations, matches, or data about the visitor.
 */
const careerWords = [
  { text: "DOCTOR", rotation: -5, tone: "text-accent-ink", size: "text-2xl md:text-3xl" },
  { text: "PILOT", rotation: 4, tone: "text-lory-green", size: "text-3xl md:text-4xl" },
  { text: "DESIGNER", rotation: -3, tone: "text-foreground", size: "text-2xl md:text-3xl" },
  { text: "ARCHITECT", rotation: 6, tone: "text-lory-taffy", size: "text-3xl md:text-4xl" },
  { text: "TEACHER", rotation: -6, tone: "text-lory-green", size: "text-2xl md:text-3xl" },
  { text: "GAME DEVELOPER", rotation: 3, tone: "text-accent-ink", size: "text-2xl md:text-3xl" },
];

export function HeroSection() {
  const { openAuth } = useAuthDrawer();

  return (
    <section className="bg-background pt-28 pb-16 md:pt-36 md:pb-24">
      <div className="mx-auto max-w-5xl px-6">
        <p
          className="font-sans font-medium text-[11px] uppercase tracking-[0.2em] text-muted-foreground animate-rise-in"
          style={{ animationDelay: "0ms" }}
        >
          AI-powered student career navigator
        </p>

        <h1
          className="mt-5 font-sans font-extrabold tracking-tight text-5xl sm:text-6xl md:text-7xl lg:text-8xl leading-[1.05] animate-rise-in"
          style={{ animationDelay: "60ms" }}
        >
          What do you want <span className="marker">to be?</span>
        </h1>

        <div className="mt-10 grid gap-10 md:mt-14 md:grid-cols-[1.1fr_0.9fr] md:gap-12">
          <div className="animate-rise-in" style={{ animationDelay: "180ms" }}>
            <p className="text-xl font-medium leading-snug md:text-2xl">
              You don&apos;t have to know yet.
            </p>
            <p className="mt-4 max-w-md text-base leading-relaxed text-muted-foreground md:text-lg">
              Ka-Lakbay helps you explore possible paths, understand the skills
              behind them, and decide what to learn next — then gives you
              something to prove it.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Button
                size="lg"
                onClick={(event) => openAuth("signup", event.currentTarget)}
              >
                Start exploring
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => scrollToSection("uncertainty")}
              >
                I&apos;m not sure yet
              </Button>
            </div>

            <p className="mt-6 font-sans text-xs text-muted-foreground">
              No resume needed. Skip anything you&apos;re not sure about.
            </p>
          </div>

          {/* Possibilities, not promises. Decorative: hidden from AT. */}
          <div
            aria-hidden="true"
            className="flex flex-col items-start gap-3 md:items-end md:gap-4"
          >
            <span className="mb-1 hidden font-sans font-medium text-[11px] uppercase tracking-[0.2em] text-muted-foreground md:block">
              Possible paths, not promises
            </span>
            {careerWords.map((word, i) => (
              <span
                key={word.text}
                /* Animation lives on the wrapper: a CSS animation would
                   otherwise override the inline rotate on the same node. */
                className="animate-rise-in"
                style={{ animationDelay: `${340 + i * 120}ms` }}
              >
                <span
                  className={`inline-block font-sans font-bold tracking-tight leading-[1.1] ${word.size} ${word.tone}`}
                  style={{ transform: `rotate(${word.rotation}deg)` }}
                >
                  {word.text}
                </span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
