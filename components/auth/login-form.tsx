"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { logIn } from "@/lib/auth/actions";
import { postAuthRoute } from "@/lib/auth/routes";
import type { FieldErrors, LogInValues } from "@/lib/auth/types";
import {
  hasErrors,
  validateLogIn,
  validateLogInField,
  withFieldError,
} from "@/lib/auth/validation";
import { FormField } from "./form-field";

const INITIAL_VALUES: LogInValues = { email: "", password: "" };

const FIELD_ORDER: (keyof LogInValues)[] = ["email", "password"];

export function LogInForm() {
  const router = useRouter();
  const [values, setValues] = React.useState<LogInValues>(INITIAL_VALUES);
  const [errors, setErrors] = React.useState<FieldErrors<LogInValues>>({});
  const [formError, setFormError] = React.useState<string | null>(null);
  const [resetNote, setResetNote] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const fieldRefs = React.useRef<
    Partial<Record<keyof LogInValues, HTMLInputElement | null>>
  >({});

  const updateField = (key: keyof LogInValues, value: string) => {
    const nextValues = { ...values, [key]: value };
    setValues(nextValues);
    if (errors[key]) {
      setErrors((prev) =>
        withFieldError(prev, key, validateLogInField(key, nextValues))
      );
    }
  };

  const touchField = (key: keyof LogInValues) => {
    setErrors((prev) => withFieldError(prev, key, validateLogInField(key, values)));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    const nextErrors = validateLogIn(values);
    setErrors(nextErrors);

    if (hasErrors(nextErrors)) {
      const firstInvalid = FIELD_ORDER.find((key) => nextErrors[key]);
      if (firstInvalid) fieldRefs.current[firstInvalid]?.focus();
      return;
    }

    setFormError(null);
    setIsSubmitting(true);
    const result = await logIn(values);
    setIsSubmitting(false);

    if (result.ok) {
      // Intended destination: /home (or a preserved `?next=` target).
      router.push(postAuthRoute("login"));
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
        id="login-email"
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

      <div className="flex flex-col gap-2">
        <FormField
          id="login-password"
          label="Password"
          type="password"
          autoComplete="current-password"
          required
          value={values.password}
          error={errors.password}
          onChange={(event) => updateField("password", event.target.value)}
          onBlur={() => touchField("password")}
          ref={(node) => {
            fieldRefs.current.password = node;
          }}
        />

        <div className="flex justify-end">
          <Button
            type="button"
            variant="link"
            size="sm"
            className="h-auto px-0"
            onClick={() =>
              setResetNote(
                "Password reset isn't available yet — it's coming soon."
              )
            }
          >
            Forgot password?
          </Button>
        </div>

        {resetNote && (
          <p role="status" className="text-xs text-muted-foreground">
            {resetNote}
          </p>
        )}
      </div>

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
        {isSubmitting ? "Logging in..." : "Log In"}
      </Button>
    </form>
  );
}
