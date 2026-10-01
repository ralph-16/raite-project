import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="w-full max-w-2xl space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">Raite Project</h1>
          <p className="text-muted-foreground">
            Full-stack Next.js application with Supabase
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Next.js App Router</CardTitle>
              <CardDescription>
                Built with Next.js 15, React 19, and TypeScript
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Leveraging Server Components, Server Actions, and Route Handlers for a modern full-stack experience.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Supabase Integration</CardTitle>
              <CardDescription>
                Authentication, database, and real-time subscriptions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Connected to Supabase with SSR support, middleware session management, and row-level security.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tailwind CSS + shadcn/ui</CardTitle>
              <CardDescription>
                Beautiful, accessible UI components
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Styled with Tailwind CSS and shadcn/ui components with CSS variables for theming.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>TypeScript First</CardTitle>
              <CardDescription>
                Full type safety across the stack
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Strict TypeScript configuration with path aliases and comprehensive type checking.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-center gap-4">
          <Button asChild>
            <a href="https://nextjs.org/docs" target="_blank" rel="noopener noreferrer">
              Next.js Docs
            </a>
          </Button>
          <Button variant="outline" asChild>
            <a href="https://supabase.com/docs" target="_blank" rel="noopener noreferrer">
              Supabase Docs
            </a>
          </Button>
        </div>
      </div>
    </main>
  );
}
