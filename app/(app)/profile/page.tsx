export const metadata = {
  title: "Profile — Ka-Lakbay",
  description: "Your Ka-Lakbay profile.",
};

/**
 * Placeholder until Phase 5 wires it to `kl.profile` (display name, answers
 * in readable form, resume chips, desired career, retake onboarding).
 */
export default function ProfilePage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="font-sans font-bold tracking-tight text-3xl">
        Profile
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Your profile lands here in the next phase of this demo build.
      </p>
    </main>
  );
}
