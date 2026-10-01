"use server";

/**
 * Authentication service — Supabase Auth, email + password only.
 *
 * The UI (`components/auth/*`) calls `signUp` / `logIn` / `logOut` and never
 * talks to a provider directly; these server actions keep the provider-agnostic
 * `AuthResult` contract so the forms, drawer and routing do not change.
 *
 * Rules kept here:
 * - Raw Supabase errors never leave this file: they are mapped to friendly
 *   copy, and nothing (passwords, tokens, provider text) is ever logged.
 * - Log In never reveals whether an email exists — wrong password and
 *   unknown address return the identical message.
 * - After a successful attempt the server records where the student should
 *   land (see `POST_AUTH_DEST_COOKIE`): onboarding is not yet recorded as
 *   complete → /onboarding, even if `?next=` pointed at /home.
 *
 * Sign-up metadata key: the `on_auth_user_created` trigger reads
 * `raw_user_meta_data ->> 'full_name'` first (then `name`, then the email
 * local part) to satisfy the required `profiles.display_name`, so exactly
 * `full_name` is passed. The sign-up form requires a name; the email local
 * part is only a defensive fallback.
 */

import { cookies } from "next/headers";

import { createClient } from "@/lib/supabase/server";
import {
  ONBOARDED_COOKIE,
  POST_AUTH_DEST_COOKIE,
  POST_SIGN_UP_ROUTE,
} from "./routes";
import type { AuthResult, LogInValues, SignUpValues } from "./types";

/* ------------------------------------------------------------------ *
 * Friendly messages (UI voice — plain, sentence case, no provider text)
 * ------------------------------------------------------------------ */

const MESSAGES = {
  confirmationEnabled:
    "Email confirmation is still enabled in Supabase — turn off “Confirm email” in the dashboard (Authentication → Sign In / Providers → Email), then try again.",
  emailInUse:
    "That email already has an account. Try logging in instead.",
  invalidEmail:
    "That email address can't be used here — try a different one.",
  weakPassword:
    "That password is too easy to guess. Use at least 8 characters.",
  rateLimit:
    "Too many attempts. Wait about a minute, then try again.",
  network: "Can't reach Ka-Lakbay right now. Check your connection and try again.",
  signUpFailed: "Something went wrong while creating your account. Try again.",
  invalidCredentials:
    "That email and password combination didn't work. Check them and try again.",
  logInFailed: "Something went wrong while signing you in. Try again.",
  logOutFailed: "Couldn't sign you out just now. Try again.",
} as const;

/* ------------------------------------------------------------------ *
 * Error classification — status/code only; `message` is used solely to
 * classify and is never returned to the caller.
 * ------------------------------------------------------------------ */

type AuthFailure =
  | "confirmation"
  | "email_in_use"
  | "invalid_email"
  | "weak_password"
  | "rate_limit"
  | "network"
  | "invalid_credentials"
  | "other";

interface LooseAuthError {
  name?: string;
  message?: string;
  status?: number;
  code?: string;
}

function classify(error: unknown): AuthFailure {
  const e = (error ?? {}) as LooseAuthError;
  const status = e.status ?? 0;
  const code = e.code ?? "";
  const message = e.message ?? "";

  if (e.name === "AuthRetryableFetchError" || status === 0 || /fetch|network/i.test(message)) {
    return "network";
  }
  if (status === 429 || /rate.?limit/i.test(code) || /rate limit/i.test(message)) {
    return "rate_limit";
  }
  if (code === "user_already_exists" || code === "email_exists" || /already (been )?registered/i.test(message)) {
    return "email_in_use";
  }
  // The project's email rules rejected the address (e.g. a domain it does
  // not accept) even though the client-side format check passed.
  if (code === "email_address_invalid" || /email address .* is invalid/i.test(message)) {
    return "invalid_email";
  }
  if (code === "weak_password" || (/password/i.test(message) && /least|weak|strong/i.test(message))) {
    return "weak_password";
  }
  if (code === "invalid_credentials" || /invalid login credentials/i.test(message)) {
    return "invalid_credentials";
  }
  // Deliberate: an unconfirmed email would reveal that the address exists.
  // Log In must not, so it folds into the same neutral message; the
  // confirmation misconfiguration is surfaced loudly by signUp instead.
  if (code === "email_not_confirmed") {
    return "invalid_credentials";
  }
  return "other";
}

/* ------------------------------------------------------------------ *
 * Post-auth destination cookie (server decision read by postAuthRoute)
 * ------------------------------------------------------------------ */

async function setPostAuthDestination(path: string): Promise<void> {
  const store = await cookies();
  // Raw path: Next's cookie layer percent-encodes the value on the wire,
  // and postAuthRoute decodes once when reading. Pre-encoding here would
  // double-encode and fail validation on read.
  store.set(POST_AUTH_DEST_COOKIE, path, {
    path: "/",
    maxAge: 180,
    sameSite: "lax",
    httpOnly: false, // read by postAuthRoute() in the form; holds a path only
  });
}

async function clearPostAuthDestination(): Promise<void> {
  const store = await cookies();
  store.delete(POST_AUTH_DEST_COOKIE);
}

/** Defensive fallback: the trigger falls back to the email local part too. */
function displayNameFor(values: SignUpValues): string {
  const name = values.fullName.trim();
  if (name) return name;
  return values.email.split("@")[0] || "student";
}

/* ------------------------------------------------------------------ *
 * Sign Up
 * ------------------------------------------------------------------ */

export async function signUp(values: SignUpValues): Promise<AuthResult> {
  const email = values.email.trim();
  const displayName = displayNameFor(values);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password: values.password,
    options: { data: { full_name: displayName } },
  });

  if (error) {
    switch (classify(error)) {
      case "email_in_use":
        return { ok: false, code: "email_in_use", message: MESSAGES.emailInUse };
      case "invalid_email":
        return { ok: false, code: "unknown", message: MESSAGES.invalidEmail };
      case "rate_limit":
        return { ok: false, code: "unknown", message: MESSAGES.rateLimit };
      case "network":
        return { ok: false, code: "unknown", message: MESSAGES.network };
      case "weak_password":
        return { ok: false, code: "unknown", message: MESSAGES.weakPassword };
      default:
        return { ok: false, code: "unknown", message: MESSAGES.signUpFailed };
    }
  }

  // `session === null` means Supabase created (or found) the user but did not
  // sign them in — with a fresh project that is always email confirmation
  // still being enabled. Say so instead of pretending the sign-up worked.
  if (!data.session) {
    return { ok: false, code: "not_configured", message: MESSAGES.confirmationEnabled };
  }

  // A brand-new student always needs onboarding first, whatever `?next=` says.
  await setPostAuthDestination(POST_SIGN_UP_ROUTE);
  return { ok: true };
}

/* ------------------------------------------------------------------ *
 * Log In
 * ------------------------------------------------------------------ */

export async function logIn(values: LogInValues): Promise<AuthResult> {
  const email = values.email.trim();

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: values.password,
  });

  if (error) {
    switch (classify(error)) {
      case "invalid_credentials":
        return { ok: false, code: "invalid_credentials", message: MESSAGES.invalidCredentials };
      case "rate_limit":
        return { ok: false, code: "unknown", message: MESSAGES.rateLimit };
      case "network":
        return { ok: false, code: "unknown", message: MESSAGES.network };
      default:
        return { ok: false, code: "unknown", message: MESSAGES.logInFailed };
    }
  }

  const userId = data.user?.id;
  const completed = userId ? await hasCompletedOnboarding(supabase, userId) : false;

  // The forms keep pushing postAuthRoute() — record this attempt's decision
  // there: incomplete onboarding sends the student to /onboarding instead of
  // /home (a stale override from an earlier attempt is cleared when complete).
  if (completed) {
    await clearPostAuthDestination();
  } else {
    await setPostAuthDestination(POST_SIGN_UP_ROUTE);
  }

  return { ok: true };
}

/**
 * Onboarding completion, checked server-side at login:
 * - `profiles.onboarding_completed` — the durable flag. It is service-role-
 *   only in the database, so it flips only when `SUPABASE_SERVICE_ROLE_KEY`
 *   is configured; otherwise it stays false and every login re-enters
 *   onboarding (honest, per the database's intent).
 * - the `ONBOARDED_COOKIE` set by /api/profiler after the Explorer Profile
 *   was actually generated for this user id on this device.
 *
 * A failed profile read is treated as "not completed" so the student is
 * never sent to a dashboard built on unprocessed input.
 */
async function hasCompletedOnboarding(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<boolean> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed")
    .eq("id", userId)
    .maybeSingle();

  if (profile?.onboarding_completed === true) return true;

  try {
    const store = await cookies();
    return store.get(ONBOARDED_COOKIE)?.value === userId;
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ *
 * Log Out
 * ------------------------------------------------------------------ */

export async function logOut(): Promise<AuthResult> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut();
    if (error) {
      return { ok: false, code: "unknown", message: MESSAGES.logOutFailed };
    }
    return { ok: true };
  } catch {
    // Includes the case where no session cookie exists at all — from the
    // student's point of view they are signed out either way.
    return { ok: true };
  }
}
