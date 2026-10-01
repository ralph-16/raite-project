"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { StudentProfile } from "@/components/student-profile";
import { logOut } from "@/lib/auth/actions";
import { HOME_SNAPSHOT_KEY, type HomeSnapshot } from "@/lib/onboarding/guided";

/**
 * Home content for the signed-in student: the Explorer Profile snapshot
 * saved at onboarding completion, plus the session controls. Everything
 * AI-made is labeled.
 */
export function HomeProfile() {
  const [snapshot, setSnapshot] = React.useState<HomeSnapshot | null | undefined>(
    undefined
  );

  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem(HOME_SNAPSHOT_KEY);
      setSnapshot(raw ? (JSON.parse(raw) as HomeSnapshot) : null);
    } catch {
      setSnapshot(null);
    }
  }, []);

  if (snapshot === undefined) {
    return (
      <div className="flex flex-col gap-2" role="status">
        <div className="shimmer h-4 w-40 rounded bg-muted" aria-hidden="true" />
        <p className="sr-only">Loading your home...</p>
      </div>
    );
  }

  if (!snapshot?.profile) {
    return (
      <div className="flex w-full max-w-md flex-col items-center gap-4 text-center">
        <h1 className="font-display text-2xl font-normal tracking-tight">
          Welcome to your home
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {snapshot?.note ??
            "No Explorer Profile yet. Finish onboarding and Lory will put one together here."}
        </p>
        <Button asChild variant="outline">
          <Link href="/onboarding">Go to onboarding</Link>
        </Button>
        <LogOutButton />
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-md flex-col gap-4 text-left">
      <h1 className="font-display text-2xl font-normal tracking-tight">
        Lory&apos;s read on you (AI-generated)
      </h1>
      <StudentProfile
        profile={snapshot.profile}
        program={snapshot.program}
        yearLevelLabel={snapshot.yearLevel}
        interests={snapshot.interests}
        modelLabel={snapshot.model}
      />
      {snapshot.dev ? (
        <p className="text-xs text-muted-foreground">
          Dev preview — saved on this device. Signed-in persistence arrives
          with real auth.
        </p>
      ) : null}
      <LogOutButton />
    </div>
  );
}

/** Signs out via the server action, then returns to the landing page. */
function LogOutButton() {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleLogOut = async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);
    setError(null);
    const result = await logOut();
    if (result.ok) {
      router.replace("/");
      return;
    }
    setIsSigningOut(false);
    setError(result.message);
  };

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        variant="outline"
        onClick={() => void handleLogOut()}
        disabled={isSigningOut}
      >
        {isSigningOut ? (
          <Loader2
            data-icon="inline-start"
            className="animate-spin"
            aria-hidden="true"
          />
        ) : (
          <LogOut data-icon="inline-start" aria-hidden="true" />
        )}
        {isSigningOut ? "Signing out..." : "Log out"}
      </Button>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
