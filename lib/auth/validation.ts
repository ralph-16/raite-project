/**
 * Reusable authentication validation.
 *
 * Shared by every authentication form (and available server-side later) so the
 * rules live in exactly one place. Plain TypeScript — no validation library is
 * configured in this project.
 */

import type { FieldErrors, LogInValues, SignUpValues } from "./types";

export const PASSWORD_MIN_LENGTH = 8;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* ------------------------------------------------------------------ *
 * Field validators — return a friendly message, or `undefined` if valid
 * ------------------------------------------------------------------ */

export function validateFullName(value: string): string | undefined {
  if (!value.trim()) return "Enter your full name.";
  return undefined;
}

export function validateEmail(value: string): string | undefined {
  if (!value.trim()) return "Enter your email address.";
  if (!EMAIL_PATTERN.test(value.trim())) return "Enter a valid email address.";
  return undefined;
}

/** Rules applied to a password the student is creating (Sign Up). */
export function validateNewPassword(value: string): string | undefined {
  if (!value) return "Create a password.";
  if (value.length < PASSWORD_MIN_LENGTH) {
    return `Use at least ${PASSWORD_MIN_LENGTH} characters.`;
  }
  return undefined;
}

/** Rules applied to a password the student already has (Log In). */
export function validateExistingPassword(value: string): string | undefined {
  if (!value) return "Enter your password.";
  return undefined;
}

export function validateConfirmPassword(
  password: string,
  confirmPassword: string
): string | undefined {
  if (!confirmPassword) return "Confirm your password.";
  if (password !== confirmPassword) return "Passwords don't match.";
  return undefined;
}

/* ------------------------------------------------------------------ *
 * Per-field dispatch — used for inline validation while typing/on blur
 * ------------------------------------------------------------------ */

export function validateSignUpField(
  key: keyof SignUpValues,
  values: SignUpValues
): string | undefined {
  switch (key) {
    case "fullName":
      return validateFullName(values.fullName);
    case "email":
      return validateEmail(values.email);
    case "password":
      return validateNewPassword(values.password);
    case "confirmPassword":
      return validateConfirmPassword(values.password, values.confirmPassword);
    default:
      return undefined;
  }
}

export function validateLogInField(
  key: keyof LogInValues,
  values: LogInValues
): string | undefined {
  switch (key) {
    case "email":
      return validateEmail(values.email);
    case "password":
      return validateExistingPassword(values.password);
    default:
      return undefined;
  }
}

/* ------------------------------------------------------------------ *
 * Whole-form validation — runs on submit
 * ------------------------------------------------------------------ */

export function validateSignUp(values: SignUpValues): FieldErrors<SignUpValues> {
  const errors: FieldErrors<SignUpValues> = {};
  for (const key of Object.keys(values) as (keyof SignUpValues)[]) {
    const message = validateSignUpField(key, values);
    if (message) errors[key] = message;
  }
  return errors;
}

export function validateLogIn(values: LogInValues): FieldErrors<LogInValues> {
  const errors: FieldErrors<LogInValues> = {};
  for (const key of Object.keys(values) as (keyof LogInValues)[]) {
    const message = validateLogInField(key, values);
    if (message) errors[key] = message;
  }
  return errors;
}

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */

export function hasErrors<T>(errors: FieldErrors<T>): boolean {
  return Object.values(errors).some((message) => Boolean(message));
}

/** Immutably sets or clears a single field's error message. */
export function withFieldError<T>(
  errors: FieldErrors<T>,
  key: keyof T,
  message?: string
): FieldErrors<T> {
  const next = { ...errors };
  if (message) next[key] = message;
  else delete next[key];
  return next;
}
