import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

import { isAIError } from "@/lib/ai";
import { ONBOARDED_COOKIE } from "@/lib/auth/routes";
import {
  validateInterests,
  validateStudentInfo,
} from "@/lib/onboarding/validation";
import type { OnboardingState } from "@/lib/onboarding/types";
import { toStructuredResponses } from "@/lib/onboarding/structured-responses";
import { runStudentProfiler } from "@/lib/profiler/profiler";
import type { ProfilerExtraContext } from "@/lib/profiler/prompt";
import { createClient } from "@/lib/supabase/server";

/**
 * Student Profiler endpoint — the first AI vertical slice.
 *
 *   POST { onboarding } → structured context → Gemini → Zod-validated
 *   Explorer Profile → best-effort Supabase persistence.
 *
 * Persistence is honest, never faked:
 * - Signed-in students get the user-writable profile columns updated
 *   through their own session.
 * - `career_aspiration_source`, `career_aspiration_set_at`,
 *   `onboarding_completed` / `onboarding_completed_at` and `profiles.ai_context`
 *   (+ model/timestamp) are service-role-only in the database, so they are
 *   written only when `SUPABASE_SERVICE_ROLE_KEY` is configured server-side
 *   with user_id from the verified session — otherwise `aiContextPersisted:
 *   false` with a reason. No key of any kind is ever returned to the client.
 */

export const dynamic = "force-dynamic";

/**
 * Upper bound for the whole profiler call (generation + retries + one
 * Zod-correction retry + persistence). Typical success is well under this;
 * the bound only matters when the vendor is struggling.
 */
export const maxDuration = 120;

function isOnboardingState(value: unknown): value is OnboardingState {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    Array.isArray(v.interests) &&
    Array.isArray(v.skills) &&
    typeof v.experience === "object" &&
    v.experience !== null &&
    typeof v.careerAspiration === "object" &&
    v.careerAspiration !== null &&
    Array.isArray(v.learningPreferences) &&
    typeof v.resume === "object" &&
    v.resume !== null
  );
}

/**
 * Defensively narrows the optional client `context` blob. Anything the
 * wrong shape can say is dropped — this input only ever enriches the
 * prompt, it never gates the request.
 */
function readExtraContext(value: unknown): ProfilerExtraContext | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  const v = value as Record<string, unknown>;
  const answers = Array.isArray(v.answers)
    ? v.answers
        .filter((a): a is Record<string, unknown> => typeof a === "object" && a !== null)
        .map((a) => ({
          topic: typeof a.topic === "string" ? a.topic.slice(0, 40) : undefined,
          prompt: typeof a.prompt === "string" ? a.prompt.slice(0, 280) : undefined,
          answer: typeof a.answer === "string" ? a.answer.slice(0, 500) : undefined,
          skipped: a.skipped === true,
        }))
        .slice(0, 8)
    : [];
  const resumeSummary =
    typeof v.resumeSummary === "string" && v.resumeSummary.trim()
      ? v.resumeSummary.slice(0, 500)
      : undefined;
  if (answers.length === 0 && !resumeSummary) return undefined;
  return { answers, resumeSummary };
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { status: "error", message: "Request body must be valid JSON." },
      { status: 400 }
    );
  }

  const onboarding =
    typeof body === "object" && body !== null
      ? (body as { onboarding?: unknown }).onboarding
      : undefined;

  // Optional raw guided-flow context (Q&A answers + resume summary).
  const rawContext =
    typeof body === "object" && body !== null
      ? (body as { context?: unknown }).context
      : undefined;
  const context = readExtraContext(rawContext);

  if (!isOnboardingState(onboarding)) {
    return NextResponse.json(
      { status: "error", message: "Missing or invalid onboarding data." },
      { status: 400 }
    );
  }

  const requiredErrors = {
    ...validateStudentInfo(onboarding),
    ...validateInterests(onboarding),
  };
  if (Object.keys(requiredErrors).length > 0) {
    return NextResponse.json(
      {
        status: "error",
        message: "Year level, program, and at least one interest are required.",
        fields: requiredErrors,
      },
      { status: 400 }
    );
  }

  const payload = toStructuredResponses(onboarding);

  try {
    const { profile, model, provider } = await runStudentProfiler(payload, context);
    const persistence = await persistProfile(onboarding, profile, model);

    const response = NextResponse.json({
      status: "ok",
      profile,
      model,
      provider,
      ...persistence,
    });

    // Server-side completion signal: the Explorer Profile was actually
    // generated and saved for this signed-in student. Lets a later login
    // land on /home (profiles.onboarding_completed itself is service-role-
    // only — see lib/auth/routes.ts ONBOARDED_COOKIE).
    if (persistence.persisted && persistence.userId) {
      response.cookies.set(ONBOARDED_COOKIE, persistence.userId, {
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
        sameSite: "lax",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
      });
    }

    return response;
  } catch (error) {
    if (isAIError(error)) {
      // The overload message is written by us (never a vendor string), so it
      // is safe to surface; everything else stays generic.
      const message =
        error.code === "unavailable"
          ? error.message
          : "Lory couldn't put your profile together right now. Try again.";
      return NextResponse.json(
        {
          status: "error",
          code: error.code,
          message,
          retryable: error.retryable,
        },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { status: "error", message: "Something went wrong. Try again." },
      { status: 500 }
    );
  }
}

interface PersistenceOutcome {
  persisted: boolean;
  aiContextPersisted: boolean;
  persistDetail: string | null;
  /** Signed-in student the profile was saved for, if any. */
  userId: string | null;
}

/**
 * Best-effort persistence. User-writable columns go through the student's
 * own session; career_aspiration_source, career_aspiration_set_at,
 * onboarding_completed, onboarding_completed_at and ai_context (+ metadata)
 * require the service role and are skipped (reported, not faked) when no
 * service key is configured. user_id always comes from the verified session.
 */
async function persistProfile(
  state: OnboardingState,
  profile: Record<string, unknown>,
  model: string
): Promise<PersistenceOutcome> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      persisted: false,
      aiContextPersisted: false,
      persistDetail: "not signed in — profile returned without saving",
      userId: null,
    };
  }

  const patch = toStructuredResponses(state).profilePatch;

  // User-writable columns only, through the student's own session.
  // Server-only columns (career_aspiration_source, career_aspiration_set_at,
  // onboarding_completed, onboarding_completed_at, ai_context and its
  // metadata) never go through this client — the database rejects them
  // with 42501 by design, and they are written with the service role below.
  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      year_level: patch.year_level ?? null,
      program: patch.program ?? null,
      interests: patch.interests ?? [],
      learning_preferences: patch.learning_preferences ?? {},
      career_aspiration: patch.career_aspiration,
      career_aspiration_industry: patch.career_aspiration_industry,
    })
    .eq("id", user.id);

  if (profileError) {
    return {
      persisted: false,
      aiContextPersisted: false,
      persistDetail: "profile could not be saved — try again",
      userId: user.id,
    };
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!serviceKey) {
    return {
      persisted: true,
      aiContextPersisted: false,
      persistDetail:
        "basic profile saved; AI context needs server finalization and was not stored yet",
      userId: user.id,
    };
  }

  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey
  );
  // Server-only columns in one write, with user_id taken from the verified
  // session above (never from the request body): the aspiration source and
  // timestamp, the AI context, and the durable completion flag. All are
  // rejected for authenticated users by grants / the
  // profiles_guard_onboarding trigger — service role is the intended path.
  const now = new Date().toISOString();
  const { error: aiError } = await service
    .from("profiles")
    .update({
      career_aspiration_source: patch.career_aspiration_source ?? null,
      career_aspiration_set_at: patch.career_aspiration ? now : null,
      ai_context: profile,
      ai_context_model: model,
      ai_context_generated_at: now,
      onboarding_completed: true,
      onboarding_completed_at: now,
    })
    .eq("id", user.id);

  if (aiError) {
    return {
      persisted: true,
      aiContextPersisted: false,
      persistDetail: "AI context could not be stored — try again",
      userId: user.id,
    };
  }

  return {
    persisted: true,
    aiContextPersisted: true,
    persistDetail: null,
    userId: user.id,
  };
}
