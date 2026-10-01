/**
 * Onboarding validation.
 *
 * Plain TypeScript — no validation library is configured in this project
 * (same approach as `lib/auth/validation.ts`). Rules live here, never inside
 * individual UI components.
 *
 * Required: year level, program, interests.
 * Optional: career aspiration, experience details, learning preferences, resume.
 * The "I'm Lost" branch never forces a target career.
 */

import type { OnboardingState, OnboardingStepId } from "./types";

export type StepErrors = Record<string, string>;

export function validateStudentInfo(
  state: OnboardingState
): StepErrors {
  const errors: StepErrors = {};
  if (!state.yearLevel) errors.yearLevel = "Select your year level.";
  if (!state.program?.trim()) errors.program = "Enter your program or course.";
  return errors;
}

export function validateInterests(state: OnboardingState): StepErrors {
  const errors: StepErrors = {};
  if (state.interests.length === 0)
    errors.interests = "Select at least one interest, or add your own.";
  return errors;
}

/** Skills, experience, career, learning preferences, and resume are optional. */
export function validateOptionalStep(_state: OnboardingState): StepErrors {
  return {};
}

export function validateStep(
  step: OnboardingStepId,
  state: OnboardingState
): StepErrors {
  switch (step) {
    case "student-info":
      return validateStudentInfo(state);
    case "interests":
      return validateInterests(state);
    default:
      return validateOptionalStep(state);
  }
}

export function hasStepErrors(errors: StepErrors): boolean {
  return Object.values(errors).some(Boolean);
}
