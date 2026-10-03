# Quality baseline — Ka-Lakbay UI (Phase 0, 2026-10-03)

No edits to UI code. Checks run on a clean tree (`typecheck` + `lint` already verified clean).

## Check results

| Check | Result |
|---|---|
| `npm run lint` | pass, zero warnings |
| `npm run typecheck` | pass, zero errors |
| `npm run build` (Next 15.5.27) | pass, zero warnings; 13 routes, all prerender/SSR as expected |
| `npm test` | 28/28 pass (not part of phase gate, recorded for reference) |
| `docs/UI_SYSTEM.md` | **does not exist** — Phase 6 must create it from reality |
| Framer Motion | not installed — AGENTS.md §8 references it but nothing uses it; no action unless motion work lands |

## Bundle sizes (production build, First Load JS)

| Route | Page | First Load JS |
|---|---|---|
| `/` | 8.92 kB | 176 kB |
| `/home` | 11.5 kB | 179 kB |
| `/onboarding` | 16.3 kB | 172 kB |
| `/roadmap/[slug]` | 4.96 kB | 160 kB |
| `/roadmap/demo` | 6.25 kB | 158 kB |
| shared by all | — | 103 kB (46.5 + 54.2 kB chunks + 1.99 kB) |
| middleware | — | 64.9 kB |

## 10 largest component files (lines)

`onboarding-flow.tsx` 633 · `home-view.tsx` 392 · `roadmap-demo.tsx` 334 ·
`career-roadmap.tsx` 326 · `career-modal.tsx` 260 · `app-nav.tsx` 224 ·
`qa-survey-stage.tsx` 202 · `onboarding-review.tsx` 196 · `career-card.tsx` 186 ·
`auth/sign-up-form.tsx` 184.

## Checklist for Phases 1–5 (file, issue, severity)

| File | Issue | Severity |
|---|---|---|
| `components/ui/dialog.tsx`, `components/ui/sheet.tsx` | `space-y-1.5` / `space-x-2` classes — AGENTS.md §7.5 bans `space-x/y`, use `gap-*` | low |
| `components/ui/dialog.tsx`, `components/ui/sheet.tsx`, `components/navbar.tsx`, `components/app-nav.tsx` | manual `z-50` — AGENTS.md §7.5 says no manual `z-50` on overlays (navbar/app-nav dropdown are not overlays; confirm intent in Phase 4) | low |
| `components/onboarding/onboarding-flow.tsx` (633 lines) | over ~250-line budget; `window.localStorage` touched directly at lines 72/132/407/435 — verify render-vs-effect safety in Phase 1, split in Phase 2 | medium |
| `components/onboarding/wizard/onboarding-wizard.tsx` | `window.location.search` read at line 66 — verify inside effect (Phase 1) | medium |
| `components/mock-guard.tsx` | `window.location.pathname` at line 37 — verify inside effect (Phase 1) | medium |
| `components/roadmap/roadmap-demo.tsx` (334 lines) | direct `window.localStorage` at lines 30/91 — verify render-vs-effect safety; split candidate | medium |
| `components/home-view.tsx` (392 lines), `components/roadmap/career-roadmap.tsx` (326), `components/career-modal.tsx` (260) | split candidates for Phase 2 | low |
| `components/onboarding/wizard/finish-step.tsx` | `window.matchMedia` at line 39 (verify effect) + `bg-gradient-to-r from-lory-blue to-lory-pink` (allowed brand pair per §3.6, keep) | low |
| `components/theme-toggle.tsx` | `window.setTimeout` at line 47 — trivially safe, note only | info |
| `app/auth/auth-code-error/page.tsx`, `components/ui/button.tsx` | `dark:` overrides (`dark:text-foreground`, `dark:decoration-primary`) — AGENTS.md says semantic tokens instead of `dark:` (Phase 4) | low |
| `components/onboarding/experience-step.tsx:68` | stale-looking comment ("Keep the shared labelled-input pattern available for future fields") — confirm or remove (Phase 1) | low |
| `app/(app)/profile/page.tsx`, `app/(app)/settings/page.tsx` | only 145 B pages — confirm they render real content vs stubs (Phase 3) | medium |
| forms/buttons app-wide | double-submit guards + disabled/loading states to audit (Phase 1); focus trap + Esc + focus restore on drawer/modal, skip link, `h1` order, `aria-describedby` on errors (Phase 3) | medium |
| images/icons | zero `<img>` tags (good); `next/image` likely N/A — confirm no raster assets need it (Phase 5) | info |
| raw colors | zero raw hex and zero raw Tailwind palette classes in `app/` + `components/`; zero `console.*`; zero TODO/FIXME; zero `any` in UI code (only prose matches) | info — nothing to do |

Out of scope / needs approval if touched: `supabase/**`, `middleware.ts`, `lib/auth/**`, `lib/supabase/**`, `lib/ai/**`, `app/api/**`, env files, new dependencies.
