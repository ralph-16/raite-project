/**
 * Shared application constants.
 *
 * The route list below is the single source of truth for "requires a signed-in
 * student". It is imported by the server gate (`lib/supabase/middleware.ts`)
 * and the client-side mock-mode guard (`components/mock-guard.tsx`) so the two
 * can never drift: flipping `NEXT_PUBLIC_MOCK_MODE` must not change *which*
 * pages are protected — only *where* the check happens.
 */

/**
 * Route prefixes that require an authenticated student.
 *
 * The marketing site (`/`), the auth drawer (`/?auth=...`) and `/auth/*` stay
 * public. Register new protected areas here as they are built.
 */
export const PROTECTED_PREFIXES = [
  "/home",
  "/onboarding",
  "/profile",
  "/settings",
  "/roadmap",
] as const;

/**
 * True when `pathname` is exactly a protected prefix or lives under it.
 *
 * Prefix-based, not substring-based: `/home` protects `/home` and
 * `/home/edit`, but not `/homestead`.
 */
export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}
