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
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Your Supabase anon/public key
   - `SUPABASE_SERVICE_ROLE_KEY` — Your Supabase service role key (server-side only)

### Install Dependencies

```bash
npm install
```

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

## Available Scripts

| Command         | Description                       |
| --------------- | --------------------------------- |
| `npm run dev`   | Start development server          |
| `npm run build` | Build for production              |
| `npm run start` | Start production server           |
| `npm run lint`  | Run ESLint                        |
| `npm run typecheck` | Run TypeScript type checking |

## Project Structure

```
├── app/                    # Next.js App Router
│   ├── api/               # API Route Handlers
│   │   ├── health/        # Health check endpoint
│   │   └── supabase-test/  # Supabase connection test
│   ├── auth/              # Auth callback routes
│   ├── login/             # Login page
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Home page
│   └── globals.css        # Global styles
├── components/
│   └── ui/                # shadcn/ui components
│       ├── button.tsx
│       ├── card.tsx
│       ├── input.tsx
│       └── label.tsx
├── lib/
│   ├── supabase/          # Supabase client utilities
│   │   ├── client.ts      # Browser client
│   │   ├── server.ts      # Server client
│   │   └── middleware.ts  # Session middleware
│   └── utils.ts           # Utility functions
├── middleware.ts          # Next.js middleware
├── .env.example           # Example environment variables
├── .env.local             # Local environment variables
├── components.json        # shadcn/ui configuration
├── next.config.ts         # Next.js configuration
├── tailwind.config.ts     # Tailwind CSS configuration
├── tsconfig.json          # TypeScript configuration
└── package.json           # Dependencies and scripts
```

## Supabase Setup

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **Project Settings > API** to find your project URL and keys
3. Add the credentials to your `.env.local` file
4. Set up your database tables in the Supabase SQL editor
5. Enable Row Level Security (RLS) on your tables

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [shadcn/ui Documentation](https://ui.shadcn.com)
