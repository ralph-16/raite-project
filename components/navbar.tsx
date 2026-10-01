"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuthDrawer } from "@/components/auth/auth-drawer-provider";
import { scrollToSection } from "@/lib/utils";

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { openAuth } = useAuthDrawer();

  const scrollTo = (id: string) => {
    scrollToSection(id);
    setMobileOpen(false);
  };

  const openFromNav = (
    mode: "signup" | "login",
    trigger: HTMLElement
  ) => {
    setMobileOpen(false);
    openAuth(mode, trigger);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto max-w-5xl px-6 h-16 flex items-center justify-between">
        <Link href="/" className="font-display font-normal text-lg tracking-tight">
          Ka-Lakbay
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6">
          <button
            onClick={() => scrollTo("how-it-works")}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            How It Works
          </button>
          <button
            onClick={() => scrollTo("features")}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Features
          </button>
          <ThemeToggle />
          <button
            type="button"
            onClick={(event) => openFromNav("login", event.currentTarget)}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Log In
          </button>
          <Button
            size="sm"
            onClick={(event) => openFromNav("signup", event.currentTarget)}
          >
            Start My Journey
          </Button>
        </nav>

        {/* Mobile controls */}
        <div className="flex items-center gap-1 md:hidden">
          <ThemeToggle />
          <button
            className="p-2 text-muted-foreground hover:text-foreground"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
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
        <div className="md:hidden border-t border-border bg-background px-6 py-4 flex flex-col gap-3">
          <button
            onClick={() => scrollTo("how-it-works")}
            className="block text-sm text-muted-foreground hover:text-foreground"
          >
            How It Works
          </button>
          <button
            onClick={() => scrollTo("features")}
            className="block text-sm text-muted-foreground hover:text-foreground"
          >
            Features
          </button>
          <button
            type="button"
            onClick={(event) => openFromNav("login", event.currentTarget)}
            className="block text-sm text-muted-foreground hover:text-foreground"
          >
            Log In
          </button>
          <Button
            size="sm"
            className="w-full"
            onClick={(event) => openFromNav("signup", event.currentTarget)}
          >
            Start My Journey
          </Button>
        </div>
      )}
    </header>
  );
}
