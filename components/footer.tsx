"use client";

import Link from "next/link";

import { useAuthDrawer } from "@/components/auth/auth-drawer-provider";
import { scrollToSection } from "@/lib/utils";

const FOOTER_LINKS: Array<{ id: string; label: string }> = [
  { id: "problem", label: "The problem" },
  { id: "how-it-works", label: "How it works" },
  { id: "about", label: "What AI does" },
];

export function Footer() {
  const { openAuth } = useAuthDrawer();

  return (
    <footer className="bg-background">
      <div className="mx-auto max-w-5xl px-6 py-12">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-8">
          <div className="flex flex-col gap-2 max-w-xs">
            <Link
              href="/"
              className="group flex items-center gap-2 font-display font-normal text-lg tracking-tight"
            >
              Ka-Lakbay
              <span
                aria-hidden="true"
                className="size-2 bg-accent-highlight transition-transform duration-300 group-hover:scale-125"
              />
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed">
              AI-powered student career and learning navigator.
            </p>
          </div>

          <nav
            aria-label="Footer"
            className="flex flex-wrap gap-x-8 gap-y-3"
          >
            {FOOTER_LINKS.map((link) => (
              <button
                key={link.id}
                type="button"
                onClick={() => scrollToSection(link.id)}
                className="min-h-11 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.label}
              </button>
            ))}
            <button
              type="button"
              onClick={(event) => openAuth("login", event.currentTarget)}
              className="min-h-11 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Log in
            </button>
            <button
              type="button"
              onClick={(event) => openAuth("signup", event.currentTarget)}
              className="min-h-11 text-sm font-medium text-foreground hover:text-accent-ink transition-colors"
            >
              Start exploring
            </button>
          </nav>
        </div>

        <div className="mt-10 pt-6 border-t border-border">
          <p className="text-xs text-muted-foreground leading-relaxed max-w-lg">
            Ka-Lakbay is an AI learning companion. Career suggestions are
            possibilities to explore, not guarantees.
          </p>
          <p className="text-xs text-muted-foreground mt-4">
            &copy; 2026 Ka-Lakbay
          </p>
        </div>
      </div>
    </footer>
  );
}
