import { Navbar } from "@/components/navbar";
import { HeroSection } from "@/components/hero-section";
import { Features } from "@/components/features";
import { CareerExploration } from "@/components/career-exploration";
import { HowItWorks } from "@/components/how-it-works";
import { LearningStructure } from "@/components/learning-structure";
import { ProofBasedLearning } from "@/components/proof-based-learning";
import { KaLakbayIntroduction } from "@/components/ka-lakbay-introduction";
import { CTASection } from "@/components/cta-section";
import { Footer } from "@/components/footer";
import { AuthDrawerProvider } from "@/components/auth/auth-drawer-provider";

/**
 * Landing page — one connected narrative (AGENTS §12), in chapter order:
 *
 *   POSSIBILITY (hero) → THE PROBLEM (#problem) → UNCERTAINTY
 *   (#uncertainty, the Velvet Cherry block) → THE LOOP (#how-it-works)
 *   → LEARN·TRY·PROVE (#learn, the highlight block) → PROOF (#proof)
 *   → WHAT AI DOES (#about) → START (inverted closing chapter)
 *
 * Section ids are what the navbar, footer and hero scroll links target, so
 * keep them in sync when reordering.
 */
export default function Home() {
  return (
    // The provider owns the authentication drawer so the landing page stays
    // mounted underneath it — opening the drawer never resets page state.
    <AuthDrawerProvider>
      <Navbar />
      <main>
        <HeroSection />
        <Features />
        <CareerExploration />
        <HowItWorks />
        <LearningStructure />
        <ProofBasedLearning />
        <KaLakbayIntroduction />
        <CTASection />
      </main>
      <Footer />
    </AuthDrawerProvider>
  );
}
