"use client";

import { Button } from "@/components/ui/button";
import { useAuthDrawer } from "@/components/auth/auth-drawer-provider";

export function HeroSection() {
  const { openAuth } = useAuthDrawer();

  return (
    <section className="py-24 md:py-32">
      <div className="mx-auto max-w-5xl px-6">
        <div className="max-w-2xl flex flex-col gap-8">
          <p className="text-sm text-muted-foreground tracking-wide">
            AI-Powered Student Career Navigator
          </p>
          <h1 className="font-display font-normal text-5xl md:text-7xl tracking-tight leading-[1.1]">
            You have a degree.
            <br />
            But do you have a{" "}
            <span className="text-lory-blue">direction</span>?
          </h1>
          <p className="text-lg text-muted-foreground max-w-lg leading-relaxed">
            Ka-Lakbay helps you explore possible career paths, understand the skills you already have, discover what you can develop next, and build proof of what you can do.
          </p>
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
              I&apos;m Not Sure Yet
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Your future isn&apos;t decided for you. Ka-Lakbay helps you explore what&apos;s possible.
          </p>
        </div>
      </div>
    </section>
  );
}
