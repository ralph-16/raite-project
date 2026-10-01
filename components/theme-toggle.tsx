"use client";

import { Moon, Sun } from "lucide-react";

import { saveTheme } from "@/lib/mock/storage";

/**
 * Light/dark switch used in every top navigation.
 *
 * The initial theme is applied before first paint by the inline script in
 * `app/layout.tsx`, so this component needs no state: the two icons are
 * shown/hidden with `dark:` variants straight off the <html> class, which
 * keeps the server and client markup identical.
 */
export function ThemeToggle() {
  const handleToggle = () => {
    const root = document.documentElement;
    const nextIsDark = !root.classList.contains("dark");
    root.classList.toggle("dark", nextIsDark);
    saveTheme(nextIsDark ? "dark" : "light");
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label="Toggle dark mode"
      title="Toggle dark mode"
      className="inline-flex size-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent/20 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <Moon aria-hidden="true" className="size-4 dark:hidden" />
      <Sun aria-hidden="true" className="hidden size-4 dark:block" />
    </button>
  );
}
