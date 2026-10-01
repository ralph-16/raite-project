# Raite Project

A full-stack web application built with Next.js, TypeScript, Tailwind CSS, shadcn/ui, and Supabase.

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Frontend:** React 19, Tailwind CSS, shadcn/ui
- **Backend:** Next.js Route Handlers & Server Actions
- **Database & Auth:** Supabase

## Getting Started

### Prerequisites

- Node.js 18.18 or later
- A [Supabase](https://supabase.com) account and project

### Environment Variables

1. Copy `.env.example` to `.env.local`:

   ```bash
   cp .env.example .env.local
   ```

2. Fill in your Supabase project credentials in `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL` — Your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — Your Supabase publishable (anon) key

### Install Dependencies

```bash
npm install
```

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

### Apply the Database Schema

```bash
npx supabase db push
```

Or paste `supabase/migrations/20260101000000_initial_schema.sql` into the
Supabase SQL Editor. It creates the tables, enums, indexes, Row Level Security
policies, and seed data.

## Available Scripts

| Command            | Description                   |
| ------------------ | ----------------------------- |
| `npm run dev`      | Start development server      |
| `npm run build`    | Build for production          |
| `npm run start`    | Start production server       |
| `npm run lint`     | Run ESLint                    |
| `npm run typecheck`| Run TypeScript type checking  |

## Project Structure

```
├── app/                       # Next.js App Router
│   ├── api/
│   │   └── health/            # Health check endpoint
│   ├── auth/
│   │   ├── auth-code-error/   # Sign-in failure page
│   │   └── callback/          # OAuth/PKCE code exchange
│   ├── home/                  # Placeholder: post-login destination
│   ├── onboarding/            # Placeholder: post-sign-up destination
│   ├── layout.tsx             # Root layout (fonts, theme provider)
│   ├── page.tsx               # Landing page (wraps AuthDrawerProvider)
│   └── globals.css            # Design tokens & global styles
├── components/
│   ├── auth/                  # Sign Up / Log In drawer
│   │   ├── auth-drawer.tsx            # Presentation: header, mode, sections
│   │   ├── auth-drawer-provider.tsx   # Open/close/mode state + deep links
│   │   ├── sign-up-form.tsx
│   │   ├── login-form.tsx
│   │   └── form-field.tsx             # Label + description + error wiring
│   ├── navbar.tsx             # Fixed nav with mobile menu
│   ├── hero-section.tsx
│   ├── how-it-works.tsx
│   ├── features.tsx
│   ├── career-exploration.tsx
│   ├── learning-structure.tsx
│   ├── proof-based-learning.tsx
│   ├── ka-lakbay-introduction.tsx
│   ├── cta-section.tsx
│   ├── footer.tsx
│   ├── theme-toggle.tsx       # Light/dark switch
│   └── ui/                    # shadcn/ui components
│       ├── button.tsx
│       ├── input.tsx
│       ├── label.tsx
│       └── sheet.tsx
├── lib/
│   ├── auth/                  # Provider-agnostic authentication layer
│   │   ├── actions.ts         # signUp() / logIn() service (stub today)
│   │   ├── routes.ts          # Post-auth destinations
│   │   ├── types.ts           # Shared auth types
│   │   └── validation.ts      # Reusable field + form validators
│   ├── supabase/              # Supabase client utilities
│   │   ├── client.ts          # Browser client
│   │   ├── server.ts          # Server client
│   │   └── middleware.ts      # Session refresh + route protection
│   ├── theme-context.tsx      # Light/dark theme provider
│   └── utils.ts               # cn() + scrollToSection()
├── supabase/
│   └── migrations/            # Database schema + seed data
├── middleware.ts              # Next.js middleware entry point
├── eslint.config.mjs          # ESLint flat config
├── .env.example               # Example environment variables
├── components.json            # shadcn/ui configuration
├── next.config.ts             # Next.js configuration
├── tailwind.config.ts         # Tailwind CSS configuration
├── tsconfig.json              # TypeScript configuration
└── package.json               # Dependencies and scripts
```

## Auth & Routing

Authentication is a **drawer over the landing page**, not a separate page.

- **Entry points:** "Start My Journey" opens the drawer in **Sign Up** mode,
  "Log In" opens it in **Log In** mode. Both come from the same component, and
  the two modes switch in place without closing the drawer.
- **Deep links:** `/?auth=signup` and `/?auth=login` open the drawer on load.
  The parameter is kept in sync with `history.replaceState`, so the landing page
  is never reloaded and its state is never lost.
- **Route protection:** `PROTECTED_PREFIXES` in `lib/supabase/middleware.ts`
  (`/home`, `/onboarding`) refreshes the Supabase session and sends
  unauthenticated visitors to `/?auth=login&next=<destination>`.
- **After authentication:**

  | Action  | Destination                                                       |
  | ------- | ------------------------------------------------------------------ |
  | Sign Up | `/onboarding`                                                      |
  | Log In  | `/home` — or `/onboarding` while onboarding is incomplete          |

  `lib/auth/routes.ts` resolves the target: the server's decision cookie
  first (the onboarding gate), then a preserved `?next=` — always validated
  as a same-origin relative path — then the mode's default route.

### Authentication status: connected (email + password)

`lib/auth/actions.ts` holds real server actions (`"use server"`) using the
server Supabase client. The forms, drawer and `AuthResult` contract are
unchanged:

- **Sign Up** calls `supabase.auth.signUp` with `full_name` metadata — the key
  the `on_auth_user_created` trigger reads for the required
  `profiles.display_name` (the email local part is only a fallback). Email
  confirmation must stay **disabled** in the dashboard; if no session comes
  back, the form reports that confirmation is still enabled instead of
  pretending success.
- **Log In** calls `signInWithPassword`. Errors map to plain copy: wrong
  credentials, too many attempts, network trouble. Wrong password and unknown
  address return the *identical* message, so an email's existence is never
  revealed. Raw provider text stays server-side; no password or token is
  ever logged.
- **Onboarding gate:** on login, a student whose `profiles.onboarding_completed`
  is false — or who has no per-device completion record — goes to
  `/onboarding` instead of `/home`.
- **Log out:** `logOut()` plus the visible button on `/home`.
- **Session:** middleware refreshes the cookie for `/home` and `/onboarding`;
  API routes read the same cookie (the profiler saves the signed-in student's
  profile, `next-question` returns their `userId`).
- **Database note:** `profiles.onboarding_completed` is service-role-only
  (guard trigger). With `SUPABASE_SERVICE_ROLE_KEY` set, the profiler writes
  it on completion; without it, completion is recorded per device
  (`kl_onboarded`, value = user id) and other devices re-enter onboarding.

## Supabase Setup

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **Project Settings > API** to find your project URL and publishable key
3. Add the credentials to your `.env.local` file (optionally the service role
   key too — needed only for the server-reserved writes: `profiles.ai_context`
   and `profiles.onboarding_completed`)
4. Apply the migration in `supabase/migrations/`
5. Under **Authentication → Sign In / Providers → Email**, turn
   **Confirm email** off (Ka-Lakbay signs students in immediately)

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [shadcn/ui Documentation](https://ui.shadcn.com)
