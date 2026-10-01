/**
 * Default demo content for a mock account.
 *
 * Two entry points:
 * - `seedDemoData()` — brand-new email with no onboarding at all: writes a
 *   believable, fully-answered run so /home is never an empty box in a demo.
 * - `ensureHomeData()` — called on every mock log in: marks onboarding done
 *   and rebuilds profile/matches from whatever answers exist (seeding only
 *   when there are none).
 *
 * Everything here goes through `lib/mock/storage.ts`, and every figure it
 * produces is shown as sample data in the UI.
 */

import type { ScoringInput } from "./scoring";
import { buildLorySummary, scoreCareers, toMatches, topCategory, topInterests } from "./scoring";
import {
  loadMatches,
  loadOnboarding,
  loadProfile,
  saveMatches,
  saveOnboarding,
  saveProfile,
} from "./storage";
import type { OnboardingState, QuestionAnswer } from "./types";

/** A believable, fully-answered run — deliberately different from "skip all". */
const DEMO_ANSWERS: Record<string, QuestionAnswer> = {
  "free-time": { selected: ["code-small", "sketch"] },
  "working-style": { selected: ["mixed"] },
  "problem-style": { selected: ["build"] },
  numbers: { value: 3 },
  tools: { value: 4 },
  "job-matters": { selected: ["growth", "creativity"] },
  "weekly-time": { selected: ["steady"] },
  experience: { selected: ["small-projects"] },
};

const DEMO_DESIRED_CAREER = "Software Developer";

function now(): string {
  return new Date().toISOString();
}

function inputFrom(onboarding: OnboardingState): ScoringInput {
  return {
    answers: onboarding.answers,
    resumeSkills: onboarding.resume?.skills ?? [],
    desiredCareer: onboarding.desiredCareer,
  };
}

/** Full default seed: onboarding + profile + matches, in one pass. */
export function seedDemoData(email: string, displayName: string): void {
  const onboarding: OnboardingState = {
    step: 0,
    completed: true,
    desiredCareer: DEMO_DESIRED_CAREER,
    resume: null,
    answers: DEMO_ANSWERS,
    skipped: [],
    updatedAt: now(),
  };
  const input = inputFrom(onboarding);

  saveOnboarding(onboarding);
  saveProfile({
    displayName,
    email,
    desiredCareer: DEMO_DESIRED_CAREER,
    resumeSkills: [],
    interests: topInterests(input, 6),
    topCategory: topCategory(input),
    lorySummary: buildLorySummary(input),
    onboardingCompleted: true,
    updatedAt: now(),
  });
  saveMatches(toMatches(scoreCareers(input)));
}

/**
 * Mock log in: onboarding counts as done, and the profile + matches needed
 * by /home exist by the time it renders.
 */
export function ensureHomeData(email: string, displayName: string): void {
  const onboarding = loadOnboarding();
  if (!onboarding) {
    seedDemoData(email, displayName);
    return;
  }

  const completed: OnboardingState = {
    ...onboarding,
    completed: true,
    updatedAt: now(),
  };
  saveOnboarding(completed);

  const input = inputFrom(completed);
  const existingProfile = loadProfile();
  if (!existingProfile) {
    saveProfile({
      displayName,
      email,
      desiredCareer: completed.desiredCareer,
      resumeSkills: input.resumeSkills,
      interests: topInterests(input, 6),
      topCategory: topCategory(input),
      lorySummary: buildLorySummary(input),
      onboardingCompleted: true,
      updatedAt: now(),
    });
  } else if (!existingProfile.onboardingCompleted) {
    saveProfile({ ...existingProfile, onboardingCompleted: true, updatedAt: now() });
  }

  if (!loadMatches().length) {
    saveMatches(toMatches(scoreCareers(input)));
  }
}
