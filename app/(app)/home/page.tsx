import { MOCK_MODE } from "@/lib/mock/flags";
import { HomeProfile } from "@/components/home-profile";
import { HomeView } from "@/components/home-view";

export const metadata = {
  title: "Home — Ka-Lakbay",
  description: "The Ka-Lakbay student home.",
};

/**
 * Signed-in home. Mock mode renders the self-contained dashboard (localStorage
 * only, labelled sample data). With `NEXT_PUBLIC_MOCK_MODE=false` the original
 * snapshot home is untouched.
 */
export default function HomePage() {
  return MOCK_MODE ? <HomeView /> : <HomeProfile />;
}
