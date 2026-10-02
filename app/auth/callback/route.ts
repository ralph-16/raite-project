import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // `next` is server-validated with the same same-origin relative-path rule
  // as the client (`lib/auth/routes.ts`): a crafted link must never redirect
  // outside this app. Anything else falls back to `/`.
  const next = safeLocalPath(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}

/**
 * Accepts only same-origin relative paths: must start with a single `/`,
 * no protocol-relative `//`, no backslash. Server-side mirror of
 * `safeLocalPath()` in `lib/auth/routes.ts` (which additionally checks
 * `window.location.origin` — unnecessary here since the value is always
 * concatenated onto this request's own origin).
 */
function safeLocalPath(value: string | null | undefined): string {
  if (!value) return "/";
  const path = value.trim();
  if (!path.startsWith("/")) return "/";
  if (path.startsWith("//") || path.includes("\\")) return "/";
  return path;
}
