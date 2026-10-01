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
- **After authentication (once a provider is connected):**

  | Action  | Destination   |
  | ------- | ------------- |
  | Sign Up | `/onboarding` |
  | Log In  | `/home`       |

  Both routes exist as placeholders; `lib/auth/routes.ts` resolves the target
  and honours a preserved `?next=`.

### Authentication status: not connected

Supabase Auth is intentionally **not** wired up yet. The UI talks to
`lib/auth/actions.ts`, which is a stub: it creates no account, sends no
credentials anywhere, and reports "Authentication isn't connected yet" so the
interface never pretends to have succeeded.

To implement it later, replace the bodies of `signUp()` / `logIn()` with
Supabase calls and map the result onto `AuthResult` — the forms, drawer and
routing do not change.

## Supabase Setup

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **Project Settings > API** to find your project URL and publishable key
3. Add the credentials to your `.env.local` file
4. Apply the migration in `supabase/migrations/`

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [shadcn/ui Documentation](https://ui.shadcn.com)
