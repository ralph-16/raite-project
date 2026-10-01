import { Navbar } from "@/components/navbar";
import { HeroSection } from "@/components/hero-section";
import { HowItWorks } from "@/components/how-it-works";
import { Features } from "@/components/features";
import { CareerExploration } from "@/components/career-exploration";
import { LearningStructure } from "@/components/learning-structure";
import { ProofBasedLearning } from "@/components/proof-based-learning";
import { KaLakbayIntroduction } from "@/components/ka-lakbay-introduction";
import { CTASection } from "@/components/cta-section";
import { Footer } from "@/components/footer";
import { AuthDrawerProvider } from "@/components/auth/auth-drawer-provider";

export default function Home() {
  return (
    // The provider owns the authentication drawer so the landing page stays
    // mounted underneath it — opening the drawer never resets page state.
    <AuthDrawerProvider>
      <Navbar />
      <main>
        <HeroSection />
        <HowItWorks />
        <Features />
        <CareerExploration />
        <LearningStructure />
        <ProofBasedLearning />
        <KaLakbayIntroduction />
        <CTASection />
      </main>
      <Footer />
    </AuthDrawerProvider>
  );
}
