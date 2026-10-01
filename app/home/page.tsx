import Link from "next/link";

import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Home — Ka-Lakbay",
  description: "The Ka-Lakbay student home.",
};

/**
 * Placeholder route — the intended destination after a successful Log In.
 *
 * The Home Dashboard is deliberately not implemented yet, and reaching this
 * page requires an authenticated session (see PROTECTED_PREFIXES in
 * `lib/supabase/middleware.ts`).
 */
export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md flex flex-col gap-6 text-center">
        <p className="text-sm text-muted-foreground tracking-wide">
          Ka-Lakbay
        </p>
        <h1 className="font-display text-2xl font-normal tracking-tight">
          Home is coming next
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          This is where a student lands after signing in. The Home Dashboard
          hasn&apos;t been built yet.
        </p>
        <Button asChild variant="outline">
          <Link href="/">Back to home</Link>
        </Button>
      </div>
    </main>
  );
}
