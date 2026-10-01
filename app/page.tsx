import { Navbar } from "@/components/navbar";
import { HeroSection } from "@/components/hero-section";
import { HowItWorks } from "@/components/how-it-works";
import { Features } from "@/components/features";
import { CTASection } from "@/components/cta-section";
import { Footer } from "@/components/footer";
import { AuthDrawerProvider } from "@/components/auth/auth-drawer-provider";

/**
 * Landing page — deliberately short: nav, hero, how it works, features,
 * final CTA, footer.
 *
 * career-exploration, learning-structure, proof-based-learning and
 * ka-lakbay-introduction still exist in `components/` but are no longer
 * rendered here (drop them back into <main> to restore them).
 */
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
        <CTASection />
      </main>
      <Footer />
    </AuthDrawerProvider>
  );
}
