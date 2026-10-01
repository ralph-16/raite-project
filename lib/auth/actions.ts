/**
 * Authentication service.
 *
 * The UI (`components/auth/*`) calls `signUp` / `logIn` and never talks to a
 * provider directly, so Supabase Auth can be connected later by replacing the
 * bodies of these two functions — no form or drawer changes required.
 *
 * IMPORTANT: this is a stub. It creates no account, validates no credentials
 * against a backend, and sends nothing anywhere. It reports
 * `code: "not_configured"` so the UI can tell the truth instead of faking a
 * successful sign-up or sign-in.
 *
 * To implement Supabase Auth later:
 *   1. call `supabase.auth.signUp(...)` / `supabase.auth.signInWithPassword(...)`
 *      from `@/lib/supabase/client` (or a server action),
 *   2. map the outcome onto `AuthResult` using a friendly message,
 *   3. delete `SIMULATED_REQUEST_MS` and the `unavailable()` helper below.
 */

import type { AuthResult, LogInValues, SignUpValues } from "./types";

/**
 * Placeholder latency so the submitting state is observable in the UI.
 * Remove this together with `unavailable()` when a real provider is connected.
 */
const SIMULATED_REQUEST_MS = 400;

const NOT_CONFIGURED_MESSAGE =
  "Authentication isn't connected yet — Ka-Lakbay accounts are coming soon. Nothing was submitted.";

async function unavailable(): Promise<AuthResult> {
  await new Promise((resolve) => setTimeout(resolve, SIMULATED_REQUEST_MS));
  return { ok: false, code: "not_configured", message: NOT_CONFIGURED_MESSAGE };
}

export function signUp(_values: SignUpValues): Promise<AuthResult> {
  return unavailable();
}

export function logIn(_values: LogInValues): Promise<AuthResult> {
  return unavailable();
}
