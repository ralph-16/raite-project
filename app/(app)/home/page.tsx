import { HomeProfile } from "@/components/home-profile";

export const metadata = {
  title: "Home — Ka-Lakbay",
  description: "The Ka-Lakbay student home.",
};

/**
 * Home placeholder. Shows the Explorer Profile snapshot saved at onboarding
 * completion ("Lory's read on you (AI-generated)"). The full dashboard and
 * signed-in reads arrive with real auth.
 */
export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <HomeProfile />
    </main>
  );
}
