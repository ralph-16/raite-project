"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import { saveTheme } from "@/lib/mock/storage";

type Theme = "light" | "dark";

function readTheme(): Theme {
  // The inline script in `app/layout.tsx` already applied `kl.theme` to <html>
  // before paint, so the class is the source of truth — no storage read, no
  // hydration mismatch.
  if (typeof document === "undefined") return "light";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
}

/**
 * Light / dark switch for the landing page and app shell.
 *
 * The saved theme (`kl.theme`) is applied pre-paint by the inline script in
 * `app/layout.tsx`; this component only mirrors that state and adds a short
 * `.theme-anim` window so colours cross-fade instead of snapping.
 */
export function ThemeToggle() {
  const [theme, setTheme] = React.useState<Theme>("light");

  React.useEffect(() => {
    setTheme(readTheme());
  }, []);

  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
    saveTheme(next);

    const root = document.documentElement;
    root.classList.add("theme-anim");
    window.setTimeout(() => root.classList.remove("theme-anim"), 320);
  };

  const isDark = theme === "dark";

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={toggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      aria-pressed={isDark}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? (
        <Sun aria-hidden="true" />
      ) : (
        <Moon aria-hidden="true" />
      )}
    </Button>
  );
}
