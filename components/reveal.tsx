"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

export interface RevealProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  /** Stagger in ms — use sparingly (§8: one orchestrated moment per page). */
  delay?: number;
}

/**
 * Scroll reveal for landing sections.
 *
 * Reuses the page's existing `data-[state="visible"]` + transition pattern
 * rather than introducing a second animation system. Content only fades
 * once the section is actually near the viewport, and anything without
 * IntersectionObserver support (or before hydration) shows immediately
 * enough — motion is never allowed to hide content.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  ...props
}: RevealProps) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.disconnect();
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.05 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      data-state={visible ? "visible" : undefined}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
      className={cn(
        "opacity-0 translate-y-3 transition-[opacity,transform] duration-700 ease-out",
        "data-[state=visible]:opacity-100 data-[state=visible]:translate-y-0",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
