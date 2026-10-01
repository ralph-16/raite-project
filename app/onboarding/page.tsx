import Link from "next/link";

import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Onboarding — Ka-Lakbay",
  description: "The next step after creating a Ka-Lakbay account.",
};

/**
 * Placeholder route — the intended destination after a successful Sign Up.
 *
 * Onboarding itself is deliberately not implemented yet, and reaching this
 * page requires an authenticated session (see PROTECTED_PREFIXES in
 * `lib/supabase/middleware.ts`).
 */
export default function OnboardingPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md flex flex-col gap-6 text-center">
        <p className="text-sm text-muted-foreground tracking-wide">
          Ka-Lakbay
        </p>
        <h1 className="font-display text-2xl font-normal tracking-tight">
          Onboarding comes next
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          This is where a student lands right after creating an account. The
          onboarding experience hasn&apos;t been built yet.
        </p>
        <Button asChild variant="outline">
          <Link href="/">Back to home</Link>
        </Button>
      </div>
    </main>
  );
}
