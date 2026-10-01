"use client";

import { Button } from "@/components/ui/button";
import { useAuthDrawer } from "@/components/auth/auth-drawer-provider";
import { landingCopy } from "@/lib/mock/copy";

const COPY = landingCopy();

export function CTASection() {
  const { openAuth } = useAuthDrawer();

  return (
    <section className="border-t border-border">
      <div className="mx-auto max-w-5xl px-6 py-16 md:py-20">
        <div className="flex max-w-xl flex-col items-start gap-6">
          <h2 className="font-display text-3xl md:text-4xl font-normal tracking-tight">
            {COPY.finalCta.headline}
          </h2>
          <Button
            size="lg"
            onClick={(event) => openAuth("signup", event.currentTarget)}
          >
            {COPY.finalCta.button}
          </Button>
        </div>
      </div>
    </section>
  );
}
