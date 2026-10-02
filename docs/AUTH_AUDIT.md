# Auth Audit — Ka-Lakbay (read-only, 2026-10-02)

Scope: Supabase email+password auth only. The audit itself changed no code,
ran no migrations, and ran no live sign-up/sign-in (so no test users were
created by the audit). One read-only `npm run typecheck` was run (see §8).
No secrets are printed below — env vars reported as present/empty/missing only.

**Follow-up (same day, after mock-mode phases landed):** P5, P8, P9, P10 were
fixed in code (see §9); P7 was already fixed by `lib/constants.ts`
`isProtectedPath()`. P1 needs a key from you, P2 needs your decision; P3/P4
remain open. §7 rewritten to describe mock mode as-built.

## 1. Summary

- Auth is **partly working**: sign-up, log-in, session refresh, and neutral error mapping are correctly implemented.
- Top problem 1: `SUPABASE_SERVICE_ROLE_KEY` is **missing** from `.env.local`, so `profiles.onboarding_completed` / `ai_context` never persist; completion falls back to a per-device unsigned cookie.
- Top problem 2: there is **no onboarding gate on `/home`** in middleware or the page — an incomplete user can navigate straight to `/home`.
- Top problem 3: the grant migration `20261002000000_grant_profiles_aspiration_source.sql` widens a column grant the current server-side design no longer needs; keep-or-supersede is undecided.

## 2. Verified working

| Item | Evidence |
|---|---|
| Sign-up passes `full_name` metadata, the key the trigger reads first | `lib/auth/actions.ts:154-158`; trigger `supabase/migrations/20260101000000_initial_schema.sql:403-426` |
| Trigger always satisfies `profiles.display_name NOT NULL` (falls back `full_name` → `name` → email local part → `'student'`) | `20260101000000_initial_schema.sql:410-418` vs `display_name text not null` at `:89` |
| Trigger inserts only `(id, display_name)`; all other NOT NULL profile columns have defaults (`interests`, `learning_preferences`, `ai_context`, `onboarding_completed`, timestamps) | `20260101000000_initial_schema.sql:87-99`; `20260102000000_roadmaps_onboarding_context.sql:182-206` |
| No session after sign-up → loud "Confirm email still enabled" error, not fake success | `lib/auth/actions.ts:180-182` |
| Log-in maps wrong-password, unknown-email, and unconfirmed-email to one identical neutral message | `lib/auth/actions.ts:104-113, 203-213` |
| `?next=` / post-auth cookie validated as same-origin relative path (single `/`, no `//`, no `\`, origin check) | `lib/auth/routes.ts:92-106` |
| Middleware refreshes session via `getClaims()` and bounces unauthenticated `/home`, `/onboarding` to `/?auth=login&next=...` | `lib/supabase/middleware.ts:48-64` |
| `POST /api/profiler` takes `user_id` from verified session (`getUser()`), never the request body; splits user-columns vs service-role-columns | `app/api/profiler/route.ts:204-235, 267-278` |
| Service-role client is constructed only in a server route from a non-`NEXT_PUBLIC_` var; no client bundle imports it | `app/api/profiler/route.ts:2, 246-260`; grep shows no other `createServiceClient` / `SUPABASE_SERVICE_ROLE_KEY` consumer |
| No credentials/tokens/passwords logged; raw provider text never leaves `lib/auth/actions.ts` | `lib/auth/actions.ts:59-114` (comment + `classify` never returns `message`) |
| RLS owner-only policies on `profiles` + column-revoke/grant + `guard_onboarding_completion()` trigger agree that `onboarding_completed*` / `ai_context*` are server-only | `20260102000000_roadmaps_onboarding_context.sql:221-234, 1103-1104, 1252-1285` |
| `/api/*` excluded from middleware matcher, but both auth-touching routes handle identity themselves (profiler: honest not-signed-in; next-question: explicitly optional by design) | `middleware.ts:18`; `app/api/profiler/route.ts:209-216`; `app/api/onboarding/next-question/route.ts:30-38` |
| Env presence (`.env.local`, values never read): `NEXT_PUBLIC_SUPABASE_URL`: present; `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: present; `SUPABASE_SERVICE_ROLE_KEY`: **missing**; `NEXT_PUBLIC_MOCK_MODE`: missing | shell presence check, 2026-10-02 |

## 3. Problems found

| ID | Severity | Area | What is wrong | Evidence | Impact | Suggested fix | Effort |
|---|---|---|---|---|---|---|---|
| P1 | high | onboarding state | Without the service-role key, `onboarding_completed` stays `false` forever; completion is cookie-only, so a returning user on another device or after clearing cookies re-enters onboarding. | `lib/auth/actions.ts:242-260`; `app/api/profiler/route.ts:246-255`; key missing per §2 | Core loop degrades in the current env; honest but incomplete. | Set `SUPABASE_SERVICE_ROLE_KEY` in the server env. | S |
| P2 | medium — **superseded** | grants | `20261002000000_grant_profiles_aspiration_source.sql` granted `UPDATE(career_aspiration_source)` to `authenticated`, but `persistProfile()` writes that column only via the service role. Superseded by `20261003000000_revoke_profiles_aspiration_source.sql` (safe whether or not the grant was ever applied; verified no user-client write of the column exists — only `app/api/profiler/route.ts:270`, service-role). **Not yet applied to any database** — needs `supabase db push`. | `supabase/migrations/20261002000000_grant_profiles_aspiration_source.sql:16-17`; `supabase/migrations/20261003000000_revoke_profiles_aspiration_source.sql` | Divergent intent; future readers will assume the user client needs the grant. | Done (file authored, awaiting push). | S |
| P3 | medium | onboarding state | `kl_onboarded` value is the raw user id, unsigned. Anyone can set `kl_onboarded=<own-id>` manually and `hasCompletedOnboarding()` returns true without ever completing the profiler. | `lib/auth/routes.ts:37`; `app/api/profiler/route.ts:149-155`; `lib/auth/actions.ts:254-256` | Onboarding gate bypassable by the user on themselves (skips to `/home` with no profile). | Sign the cookie value or treat the cookie as a hint confirmed against `profiles`. | M |
| P4 | medium — **fixed** | route protection | No onboarding gate on `/home`. Now fixed: middleware redirects signed-in but incomplete students to `/onboarding` on every protected path except `/onboarding` itself (so no loop). DB flag first, `kl_onboarded` cookie as fallback; refreshed session cookies are preserved on the redirect. One extra PK profile read per protected navigation. | `lib/supabase/middleware.ts` (gate + `hasCompletedOnboarding`) | Gone. | — | — |
| P5 | low | callback | `/auth/callback` concatenates unvalidated `next` into the redirect (`${origin}${next}`); absolute URLs degrade to same-origin paths by accident of string concat, not by validation. | `app/auth/callback/route.ts:8,14` | Fragile; a future refactor (e.g. `new URL(next)`) could turn it into an open redirect. | Validate `next` server-side with the same single-`/` rule before redirecting. | S |
| P6 | low | session | Middleware authenticates with `getClaims()` (JWT signature only, no DB revalidation) while routes use `getUser()`; a revoked/disabled user still passes middleware until token expiry. | `lib/supabase/middleware.ts:48`; `app/api/profiler/route.ts:207` | Standard-template tradeoff; brief window where middleware and routes disagree. | Accept, or re-check `getUser()` on sensitive routes (already done in profiler). | S |
| P7 | low — **fixed** | route protection | `PROTECTED_PREFIXES` used `startsWith`, so `/homeowner` would match. Now fixed: `isProtectedPath()` in `lib/constants.ts` matches exact-or-subpath only, shared by middleware and the mock guard. | (was `lib/supabase/middleware.ts:52`) now `lib/constants.ts:31-34` | Gone. | — | — |
| P8 | low | cookies | `kl_post_auth` is `httpOnly: false` and client-readable; a stale value from an earlier attempt is only cleared on completed login, and any script on the page can read it (path only, no credential — limited exposure). | `lib/auth/actions.ts:120-131, 221-225` | Minor tampering/XSS-read surface; stale overrides across tabs. | Set `httpOnly: true` and read it server-side, or clear it on every attempt start. | S |
| P9 | low | validation | Server actions do no input validation: a direct (non-UI) `signUp` with empty `fullName` silently falls back to the email local part, and short passwords rely solely on Supabase's check. | `lib/auth/actions.ts:139-143`; validators only called in `components/auth/*` | Contract enforced by UI only; bypassable via devtools action call. | Reuse `validateSignUp`/`validateLogIn` server-side in the actions. | S |
| P10 | low | log-out | `logOut()` returns `{ok:true}` even when `signOut` errors or throws (including missing session), so the UI reports success while a server session cookie may survive. | `lib/auth/actions.ts:266-279` | User believes they are signed out when they may not be. | Return the failure and let the UI say so. | S |
| P11 | low | UX dead ends | Authenticated users visiting `/` still see the landing + drawer (no redirect to `/home`); "Forgot password" and "Continue with Google" are honest stubs. | `components/auth/login-form.tsx:114-128`; `components/auth/auth-drawer.tsx:116-128` | Minor confusion, no security effect. | Add an authenticated-landing redirect; wire reset/OAuth or keep stubs. | M |

## 4. Manual checks for me (dashboard + env)

Supabase Dashboard → Authentication → Providers → Email: provider **Enabled**; **Confirm email OFF** (code assumes session-on-signup, `lib/auth/actions.ts:180-182`).
Dashboard → Authentication → URL Configuration: **Site URL** set to the deployed origin; **Redirect URLs** include `http://localhost:3000/**` and (per task) `http://localhost:3104/**` if that port is used; add production origin on deploy (callback uses `origin`, `app/auth/callback/route.ts:4-14`).
Dashboard → Authentication → Password protection / minimum length: note the enforced minimum (client assumes 8, `lib/auth/validation.ts:11`; server relies on Supabase).
Dashboard → Authentication → Rate limits (SMTP / sign-up / sign-in): confirm thresholds; the app maps 429 to "wait a minute" (`lib/auth/actions.ts:90-92`).
Dashboard → Project Settings → API: confirm anon/publishable key matches `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`; decide whether to add the **service-role key** as server-only `SUPABASE_SERVICE_ROLE_KEY` (currently missing in `.env.local`; without it P1 applies).
Dashboard → SQL Editor: check whether `20261002000000_grant_profiles_aspiration_source.sql` was ever applied (`select * from information_schema.role_table_grants where table_name='profiles'` — look for `UPDATE(career_aspiration_source)` for `authenticated`); then apply the P2 decision.
Dashboard → Authentication → Users: delete leftover verification users noted in `summary.md` §2 finding 4 (this audit created none).
`.env.local`: `SUPABASE_SERVICE_ROLE_KEY` missing; `NEXT_PUBLIC_MOCK_MODE` missing (fine until mock mode lands).

## 5. Open questions

1. Grant file: supersede `20261002000000_grant_profiles_aspiration_source.sql` with a revoking migration, or keep it as harmless headroom?
2. Is the unsigned `kl_onboarded` cookie acceptable as a device-scoped hint, or should completion be DB-truth only (which forces the service key into every env)?
3. Should `/home` enforce the onboarding gate (P4), or is direct navigation there acceptable for incomplete users?
4. Stay with "Confirm email OFF" permanently (magic-link/OAuth later will need redirect URLs + `next` validation anyway)?
5. Password-reset and Google OAuth: in scope for MVP or stay stubs?
6. `DATABASE.md` "Files" table lists only 2 migrations and never documents the profiles column grants — update it as part of P2?

## 6. Recommended fix order

1. Set `SUPABASE_SERVICE_ROLE_KEY` in the server env (fixes P1; no file touched; verify login lands on `/home` after completion).
2. Decide P2: add a superseding migration revoking `UPDATE(career_aspiration_source)` from `authenticated`, or delete the file if unapplied (touches `supabase/migrations/` + `supabase/DATABASE.md`).
3. Server-side `next` validation in `app/auth/callback/route.ts` (P5; one file).
4. Segment-boundary prefix match in `lib/supabase/middleware.ts` (P7; one file).
5. Reuse `validateSignUp`/`validateLogIn` inside `lib/auth/actions.ts` (P9; one file + tests).
6. Honest `logOut()` failure result (P10; `lib/auth/actions.ts`, `components/auth/*` if a button consumes it).
7. `httpOnly` post-auth cookie or server-side destination read (P8; `lib/auth/actions.ts`, `lib/auth/routes.ts`).
8. Sign `kl_onboarded` or downgrade it to a hint (P3; `app/api/profiler/route.ts`, `lib/auth/actions.ts`, `lib/auth/routes.ts`).
9. Onboarding gate for `/home` (P4; `lib/supabase/middleware.ts` and/or `app/home/page.tsx`).
10. README/`summary.md` refresh (see loose ends) + stale `HomePage` comment ("signed-in reads arrive with real auth" — auth is real now; `app/home/page.tsx:8-12`).

## 7. Mock-mode seams (`NEXT_PUBLIC_MOCK_MODE`) — as built

Mock mode has since landed and follows the seams recommended here, with `MOCK_MODE` in `lib/mock/flags.ts:13` as the single switch:

- Bypass points: `signUp`/`logIn`/`logOut` are replaced at the call sites by `mockSignUp`/`mockLogIn`/`mockLogOut` (`lib/mock/auth.ts`) in `components/auth/sign-up-form.tsx`, `components/auth/login-form.tsx`, `components/app-nav.tsx`; mock success navigates via `defaultRouteFor()` (no post-auth cookie), real success via `postAuthRoute()`.
- Middleware short-circuits before any Supabase work when the flag is on (`middleware.ts:14-17`); route guarding for the demo lives client-side in `components/mock-guard.tsx`.
- `PROTECTED_PREFIXES` + `isProtectedPath()` moved to `lib/constants.ts:17-34`, imported by both `lib/supabase/middleware.ts` and `components/mock-guard.tsx` — flipping the flag changes *where* the check happens, never *which* pages are protected.
- Remaining mock-mode caveat: the mock guard is client-side, so a mock user can briefly render a protected page (or open it with JS disabled) before the redirect — acceptable for a demo flag, not for real auth.

## 8. Test artifacts

- Live sign-up/sign-in: **not run** (deliberately — avoids creating cleanup work). No users, rows, or cookies created by this audit.
- `npm run typecheck` (read-only, at audit time): **failed** — pre-existing errors confined to `lib/mock/scoring.ts` and `lib/mock/types.ts`. Auth files were clean. (Since fixed by the mock-phase commits; typecheck passes at follow-up time.)
- Prior artifacts I could not enumerate from code: `summary.md` §2 finding 4 says test users/rows from its verification remain in the remote project — emails/ids are not recorded in the repo; list them from Dashboard → Authentication → Users.

## 9. Fixes applied (follow-up)

`npm run typecheck` exit 0, `npm run lint` clean after all of these.

| Problem | Change | Files |
|---|---|---|
| P5 callback `next` | Server-side same-origin relative-path check; invalid values fall back to `/` | `app/auth/callback/route.ts` |
| P7 prefix over-match | Already fixed by shared `isProtectedPath()`; report updated | `lib/constants.ts` (pre-existing) |
| P8 stale post-auth cookie | New `clearServerDestination()` expires `kl_post_auth` after consumption; both forms call it after `router.push` (real mode only) | `lib/auth/routes.ts`, `components/auth/sign-up-form.tsx`, `components/auth/login-form.tsx` |
| P9 no server-side validation | `signUp`/`logIn` re-run `validateSignUp`/`validateLogIn`; log-in failures use the neutral `invalid_credentials` message so direct-call probes learn nothing | `lib/auth/actions.ts` |
| P10 `logOut` always ok | Genuine `signOut` failures now return `{ok:false}`; `app-nav` already renders `logOutError`, so no UI change needed | `lib/auth/actions.ts` |

Still needing you: **`supabase db push`** for the revoke migration, plus the dashboard once-over and test-user cleanup. Parked: **P3** (sign `kl_onboarded` — residual self-bypass via the cookie fallback in keyless envs; in keyed envs DB truth governs). P11 stubs untouched by choice. P6 accepted tradeoff.

## Appendix. Loose ends (non-auth, noted per task)

- `AI_MODEL_FALLBACKS` is **now consumed**: `lib/ai/providers/gemini.ts:50-56` reads it and `executeWithResilience` (`:269-300`) tries one attempt per fallback model. `summary.md` §2 finding 2 ("no fallback logic consumes it") is stale — the described FIX B is implemented. Not an auth bug.
- `README.md` Auth section is current ("Authentication status: connected", `README.md:151`), but `DATABASE.md` §"Application-layer work not yet done" still says no application code writes `profiles.ai_context` — now done via the profiler service-role write (`app/api/profiler/route.ts:267-278`). `DATABASE.md` "Files" table omits the third migration file.
- No TODO/FIXME/XXX/HACK/STUB markers in `lib/auth`, `lib/supabase`, `middleware.ts`, `components/auth`, `app/auth`. Dead code: none in auth paths (Google/reset stubs are labeled UI copy, not code stubs).
