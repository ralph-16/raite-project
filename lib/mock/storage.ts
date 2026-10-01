/**
 * The ONE module allowed to touch localStorage in mock mode.
 *
 * Rules:
 * - SSR-safe: every read returns a typed fallback when `window` is missing,
 *   so it is safe to call on the server — but components must still read in
 *   an effect, never during render, to avoid hydration mismatches.
 * - Versioned: values are stored as `{ v, data }`. An unknown version is
 *   treated as "no data" and dropped on the next write, so a shape change
 *   never crashes the demo.
 * - Validated: reads run through Zod; a corrupt or hand-edited value falls
 *   back to the default instead of half-rendering.
 * - Keys are exactly the ones in the task spec (`kl.*`).
 */

import { z } from "zod";

import { IS_BROWSER } from "./flags";
import type {
  Match,
  MockProfile,
  MockSession,
  MockUser,
  OnboardingState,
  RoadmapProgress,
  ThemeMode,
} from "./types";
import {
  matchListSchema,
  mockProfileSchema,
  mockSessionSchema,
  mockUserSchema,
  onboardingStateSchema,
  roadmapProgressSchema,
  themeSchema,
} from "./schemas";

/* ------------------------------------------------------------------ *
 * Keys + envelope
 * ------------------------------------------------------------------ */

export const STORAGE_VERSION = 1;

export const STORAGE_KEYS = {
  users: "kl.users",
  session: "kl.session",
  onboarding: "kl.onboarding",
  profile: "kl.profile",
  matches: "kl.matches",
  bookmarks: "kl.bookmarks",
  progress: (careerSlug: string): string => `kl.progress.${careerSlug}`,
  theme: "kl.theme",
} as const;

/** Prefix used by `resetDemoData()` to sweep every demo key. */
const DEMO_PREFIX = "kl.";
/** Not demo data — survives a reset so the student's theme choice stays. */
const KEEP_ON_RESET = new Set<string>([STORAGE_KEYS.theme]);

interface Envelope<T> {
  v: number;
  data: T;
}

function store(): Storage | null {
  if (!IS_BROWSER) return null;
  try {
    return window.localStorage;
  } catch {
    // Private mode / blocked storage: the demo still runs, it just does not
    // persist between reloads.
    return null;
  }
}

function readEnvelope<T>(
  key: string,
  schema: z.ZodType<T>,
  fallback: T
): T {
  const local = store();
  if (!local) return fallback;
  let raw: string | null = null;
  try {
    raw = local.getItem(key);
  } catch {
    return fallback;
  }
  if (!raw) return fallback;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !("v" in parsed) ||
      !("data" in parsed)
    ) {
      return fallback;
    }
    const envelope = parsed as Envelope<unknown>;
    if (envelope.v !== STORAGE_VERSION) return fallback;
    const result = schema.safeParse(envelope.data);
    return result.success ? result.data : fallback;
  } catch {
    return fallback;
  }
}

function writeEnvelope<T>(key: string, data: T): void {
  const local = store();
  if (!local) return;
  try {
    const envelope: Envelope<T> = { v: STORAGE_VERSION, data };
    local.setItem(key, JSON.stringify(envelope));
  } catch {
    /* quota or blocked storage — nothing to do in a demo */
  }
}

function removeKey(key: string): void {
  const local = store();
  if (!local) return;
  try {
    local.removeItem(key);
  } catch {
    /* ignore */
  }
}

/* ------------------------------------------------------------------ *
 * Users + session  (`kl.users`, `kl.session`)
 * ------------------------------------------------------------------ */

export function loadUsers(): MockUser[] {
  return readEnvelope(STORAGE_KEYS.users, mockUserSchema.array(), []);
}

export function saveUsers(users: MockUser[]): void {
  writeEnvelope(STORAGE_KEYS.users, users);
}

export function loadSession(): MockSession | null {
  return readEnvelope(STORAGE_KEYS.session, mockSessionSchema, null);
}

export function saveSession(session: MockSession): void {
  writeEnvelope(STORAGE_KEYS.session, session);
}

export function clearSession(): void {
  removeKey(STORAGE_KEYS.session);
}

/* ------------------------------------------------------------------ *
 * Onboarding  (`kl.onboarding`)
 * ------------------------------------------------------------------ */

export function loadOnboarding(): OnboardingState | null {
  return readEnvelope(STORAGE_KEYS.onboarding, onboardingStateSchema, null);
}

export function saveOnboarding(state: OnboardingState): void {
  writeEnvelope(STORAGE_KEYS.onboarding, state);
}

/* ------------------------------------------------------------------ *
 * Profile  (`kl.profile`)
 * ------------------------------------------------------------------ */

export function loadProfile(): MockProfile | null {
  return readEnvelope(STORAGE_KEYS.profile, mockProfileSchema, null);
}

export function saveProfile(profile: MockProfile): void {
  writeEnvelope(STORAGE_KEYS.profile, profile);
}

/* ------------------------------------------------------------------ *
 * Matches  (`kl.matches`)
 * ------------------------------------------------------------------ */

export function loadMatches(): Match[] {
  return readEnvelope(STORAGE_KEYS.matches, matchListSchema, []);
}

export function saveMatches(matches: Match[]): void {
  writeEnvelope(STORAGE_KEYS.matches, matches);
}

/* ------------------------------------------------------------------ *
 * Bookmarks  (`kl.bookmarks`)
 * ------------------------------------------------------------------ */

export function loadBookmarks(): string[] {
  return readEnvelope(STORAGE_KEYS.bookmarks, z.array(z.string()), []);
}

export function saveBookmarks(slugs: string[]): void {
  writeEnvelope(STORAGE_KEYS.bookmarks, slugs);
}

/** Adds the slug when absent, removes it when present. Returns the new list. */
export function toggleBookmark(slug: string): string[] {
  const current = loadBookmarks();
  const next = current.includes(slug)
    ? current.filter((item) => item !== slug)
    : [...current, slug];
  saveBookmarks(next);
  return next;
}

/* ------------------------------------------------------------------ *
 * Roadmap progress  (`kl.progress.<slug>`)
 * ------------------------------------------------------------------ */

const EMPTY_PROGRESS: RoadmapProgress = { nodes: {}, updatedAt: "" };

export function loadProgress(careerSlug: string): RoadmapProgress {
  return readEnvelope(
    STORAGE_KEYS.progress(careerSlug),
    roadmapProgressSchema,
    EMPTY_PROGRESS
  );
}

export function saveProgress(
  careerSlug: string,
  progress: RoadmapProgress
): void {
  writeEnvelope(STORAGE_KEYS.progress(careerSlug), progress);
}

/* ------------------------------------------------------------------ *
 * Theme  (`kl.theme`)
 * ------------------------------------------------------------------ */

export function loadTheme(): ThemeMode | null {
  const local = store();
  if (!local) return null;
  try {
    const raw = local.getItem(STORAGE_KEYS.theme);
    if (!raw) return null;
    const result = themeSchema.safeParse(raw);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

export function saveTheme(theme: ThemeMode): void {
  const local = store();
  if (!local) return;
  try {
    local.setItem(STORAGE_KEYS.theme, theme);
  } catch {
    /* ignore */
  }
}

/* ------------------------------------------------------------------ *
 * Reset  (`resetDemoData()`)
 * ------------------------------------------------------------------ *
 * Wipes every `kl.*` demo key (users, session, onboarding, profile,
 * matches, bookmarks, progress) and keeps the theme. Safe to call in the
 * browser; a no-op on the server.
 */
export function resetDemoData(): void {
  const local = store();
  if (!local) return;
  try {
    const doomed: string[] = [];
    for (let index = 0; index < local.length; index += 1) {
      const key = local.key(index);
      if (key && key.startsWith(DEMO_PREFIX) && !KEEP_ON_RESET.has(key)) {
        doomed.push(key);
      }
    }
    for (const key of doomed) local.removeItem(key);
  } catch {
    /* ignore */
  }
}

/**
 * Clears the student's demo content (onboarding, profile, matches,
 * bookmarks, roadmap progress) while keeping the account book, the current
 * session and the theme. Used when a *new* email signs up, so that account
 * starts its own run.
 */
export function clearDemoContent(): void {
  const local = store();
  if (!local) return;
  try {
    const doomed: string[] = [];
    for (let index = 0; index < local.length; index += 1) {
      const key = local.key(index);
      if (!key) continue;
      if (
        key === STORAGE_KEYS.onboarding ||
        key === STORAGE_KEYS.profile ||
        key === STORAGE_KEYS.matches ||
        key === STORAGE_KEYS.bookmarks ||
        key.startsWith(`${DEMO_PREFIX}progress.`)
      ) {
        doomed.push(key);
      }
    }
    for (const key of doomed) local.removeItem(key);
  } catch {
    /* ignore */
  }
}
