/**
 * Mock authentication — client-side, localStorage only.
 *
 * Wraps the real service (`lib/auth/actions.ts`): the forms call these when
 * `MOCK_MODE` is on and the server action when it is off, so the `AuthResult`
 * contract, validation rules and copy are identical in both modes.
 *
 * Rules kept here:
 * - Passwords are validated for shape and then thrown away. Never stored.
 * - Any valid credential works — there is no backend to reject it.
 * - No network call happens, ever.
 */

import type { AuthResult, LogInValues, SignUpValues } from "@/lib/auth/types";
import {
  validateEmail,
  validateExistingPassword,
  validateNewPassword,
} from "@/lib/auth/validation";

import { ensureHomeData, seedDemoData } from "./seed";
import {
  clearDemoContent,
  clearSession,
  loadMatches,
  loadOnboarding,
  loadProfile,
  loadSession,
  loadUsers,
  saveSession,
  saveUsers,
} from "./storage";
import type { MockSession, MockUser } from "./types";

function now(): string {
  return new Date().toISOString();
}

function newUserId(): string {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi && "randomUUID" in cryptoApi) return cryptoApi.randomUUID();
  return `mock-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

/** Find or create the local account. The password is not part of this. */
function upsertUser(email: string, displayName: string): { user: MockUser; created: boolean } {
  const users = loadUsers();
  const existing = users.find((user) => user.email === email);
  if (existing) return { user: existing, created: false };
  const user: MockUser = {
    id: newUserId(),
    email,
    displayName,
    createdAt: now(),
  };
  saveUsers([...users, user]);
  return { user, created: true };
}

function startSession(user: MockUser): MockSession {
  const session: MockSession = {
    userId: user.id,
    email: user.email,
    displayName: user.displayName,
    signedInAt: now(),
  };
  saveSession(session);
  return session;
}

/* ------------------------------------------------------------------ *
 * Sign Up
 * ------------------------------------------------------------------ */

export async function mockSignUp(values: SignUpValues): Promise<AuthResult> {
  const email = normalizeEmail(values.email);

  const emailError = validateEmail(email);
  if (emailError) return { ok: false, code: "unknown", message: emailError };

  const passwordError = validateNewPassword(values.password);
  if (passwordError) return { ok: false, code: "unknown", message: passwordError };

  const displayName =
    values.fullName.trim() || email.split("@")[0] || "student";

  const { user, created } = upsertUser(email, displayName);
  // A new email starts its own run: no onboarding, no profile, no matches.
  if (created) clearDemoContent();
  startSession(user);

  return { ok: true };
}

/* ------------------------------------------------------------------ *
 * Log In
 * ------------------------------------------------------------------ */

export async function mockLogIn(values: LogInValues): Promise<AuthResult> {
  const email = normalizeEmail(values.email);

  const emailError = validateEmail(email);
  if (emailError) return { ok: false, code: "unknown", message: emailError };

  const passwordError = validateExistingPassword(values.password);
  if (passwordError) return { ok: false, code: "unknown", message: passwordError };

  const displayName = email.split("@")[0] || "student";
  const { user, created } = upsertUser(email, displayName);
  startSession(user);

  // A brand-new email gets the seeded demo profile so /home is populated;
  // a returning one gets their own answers, marked as onboarding-complete.
  if (created) {
    seedDemoData(email, user.displayName);
  } else {
    ensureHomeData(email, user.displayName);
  }

  return { ok: true };
}

/* ------------------------------------------------------------------ *
 * Log Out + session reads
 * ------------------------------------------------------------------ */

export async function mockLogOut(): Promise<AuthResult> {
  clearSession();
  return { ok: true };
}

/** Current mock session, or `null`. Read inside an effect, not during render. */
export function readMockSession(): MockSession | null {
  const session = loadSession();
  if (!session) return null;
  // Defensive: a session without its account book is not a session.
  const users = loadUsers();
  return users.some((user) => user.id === session.userId) ? session : null;
}

/** True when this device already has onboarding/profile/matches content. */
export function hasDemoContent(): boolean {
  return Boolean(loadOnboarding() && loadProfile() && loadMatches().length);
}
