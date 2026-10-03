# Code summary — Ka-Lakbay (`raite-project`)

> Updated 2026-10-03. Stack: Next.js 15 (App Router) · React 19 · TypeScript ·
> Tailwind + shadcn/ui · Supabase (auth + Postgres) · Zod. Package manager: npm.
> Health: `typecheck` pass · `lint` pass (clean) · `npm test` 28/28 pass.

## 1. Cleanup performed (this session)

- **Moved orphan script into place:** `test-openrouter.ts` (repo root, unreferenced
  by `package.json`, README, or any import — ad-hoc check superseded by
  `scripts/real-calls.mjs` + the test suite) → `scripts/test-openrouter.ts`,
  where the README says verification scripts live. `git mv`, so history is kept.
- **Scanned for dead code:** none found. Every component under `components/`
  (landing sections, auth, onboarding ×2 flows, home, roadmap) is imported; all
  `components/ui/*` primitives are used; `data/onboarding-fallback.json` is read
  by the mock provider + tests; `lib/roadmap/demo.ts` backs `app/roadmap/demo`.
  No `streak-counter` file exists (AGENTS.md already says not to surface it).
- **`console.*` audit:** only legitimate uses remain — `scripts/*` CLI output,
  metadata-only server logging (`lib/ai/logger.ts`), and missing-file warnings
  (`lib/mock/roadmaps.ts`). Nothing leaks secrets (no prompt/response logging).
- Verified after the move: `npm run typecheck` pass, `npm run lint` pass (clean).

## 2. Codebase map

**Routes (`app/`)** — landing `page.tsx`; `(app)/home`, `(app)/onboarding`,
`(app)/profile`, `(app)/roadmap/[slug]`, `(app)/settings`; `roadmap/demo`;
auth callback + error page. API: `health`, `ai/test` (diagnostics),
`onboarding/next-question`, `profiler`, `resume/parse`, `skills`.

**`lib/`** — `ai/` (server-only; `mock`/`gemini`/`openrouter` providers,
`AI_PROVIDER_ORDER` chain on 429/503, per-model retries +
`AI_MODEL_FALLBACKS` in both real providers); `auth/` (server actions, routes,
validation); `onboarding/` (guided state, questions, validators);
`profiler/` (Explorer Profile prompt + Zod schema); `resume/`; `roadmap/`;
`mock/` (demo backend: flags, auth, storage, seed, scoring, careers,
roadmaps — single `MOCK_MODE` switch in `lib/mock/flags.ts`, defaults ON);
`supabase/` (browser/server/middleware clients); `constants.ts`
(`PROTECTED_PREFIXES` + `isProtectedPath`, shared by middleware and mock guard).

**Dual-track design:** `NEXT_PUBLIC_MOCK_MODE=true` (current `.env.local`) runs
the UI on `data/*.json` + localStorage with zero Supabase/API calls
(`OnboardingWizard`, mock auth, client-side `mock-guard`); `=false` restores
real Supabase auth + AI routes (`OnboardingFlow`) without touching call sites.
Middleware short-circuits in mock mode; otherwise it refreshes the session and
protects `/home`, `/onboarding`.

**Onboarding persistence (`app/api/profiler/route.ts → persistProfile()`):**
user client writes only user-writable columns (`year_level`, `program`,
`interests`, `learning_preferences`, `career_aspiration[_industry]`);
service-role client writes server-reserved columns (`career_aspiration_source`,
`career_aspiration_set_at`, `ai_context*`, `onboarding_completed*`) with
`user_id` from the verified session only. No service key → user columns still
save, response reports `aiContextPersisted: false` honestly.

**Supabase (`supabase/migrations/`):** initial schema → roadmaps/onboarding
context → grant of `career_aspiration_source` (superseded, kept for history) →
revoke of that grant (current intent: service-role-only). Push with
`npx supabase db push`. Full reference in `supabase/DATABASE.md`; auth findings
in `docs/AUTH_AUDIT.md`.

**Tests (`tests/`, node:test):** `prompts.test.ts` (prompt/schema contracts) +
`onboarding-route.test.ts` (live dev-server route tests); `scripts/real-calls.mjs`
is the manual real-provider verification script.

## 3. Environment (`.env.local`, names only — values never recorded)

All keys present: Supabase URL + publishable key + service-role key,
`GEMINI_API_KEY`, `OPENROUTER_API_KEY`. Effective config: mock-mode UI **on**,
server AI provider resolved per-request from `AI_PROVIDER`/`AI_MODEL`.

## 4. Follow-ups (not changed — flagging only)

1. **`.env.local` defines `AI_PROVIDER` twice** (line 10 `gemini`, line 20
   `openrouter`; dotenv last-wins → effective `openrouter`). Harmless today but
   confusing — delete line 10. Local file, so left for you to edit.
2. **`AI_MODEL=gemini-3.5-flash` + `AI_MODEL_FALLBACKS=gemini-3.8-flash`:**
   fallback logic now exists (provider chain in `lib/ai/index.ts`, model
   fallbacks in both real providers), so the stale "no fallback logic" note from
   the previous summary is resolved. If 3.5 is over quota, swap primary to 3.8.
3. **README "Project Structure" (§75) is stale** — missing `profiler`/`skills`/
   `next-question`/`resume` routes, the `wizard/` onboarding flow, `home-view`,
   `career-modal`, and several `ui/` primitives; references non-existent
   `lib/theme-context.tsx`. Refresh it when convenient.
4. The old "mock provider can't serve `/api/profiler`" note is by design (mock
   echoes text; real profiling needs a real provider) — no action, recording it
   so it isn't re-investigated.
