# Ka-Lakbay

**Ka-Lakbay** is an AI-powered career and learning navigator for students. Many students don't know what career they want yet — Ka-Lakbay helps them explore possibilities, understand the skills behind those possibilities, develop those skills, and prove what they can do.

Core loop: **Discover → Diagnose → Map → Learn → Prove → Reassess**

> ⚠️ **Status note: UI only.** The backend, database, and AI features are **not working** in this build. All screens run on static/mock data — no real Supabase calls, no real AI responses. See [Mock mode](#mock-mode-ui-only) below.

## Purpose

Ka-Lakbay addresses three student problems:

1. **Interests ↔ career gap** — students don't know which careers fit their interests.
2. **Skills gap** — students don't know what skills a career needs or where they stand.
3. **What-next overload** — too many resources, no clear starting point.

The AI suggests *possible paths* — it never decides for the student. The student explores, learns, and demonstrates skills; Ka-Lakbay guides.

Ka-Lakbay is **not** a job board, resume builder, course marketplace, generic chatbot, career quiz, or LMS.

## Features

- **Landing page** — editorial sections explaining what Ka-Lakbay is, who it's for, how it works, and a call to action.
- **Sign Up / Log In drawer** — auth UI over the landing page with deep links (`/?auth=signup`, `/?auth=login`). UI only, no real session.
- **AI introduction** — explains what the AI does and why data is collected.
- **AI interview (onboarding)** — guided chat-style questions with "Skip" / "I'm not sure yet" always available.
- **Optional resume upload** — works fully with "Skip for now"; upload UI + parsing layout only.
- **Student profile** — program, year level, interests, strengths, developing skills, unassessed skills. No opaque AI score.
- **Career exploration** — career cards with alignment percentage + reason, career detail modal, save/unsave.
- **Skill-gap view** — career skills vs. the student's status (not-assessed → started → developing → demonstrated → strong).
- **Personalized roadmap** — leveled learning path per career (levels, activities, proof steps).
- **Micro-learning activity** — one concept per card: learn one thing, try one example, do one challenge.
- **Skill challenge / proof** — project submissions that update demonstrated skills (UI only).
- **Progress tracking** — progress bars, updated skill badges, home dashboard view.
- **Settings & profile pages** — edit profile info, app preferences (UI only).
- **Light/dark theme toggle.**

## Tech Stack

| Layer | Technology |
| --- | --- |
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| UI library | React 19 |
| Styling | Tailwind CSS 3.4, tailwindcss-animate |
| Components | shadcn/ui (Radix Dialog/Slot, class-variance-authority, clsx, tailwind-merge, lucide-react icons) |
| Validation | Zod |
| File parsing (UI) | mammoth (`.docx` resume parsing layout) |
| Backend (intended, not connected) | Next.js Route Handlers & Server Actions |
| Database & Auth (intended, not connected) | Supabase (Postgres + Auth, `@supabase/ssr`, `@supabase/supabase-js`) |
| AI (intended, not connected) | Provider-agnostic service (`lib/ai/`) with mock / Gemini / OpenRouter adapters |
| Package manager | npm |

## Mock Mode (UI only)

This build runs with `NEXT_PUBLIC_MOCK_MODE=true`:

- All screens render from static JSON (`data/`) + localStorage.
- **Zero** Supabase / API / AI calls are made.
- Auth, onboarding, careers, roadmaps, and progress are simulated so the UI can be clicked through end to end.

To connect the real backend later: set `NEXT_PUBLIC_MOCK_MODE=false`, fill in `.env.local` (see `.env.example`), and apply `supabase/migrations/`.

## Getting Started

### Prerequisites

- Node.js 18.18 or later

### Install & Run (UI only — no credentials needed)

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

> No `.env.local`, Supabase project, or AI keys are required to view the UI in mock mode.

## Available Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript type checking |
| `npm test` | Run the test suite (node:test) |

## Project Structure

```
├── app/
│   ├── (app)/
│   │   ├── home/            # Post-login dashboard view
│   │   ├── onboarding/      # AI interview wizard (mock UI)
│   │   ├── profile/         # Student profile page
│   │   ├── roadmap/[slug]/  # Personalized roadmap detail
│   │   ├── settings/        # Settings page
│   │   └── layout.tsx       # App shell + nav
│   ├── api/
│   │   ├── ai/              # AI diagnostics (not connected)
│   │   ├── health/          # Health check endpoint
│   │   ├── onboarding/      # Next-question route (not connected)
│   │   ├── profiler/        # Profile generation route (not connected)
│   │   ├── resume/          # Resume parse route (not connected)
│   │   └── skills/          # Skills route (not connected)
│   ├── auth/
│   │   ├── auth-code-error/ # Sign-in failure page
│   │   └── callback/        # OAuth/PKCE code exchange
│   ├── roadmap/demo/        # Demo roadmap page
│   ├── layout.tsx           # Root layout (fonts, theme provider)
│   ├── page.tsx             # Landing page
│   └── globals.css          # Design tokens & global styles
├── components/
│   ├── auth/                # Sign Up / Log In drawer
│   ├── onboarding/          # Onboarding wizard + flow (mock UI)
│   ├── roadmap/             # Roadmap views
│   ├── ui/                  # shadcn/ui primitives
│   ├── career-card.tsx      # Career exploration card
│   ├── career-modal.tsx     # Career detail modal
│   ├── student-profile.tsx  # Readable student profile
│   ├── home-view.tsx        # Dashboard view
│   ├── navbar.tsx, hero-section.tsx, how-it-works.tsx, features.tsx, ...
│   └── theme-toggle.tsx     # Light/dark switch
├── lib/
│   ├── ai/                  # Provider-agnostic AI service (mock/gemini/openrouter)
│   ├── auth/                # Auth actions, routes, validation
│   ├── onboarding/          # Guided onboarding state + validators
│   ├── profiler/            # Student Profiler prompt + schema
│   ├── resume/              # Resume upload + parsing helpers
│   ├── roadmap/             # Roadmap generation helpers
│   ├── mock/                # Static demo backend (flags, auth, seed, scoring)
│   ├── supabase/            # Supabase clients (not connected in UI mode)
│   └── utils.ts             # cn() + scrollToSection()
├── data/                    # Static JSON (careers, copy, fallback questions)
├── supabase/migrations/     # Database schema + seed (not applied)
├── tests/                   # node:test suite
└── package.json             # Dependencies and scripts
```

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [shadcn/ui Documentation](https://ui.shadcn.com)
