"use client";

import { useAuthDrawer } from "@/components/auth/auth-drawer-provider";
import { scrollToSection } from "@/lib/utils";

export function Footer() {
  const { openAuth } = useAuthDrawer();

  return (
    <footer className="border-t border-border">
      <div className="mx-auto max-w-5xl px-6 py-12">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-8">
          <div className="flex flex-col gap-2 max-w-xs">
            <p className="font-display font-normal text-lg tracking-tight">
              Ka-Lakbay
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              AI-powered student career and learning navigator.
            </p>
          </div>

          <nav className="flex flex-wrap gap-x-8 gap-y-3">
            <button
              onClick={() => scrollToSection("how-it-works")}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              How It Works
            </button>
            <button
              onClick={() => scrollToSection("features")}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Features
            </button>
            <button
              onClick={() => scrollToSection("career-paths")}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Career Paths
            </button>
            <button
              type="button"
              onClick={(event) => openAuth("login", event.currentTarget)}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Log In
            </button>
            <button
              type="button"
              onClick={(event) => openAuth("signup", event.currentTarget)}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Start My Journey
            </button>
          </nav>
        </div>

        <div className="mt-10 pt-6 border-t border-border">
          <p className="text-xs text-muted-foreground leading-relaxed max-w-lg">
            Ka-Lakbay is an AI learning companion. Career suggestions are possibilities to explore, not guarantees.
          </p>
          <p className="text-xs text-muted-foreground mt-4">
            &copy; 2026 Ka-Lakbay
          </p>
        </div>
      </div>
    </footer>
  );
}
