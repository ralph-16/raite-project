/**
 * Shared authentication types.
 *
 * These describe the data exchanged between the authentication UI
 * (`components/auth/*`) and the authentication service (`lib/auth/actions.ts`).
 * They are deliberately provider-agnostic: no Supabase (or any other provider)
 * type appears here, so a provider can be connected later without changing the
 * UI contract.
 */

/** Which authentication experience the drawer is currently showing. */
export type AuthMode = "signup" | "login";

export interface SignUpValues {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface LogInValues {
  email: string;
  password: string;
}

/** Per-field validation messages. Keys with no message are valid. */
export type FieldErrors<T> = Partial<Record<keyof T, string>>;

/**
 * Machine-readable failure reasons. The UI only shows `message`, but `code`
 * lets a future provider map failures to friendlier, more specific copy
 * (e.g. `email_in_use` → "Log in instead").
 */
export type AuthErrorCode =
  | "not_configured"
  | "invalid_credentials"
  | "email_in_use"
  | "unknown";

/** Result of an authentication attempt. Never carries raw provider errors. */
export type AuthResult =
  | { ok: true }
  | { ok: false; code: AuthErrorCode; message: string };
