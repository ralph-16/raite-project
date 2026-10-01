"use client";

import { Bird } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { AuthMode } from "@/lib/auth/types";
import { LogInForm } from "./login-form";
import { SignUpForm } from "./sign-up-form";

interface AuthDrawerProps {
  /** Controlled open state — the provider owns it, not the Sheet. */
  open: boolean;
  /** Which of the two authentication experiences is showing. */
  mode: AuthMode;
  onOpenChange: (open: boolean) => void;
  /** Sign Up ↔ Log In, switched in place without closing the drawer. */
  onModeChange: (mode: AuthMode) => void;
}

const COPY: Record<AuthMode, { title: string; description: string }> = {
  signup: {
    title: "Create your Ka-Lakbay account",
    description:
      "Start your journey and discover where your skills could take you.",
  },
  login: {
    title: "Welcome back",
    description: "Continue your Ka-Lakbay journey.",
  },
};

/**
 * The authentication layer that opens over the landing page.
 *
 * Presentation only: it renders the header, the mode controls and whichever
 * form the current mode needs. Open/close state lives in `AuthDrawerProvider`
 * and form state lives in the forms themselves.
 */
export function AuthDrawer({
  open,
  mode,
  onOpenChange,
  onModeChange,
}: AuthDrawerProps) {
  const copy = COPY[mode];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        // This Radix version conveys modality by hiding everything outside
        // the dialog; declare it explicitly for assistive technology too.
        aria-modal="true"
        className="flex w-full flex-col gap-6 overflow-y-auto sm:max-w-md"
      >
        {/* Header: mascot, title, supporting message. The built-in Sheet close
            button sits in the top-right corner of this header area. */}
        <SheetHeader className="gap-3 pr-8">
          <div className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
            >
              <Bird />
            </span>
            <span className="text-sm font-medium text-muted-foreground">
              Lory · your Ka-Lakbay guide
            </span>
          </div>
          <SheetTitle className="font-display font-normal text-lg tracking-tight">
            {copy.title}
          </SheetTitle>
          <SheetDescription>{copy.description}</SheetDescription>
        </SheetHeader>

        {/* Authentication mode */}
        <div
          role="group"
          aria-label="Choose how to continue"
          className="grid grid-cols-2 gap-1 rounded-md border border-border p-1"
        >
          <Button
            type="button"
            variant={mode === "signup" ? "default" : "ghost"}
            aria-pressed={mode === "signup"}
            onClick={() => onModeChange("signup")}
          >
            Sign Up
          </Button>
          <Button
            type="button"
            variant={mode === "login" ? "default" : "ghost"}
            aria-pressed={mode === "login"}
            onClick={() => onModeChange("login")}
          >
            Log In
          </Button>
        </div>

        {/* Form */}
        {mode === "signup" ? <SignUpForm /> : <LogInForm />}

        {/* Mode switch */}
        <p className="mt-auto text-center text-sm text-muted-foreground">
          {mode === "signup" ? "Already have an account? " : "Don't have an account? "}
          <Button
            type="button"
            variant="link"
            size="sm"
            className="h-auto px-0"
            onClick={() => onModeChange(mode === "signup" ? "login" : "signup")}
          >
            {mode === "signup" ? "Log In" : "Sign Up"}
          </Button>
        </p>
      </SheetContent>
    </Sheet>
  );
}
