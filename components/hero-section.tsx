"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { useAuthDrawer } from "@/components/auth/auth-drawer-provider";
import { landingCopy } from "@/lib/mock/copy";
import { cn } from "@/lib/utils";

const COPY = landingCopy();

/**
 * Staggered exit: when a CTA is pressed the hero elements lift and fade in
 * sequence while the auth drawer slides in over them. Pure CSS transitions —
 * `prefers-reduced-motion` collapses them to nothing in globals.css.
 */
function useHeroExit(isDrawerOpen: boolean) {
  const [exiting, setExiting] = React.useState(false);

  React.useEffect(() => {
    if (isDrawerOpen) {
      setExiting(true);
      return;
    }
    setExiting(false);
  }, [isDrawerOpen]);

  return exiting;
}

interface HeroLayerProps {
  exiting: boolean;
  order: number;
  children: React.ReactNode;
  className?: string;
}

function HeroLayer({ exiting, order, children, className }: HeroLayerProps) {
  return (
    <div
      style={{ transitionDelay: `${order * 60}ms` }}
      className={cn(
        "transition-all duration-500 ease-out",
        exiting ? "-translate-y-8 opacity-0" : "translate-y-0 opacity-100",
        className
      )}
    >
      {children}
    </div>
  );
}

export function HeroSection() {
  const { openAuth, isOpen } = useAuthDrawer();
  const exiting = useHeroExit(isOpen);

  const openFromHero = (
    mode: "signup" | "login",
    trigger: HTMLElement
  ) => openAuth(mode, trigger);

  return (
    <section className="py-24 md:py-32">
      <div className="mx-auto max-w-5xl px-6">
        <div className="flex max-w-2xl flex-col gap-8">
          <HeroLayer exiting={exiting} order={0}>
            <p className="text-sm text-muted-foreground tracking-wide">
              {COPY.hero.eyebrow}
            </p>
          </HeroLayer>

          <HeroLayer exiting={exiting} order={1}>
            <h1 className="font-display font-normal text-5xl md:text-7xl tracking-tight leading-[1.1]">
              {COPY.hero.headlineBefore}{" "}
              <span className="text-lory-blue">{COPY.hero.headlineAccent}</span>
            </h1>
          </HeroLayer>

          <HeroLayer exiting={exiting} order={2}>
            <p className="max-w-lg text-lg text-muted-foreground leading-relaxed">
              {COPY.hero.subhead}
            </p>
          </HeroLayer>

          <HeroLayer exiting={exiting} order={3}>
            <div className="flex flex-wrap gap-3">
              <Button
                size="lg"
                onClick={(event) => openFromHero("signup", event.currentTarget)}
              >
                {COPY.hero.primaryCta}
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={(event) => openFromHero("login", event.currentTarget)}
              >
                {COPY.hero.secondaryCta}
              </Button>
            </div>
          </HeroLayer>

          <HeroLayer exiting={exiting} order={4}>
            <p className="text-sm text-muted-foreground">
              {COPY.hero.trustLine}
            </p>
          </HeroLayer>
        </div>
      </div>
    </section>
  );
}
