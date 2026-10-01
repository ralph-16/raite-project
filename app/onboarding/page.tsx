import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";

export const metadata = {
  title: "Onboarding — Ka-Lakbay",
  description:
    "Meet Lory and tell us about yourself, your interests, and how you like to learn.",
};

/**
 * Post-signup destination. Structured, resumable flow that collects
 * onboarding state for the future AI Student Profiler — no AI runs here.
 */
export default function OnboardingPage() {
  return <OnboardingFlow />;
}
