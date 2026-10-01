# Onboarding persistence fix — summary, audit, workflow

## 1. Code summary

**Problem:** completing onboarding tried to write `public.profiles.career_aspiration_source`
(and `career_aspiration_set_at`) through the authenticated user's client, which the
database rejects with `403 / 42501`. The column grants + guard triggers reserve those
columns (plus `onboarding_completed`, `onboarding_completed_at`, `ai_context` and its
metadata) for the server. This is by design.

**Fix (safe path, no privilege or RLS changes):** `app/api/profiler/route.ts` →
`persistProfile()` now splits the save:

- User client (student's own session): only user-writable columns —
  `year_level`, `program`, `interests`, `learning_preferences`,
  `career_aspiration`, `career_aspiration_industry`.
- Service-role client: `career_aspiration_source`, `career_aspiration_set_at`,
  `ai_context`, `ai_context_model`, `ai_context_generated_at`,
  `onboarding_completed`, `onboarding_completed_at` — one write, `user_id`
  taken from the verified session (`supabase.auth.getUser()`), never from the
  request body.
- No service key configured → user columns still save; response reports
  `aiContextPersisted: false` with an honest reason instead of faking it.

No migration was added or edited; no RLS policy was touched.

## 2. Audit

| Check | Result |
|---|---|
| `npm run typecheck` | pass |
| `npm run lint` | pass (clean) |
| Sign-up + sign-in (fresh test user, remote Supabase) | ok — session issued, `userId` verified |
| User-client update of allowed columns | ok |
| User-client update of `career_aspiration_source` (old behavior probe) | **403 / 42501** — confirms the boundary is enforced, and the route no longer depends on it |
| `POST /api/profiler` authenticated, mocked onboarding payload | **200**, `persisted: true`, `provider: gemini`, `model: gemini-3.8-flash` |
| Profiles row after route call | user columns written (`year_level`, `program`, `interests`, aspiration); server-only columns `null`/`false` (no service key in `.env.local` — expected, reported honestly) |
| `ONBOARDED_COOKIE` (`kl_onboarded`) | set to the session user id on persisted save |
| `user_id` source | verified session only; request body carries onboarding answers, never an id |

**Findings outside this fix (not changed, flagging only):**

1. `AI_PROVIDER=mock` cannot serve `/api/profiler`: the mock provider echoes
   text and never satisfies the Explorer Profile schema (`parse_failed` → 503).
   Mocked-payload tests need the real provider.
2. `AI_MODEL=gemini-3.5-flash` (`.env.local` default) is over quota (429);
   `AI_MODEL_FALLBACKS=gemini-3.8-flash` is configured but **no fallback logic
   consumes it** in `lib/ai` — the route failed instead of falling back.
   Test was run with `AI_MODEL=gemini-3.8-flash`.
3. `supabase/migrations/20261002000000_grant_profiles_aspiration_source.sql`
   still exists; the route no longer relies on that grant. Leaving the file
   untouched per scope — decide separately whether to keep or supersede it.
4. Test users/rows remain in the remote project (sign-up + profile writes from
   this verification); delete them if the project should stay clean.

## 3. Workflow (onboarding completion)

```
Sign up / Log in (lib/auth/actions.ts)
  → new student: post-auth destination = /onboarding
  → returning student: profiles.onboarding_completed=true  → /home
     (else ONBOARDED_COOKIE=kl_onboarded device fallback → /home,
      otherwise /onboarding)

Onboarding flow (client, mocked or guided answers)
  → POST /api/profiler { onboarding }
  → validate (year level, program, ≥1 interest)
  → runStudentProfiler (Gemini → Zod Explorer Profile)
  → persistProfile split:
       user client      → user-writable profile columns
       service-role key → aspiration source/timestamp, ai_context*,
                          onboarding_completed*  (user_id = session user)
  → persisted → Set-Cookie kl_onboarded=<userId>

Next login: hasCompletedOnboarding sees onboarding_completed=true → /home
```

**To get full completion in an environment:** set `SUPABASE_SERVICE_ROLE_KEY`
(server-side only) and a working `AI_MODEL`. Without the key, the app still
saves the student's own columns and says exactly what is pending — by design.
