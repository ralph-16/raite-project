import Link from "next/link";

export const metadata = {
  title: "Sign-in failed — Ka-Lakbay",
};

export default function AuthCodeErrorPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm flex flex-col gap-6 text-center">
        <h1 className="font-sans font-bold tracking-tight text-2xl font-normal tracking-tight">
          Sign-in failed
        </h1>
        <p className="text-sm text-muted-foreground">
          We couldn&apos;t complete the sign-in. The link may have expired or
          been used already.
        </p>
        <div className="flex flex-col gap-3">
          <Link
            href="/?auth=login"
            className="text-sm font-medium text-primary hover:underline dark:text-foreground"
          >
            Try again
          </Link>
          <Link
            href="/"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Back to home
          </Link>
        </div>
      </div>
    </main>
  );
}
