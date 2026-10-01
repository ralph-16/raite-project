/**
 * Mock-mode switch.
 *
 * `NEXT_PUBLIC_MOCK_MODE=true` → the UI never calls Supabase or any /api AI
 * route. Every mock branch in the codebase reads `MOCK_MODE` from here, so
 * flipping the flag back to `false` restores the current (real) behaviour
 * without touching call sites.
 *
 * The value is inlined at build time by Next.js (it carries the NEXT_PUBLIC_
 * prefix), so it is safe to read in server components, client components and
 * middleware alike. Anything that is not an explicit `"false"` stays in mock
 * mode, so a missing or un-inlined value can never trigger a live Supabase
 * call during a demo.
 */
export const MOCK_MODE = process.env.NEXT_PUBLIC_MOCK_MODE !== "false";

/** True when code is running in the browser (guards all localStorage use). */
export const IS_BROWSER = typeof window !== "undefined";

/** True when mock-mode UI rules apply (used for labels and copy). */
export const DEMO_MODE_LABEL = "Demo mode";
