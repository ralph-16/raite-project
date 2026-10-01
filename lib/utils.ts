import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Scrolls to a section, honouring the user's reduced-motion preference. */
export function scrollToSection(id: string): void {
  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;
  document
    .getElementById(id)
    ?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
}
