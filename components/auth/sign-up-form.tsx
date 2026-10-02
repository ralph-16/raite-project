"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { signUp } from "@/lib/auth/actions";
import { postAuthRoute, defaultRouteFor, clearServerDestination } from "@/lib/auth/routes";
import type { FieldErrors, SignUpValues } from "@/lib/auth/types";
import {
  PASSWORD_MIN_LENGTH,
  hasErrors,
  validateSignUp,
  validateSignUpField,
  withFieldError,
} from "@/lib/auth/validation";
import { MOCK_MODE } from "@/lib/mock/flags";
import { mockSignUp } from "@/lib/mock/auth";
import { FormField } from "./form-field";

const INITIAL_VALUES: SignUpValues = {
  fullName: "",
  email: "",
  password: "",
  confirmPassword: "",
};

/** Used to move focus to the first invalid field after a failed submit. */
const FIELD_ORDER: (keyof SignUpValues)[] = [
  "fullName",
  "email",
  "password",
  "confirmPassword",
];

export function SignUpForm() {
  const router = useRouter();
  const [values, setValues] = React.useState<SignUpValues>(INITIAL_VALUES);
  const [errors, setErrors] = React.useState<FieldErrors<SignUpValues>>({});
  const [formError, setFormError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const fieldRefs = React.useRef<
    Partial<Record<keyof SignUpValues, HTMLInputElement | null>>
  >({});

  const updateField = (key: keyof SignUpValues, value: string) => {
    const nextValues = { ...values, [key]: value };
    setValues(nextValues);
    // Once a field has reported a problem, keep validating as the student
    // types so the message clears without another submit.
    if (errors[key]) {
      setErrors((prev) =>
        withFieldError(prev, key, validateSignUpField(key, nextValues))
      );
    }
  };

  const touchField = (key: keyof SignUpValues) => {
    setErrors((prev) =>
      withFieldError(prev, key, validateSignUpField(key, values))
    );
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    const nextErrors = validateSignUp(values);
    setErrors(nextErrors);

    if (hasErrors(nextErrors)) {
      const firstInvalid = FIELD_ORDER.find((key) => nextErrors[key]);
      if (firstInvalid) fieldRefs.current[firstInvalid]?.focus();
      return;
    }

    setFormError(null);
    setIsSubmitting(true);
    // Mock mode never reaches the server action: same AuthResult contract,
    // same validation, no network call.
    const result = MOCK_MODE ? await mockSignUp(values) : await signUp(values);
    setIsSubmitting(false);

    if (result.ok) {
      // Intended destination: /onboarding. Mock mode has no post-auth
      // cookie, so it goes straight to the mode's default route.
      router.push(MOCK_MODE ? defaultRouteFor("signup") : postAuthRoute("signup"));
      if (!MOCK_MODE) clearServerDestination();
      return;
    }
    setFormError(result.message);
  };

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      aria-busy={isSubmitting}
      className="flex flex-col gap-5"
    >
      <FormField
        id="signup-full-name"
        label="Full name"
        type="text"
        autoComplete="name"
        placeholder="Juan Dela Cruz"
        required
        value={values.fullName}
        error={errors.fullName}
        onChange={(event) => updateField("fullName", event.target.value)}
        onBlur={() => touchField("fullName")}
        ref={(node) => {
          fieldRefs.current.fullName = node;
        }}
      />

      <FormField
        id="signup-email"
        label="Email"
        type="email"
        autoComplete="email"
        inputMode="email"
        placeholder="you@example.com"
        required
        value={values.email}
        error={errors.email}
        onChange={(event) => updateField("email", event.target.value)}
        onBlur={() => touchField("email")}
        ref={(node) => {
          fieldRefs.current.email = node;
        }}
      />

      <FormField
        id="signup-password"
        label="Password"
        type="password"
        autoComplete="new-password"
        required
        minLength={PASSWORD_MIN_LENGTH}
        description={`At least ${PASSWORD_MIN_LENGTH} characters.`}
        value={values.password}
        error={errors.password}
        onChange={(event) => updateField("password", event.target.value)}
        onBlur={() => touchField("password")}
        ref={(node) => {
          fieldRefs.current.password = node;
        }}
      />

      <FormField
        id="signup-confirm-password"
        label="Confirm password"
        type="password"
        autoComplete="new-password"
        required
        value={values.confirmPassword}
        error={errors.confirmPassword}
        onChange={(event) => updateField("confirmPassword", event.target.value)}
        onBlur={() => touchField("confirmPassword")}
        ref={(node) => {
          fieldRefs.current.confirmPassword = node;
        }}
      />

      {formError && (
        <div
          role="alert"
          className="rounded-md border border-destructive/40 p-3 text-sm text-destructive"
        >
          {formError}
        </div>
      )}

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting && (
          <Loader2 data-icon="inline-start" className="animate-spin" aria-hidden="true" />
        )}
        {isSubmitting ? "Creating account..." : "Create Account"}
      </Button>
    </form>
  );
}
