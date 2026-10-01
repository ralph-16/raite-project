"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { readMockSession } from "@/lib/mock/auth";
import { MOCK_MODE } from "@/lib/mock/flags";

/**
 * Client-side route guard for mock mode.
 *
 * In mock mode there is no Supabase session to check server-side, so the
 * protected pages wrap their children in this and redirect an unauthenticated
 * visitor to `/?auth=login` (which opens the auth drawer in place).
 * `/` itself is deliberately NOT guarded — a logged-in student can still
 * visit the landing page.
 *
 * With `NEXT_PUBLIC_MOCK_MODE=false` this renders its children untouched and
 * `middleware.ts` does the redirecting, exactly as before.
 */
const PROTECTED_PREFIXES = [
  "/home",
  "/onboarding",
  "/profile",
  "/settings",
  "/roadmap",
];

function isProtected(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export function MockGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [status, setStatus] = React.useState<"pending" | "ready" | "leaving">(
    "pending"
  );

  React.useEffect(() => {
    if (!MOCK_MODE) {
      setStatus("ready");
      return;
    }
    const pathname = window.location.pathname;
    if (!isProtected(pathname)) {
      setStatus("ready");
      return;
    }
    if (!readMockSession()) {
      setStatus("leaving");
      router.replace("/?auth=login");
      return;
    }
    setStatus("ready");
  }, [router]);

  if (!MOCK_MODE || status === "ready") {
    return <>{children}</>;
  }

  if (status === "leaving") {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <p role="status" className="text-sm text-muted-foreground">
          Taking you to the sign-in drawer…
        </p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="flex w-full max-w-sm flex-col gap-3" role="status">
        <div className="shimmer h-4 w-40 rounded bg-muted" aria-hidden="true" />
        <div className="shimmer h-4 w-full rounded bg-muted" aria-hidden="true" />
        <div className="shimmer h-4 w-3/4 rounded bg-muted" aria-hidden="true" />
        <p className="sr-only">Loading your Ka-Lakbay session…</p>
      </div>
    </main>
  );
}
