"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuthDrawer } from "@/components/auth/auth-drawer-provider";
import { scrollToSection } from "@/lib/utils";

const NAV_ITEMS: Array<{ id: string; label: string }> = [
  { id: "how-it-works", label: "How it works" },
  { id: "about", label: "What AI does" },
];

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { openAuth } = useAuthDrawer();

  const scrollTo = (id: string) => {
    scrollToSection(id);
    setMobileOpen(false);
  };

  const openFromNav = (mode: "signup" | "login", trigger: HTMLElement) => {
    setMobileOpen(false);
    openAuth(mode, trigger);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background">
      <div className="mx-auto max-w-5xl px-6 h-16 flex items-center justify-between gap-4">
        <Link
          href="/"
          className="group flex items-center gap-2 font-sans font-semibold tracking-tight text-lg tracking-tight shrink-0"
        >
          Ka-Lakbay
          <span
            aria-hidden="true"
            className="size-2 bg-accent-highlight transition-transform duration-300 group-hover:scale-125"
          />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => scrollTo(item.id)}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {item.label}
            </button>
          ))}
          <button
            type="button"
            onClick={(event) => openFromNav("login", event.currentTarget)}
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Log in
          </button>
          <Button
            size="sm"
            onClick={(event) => openFromNav("signup", event.currentTarget)}
          >
            Start exploring
          </Button>
          <ThemeToggle />
        </nav>

        {/* Mobile controls */}
        <div className="flex items-center gap-1 md:hidden">
          <ThemeToggle />
          <button
            type="button"
            className="flex size-11 items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden="true"
            >
              {mobileOpen ? (
                <path d="M5 5l10 10M15 5L5 15" />
              ) : (
                <path d="M3 6h14M3 10h14M3 14h14" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-background px-6 py-4 flex flex-col gap-1 animate-rise-in">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => scrollTo(item.id)}
              className="flex min-h-11 items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {item.label}
            </button>
          ))}
          <button
            type="button"
            onClick={(event) => openFromNav("login", event.currentTarget)}
            className="flex min-h-11 items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Log in
          </button>
          <Button
            size="sm"
            className="mt-2 w-full"
            onClick={(event) => openFromNav("signup", event.currentTarget)}
          >
            Start exploring
          </Button>
        </div>
      )}
    </header>
  );
}
