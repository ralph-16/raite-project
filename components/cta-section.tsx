"use client";

import { Button } from "@/components/ui/button";
import { useAuthDrawer } from "@/components/auth/auth-drawer-provider";

export function CTASection() {
  const { openAuth } = useAuthDrawer();

  return (
    <section className="border-t border-border">
      <div className="mx-auto max-w-5xl px-6 py-16 md:py-20">
        <div className="max-w-xl flex flex-col gap-8">
          <div className="flex flex-col gap-4">
            <h2 className="font-display text-3xl md:text-4xl font-normal tracking-tight">
              You don&apos;t have to have it all figured out.
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Start with what you know. Explore what interests you. Build the skills you want to develop.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              size="lg"
              onClick={(event) => openAuth("signup", event.currentTarget)}
            >
              Start My Journey
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={(event) => openAuth("signup", event.currentTarget)}
            >
              I&apos;m Lost
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
