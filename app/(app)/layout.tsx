import { AppNav } from "@/components/app-nav";
import { MockGuard } from "@/components/mock-guard";

/**
 * Shell for every signed-in page: the top navigation plus the route guard.
 *
 * Pages provide their own container and vertical rhythm — this layout only
 * owns the chrome, so the roadmap canvas can still go full-bleed.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <MockGuard>
      <AppNav />
      {children}
    </MockGuard>
  );
}
