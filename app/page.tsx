import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const stack = [
  {
    name: "Next.js 15",
    role: "App Router, Server Components, Route Handlers",
    detail: "The frontend and backend in a single deployable. No separate server process.",
  },
  {
    name: "Supabase",
    role: "Auth, Postgres, Realtime, Storage",
    detail: "Row-level security with SSR session management through middleware.",
  },
  {
    name: "TypeScript",
    role: "Strict mode, path aliases, full type safety",
    detail: "Every layer type-checked from database schema to UI props.",
  },
  {
    name: "Tailwind + shadcn/ui",
    role: "Utility-first CSS, accessible components",
    detail: "CSS variable theming with dark mode support out of the box.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen">
      {/* Hero */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-5xl px-6 py-24 md:py-32">
          <div className="space-y-8">
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground tracking-wide">
                Full-stack starter
              </p>
              <h1 className="font-display text-5xl md:text-7xl font-bold tracking-tight leading-[1.05]">
                Build with
                <br />
                confidence.
              </h1>
              <p className="text-lg text-muted-foreground max-w-md leading-relaxed">
                A production-ready foundation with authentication, database, and type safety already wired together.
              </p>
            </div>
            <div className="flex gap-3">
              <Button asChild size="lg">
                <a href="https://nextjs.org/docs" target="_blank" rel="noopener noreferrer">
                  Explore the stack
                </a>
              </Button>
              <Button asChild size="lg" variant="outline">
                <a href="https://supabase.com/docs" target="_blank" rel="noopener noreferrer">
                  Supabase docs
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stack */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-5xl px-6 py-16 md:py-20">
          <div className="space-y-10">
            <h2 className="font-display text-2xl font-semibold tracking-tight">
              What&apos;s inside
            </h2>
            <div className="grid gap-px bg-border md:grid-cols-2">
              {stack.map((item) => (
                <Card key={item.name} className="rounded-none border-0 bg-background">
                  <CardContent className="p-6 space-y-3">
                    <div className="flex items-baseline justify-between">
                      <h3 className="font-display text-lg font-semibold">
                        {item.name}
                      </h3>
                      <span className="text-xs text-muted-foreground">
                        {item.role}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {item.detail}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section>
        <div className="mx-auto max-w-5xl px-6 py-16 md:py-20">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="space-y-2">
              <h2 className="font-display text-2xl font-semibold tracking-tight">
                Ready to build?
              </h2>
              <p className="text-sm text-muted-foreground">
                Configure your Supabase credentials and start shipping.
              </p>
            </div>
            <Button asChild size="lg" variant="secondary">
              <a href="/login">
                Get started
              </a>
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
