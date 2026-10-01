/**
 * Post-authentication routing.
 *
 * These are the intended destinations once a provider is connected:
 *
 *   Sign Up → /onboarding
 *   Log In  → /home
 *
 * Both routes already exist as placeholders, so the redirect target is stable
 * today and no rework is needed when real authentication lands.
 */

import type { AuthMode } from "./types";

export const POST_SIGN_UP_ROUTE = "/onboarding";
export const POST_LOG_IN_ROUTE = "/home";

/** Where an authentication attempt should land, ignoring any `next` hint. */
export function defaultRouteFor(mode: AuthMode): string {
  return mode === "signup" ? POST_SIGN_UP_ROUTE : POST_LOG_IN_ROUTE;
}

/**
 * Same as `defaultRouteFor`, but honours a same-site `?next=` parameter — this
 * is what middleware sets when it bounces an unauthenticated visitor back to
 * the drawer (e.g. `/?auth=login&next=/home`).
 *
 * Cross-origin or protocol-relative values are ignored so a crafted link can
 * never redirect somewhere outside this app.
 */
export function postAuthRoute(mode: AuthMode): string {
  return readSafeNextParam() ?? defaultRouteFor(mode);
}

function readSafeNextParam(): string | null {
  if (typeof window === "undefined") return null;
  const next = new URLSearchParams(window.location.search).get("next");
  if (next && next.startsWith("/") && !next.startsWith("//")) return next;
  return null;
}
