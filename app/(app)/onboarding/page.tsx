import { MOCK_MODE } from "@/lib/mock/flags";
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";
import { OnboardingWizard } from "@/components/onboarding/wizard/onboarding-wizard";

export const metadata = {
  title: "Onboarding — Ka-Lakbay",
  description:
    "Meet Lory and tell us about yourself, your interests, and how you like to learn.",
};

/**
 * Post-signup destination. In mock mode this renders the self-contained
 * wizard (localStorage only, no AI, no network). With
 * `NEXT_PUBLIC_MOCK_MODE=false` the original flow — resume parse API,
 * contextual Q&A, profiler — is untouched.
 */
export default function OnboardingPage() {
  return MOCK_MODE ? <OnboardingWizard /> : <OnboardingFlow />;
}
