/**
 * Post-authentication routing.
 *
 * Intended destinations once authenticated (see `lib/auth/actions.ts`):
 *
 *   Sign Up → /onboarding
 *   Log In  → /home (unless onboarding is still incomplete → /onboarding)
 *
 * The forms keep their existing `postAuthRoute()` push after a successful
 * attempt, so the server's destination decision travels in a short-lived
 * cookie that this module reads first (see `POST_AUTH_DEST_COOKIE`).
 */

import type { AuthMode } from "./types";

export const POST_SIGN_UP_ROUTE = "/onboarding";
export const POST_LOG_IN_ROUTE = "/home";

/**
 * Short-lived cookie carrying the server's post-auth destination override.
 * Set by `signUp` / `logIn` (server actions) after checking whether the
 * student still needs onboarding; read here by `postAuthRoute` in the form's
 * `router.push`. It holds a path — never a credential — and the value is
 * re-validated as a same-origin relative path before use, exactly like
 * `?next=`.
 */
export const POST_AUTH_DEST_COOKIE = "kl_post_auth";

/**
 * Cookie recording that the server finished generating this student's
 * Explorer Profile (set by /api/profiler; value = user id, HttpOnly).
 * `profiles.onboarding_completed` is service-role-only in the database, so
 * until `SUPABASE_SERVICE_ROLE_KEY` is configured this is the server-side
 * completion signal that lets a later login land on /home instead of
 * restarting onboarding. Read server-side only.
 */
export const ONBOARDED_COOKIE = "kl_onboarded";

/** Where an authentication attempt should land, ignoring any `next` hint. */
export function defaultRouteFor(mode: AuthMode): string {
  return mode === "signup" ? POST_SIGN_UP_ROUTE : POST_LOG_IN_ROUTE;
}

/**
 * Destination after a successful attempt, in order of precedence:
 *
 *   1. the server's decision cookie (onboarding gate — a student with no
 *      recorded completion always goes to /onboarding, even with a `?next=`),
 *   2. a preserved `?next=` parameter — this is what middleware sets when it
 *      bounces an unauthenticated visitor back to the drawer
 *      (e.g. `/?auth=login&next=/home`),
 *   3. the mode's default route.
 *
 * Both hints are validated as same-origin relative paths so a crafted link
 * can never redirect somewhere outside this app.
 */
export function postAuthRoute(mode: AuthMode): string {
  return readSafeServerDestination() ?? readSafeNextParam() ?? defaultRouteFor(mode);
}

function readSafeServerDestination(): string | null {
  if (typeof document === "undefined") return null;
  const raw = readCookie(POST_AUTH_DEST_COOKIE);
  if (!raw) return null;
  // The cookie layer percent-encodes on write; accept both a decoded and an
  // encoded read so the value survives either path.
  const candidates = [raw];
  try {
    candidates.push(decodeURIComponent(raw));
  } catch {
    /* raw candidate only */
  }
  for (const candidate of candidates) {
    const path = safeLocalPath(candidate);
    if (path) return path;
  }
  return null;
}

function readSafeNextParam(): string | null {
  if (typeof window === "undefined") return null;
  return safeLocalPath(
    new URLSearchParams(window.location.search).get("next")
  );
}

/**
 * Accepts only same-origin relative paths: must start with a single `/`,
 * no protocol-relative `//`, no backslash (browsers normalize `/\host` to
 * an external URL), and it must resolve to this exact origin.
 */
function safeLocalPath(value: string | null | undefined): string | null {
  if (!value) return null;
  const path = value.trim();
  if (!path.startsWith("/")) return null;
  if (path.startsWith("//") || path.includes("\\")) return null;
  if (typeof window === "undefined") return null;
  try {
    if (new URL(path, window.location.origin).origin !== window.location.origin) {
      return null;
    }
  } catch {
    return null;
  }
  return path;
}

function readCookie(name: string): string | null {
  const prefix = `${name}=`;
  for (const part of document.cookie.split("; ")) {
    if (part.startsWith(prefix)) return part.slice(prefix.length);
  }
  return null;
}
