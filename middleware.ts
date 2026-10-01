import { NextResponse, type NextRequest } from "next/server";

import { MOCK_MODE } from "@/lib/mock/flags";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * Mock mode short-circuits here: no Supabase client, no `getClaims()`, no
 * redirect. Route guarding for the demo lives client-side in
 * `components/mock-guard.tsx`, which reads the local session.
 *
 * With `NEXT_PUBLIC_MOCK_MODE=false` this behaves exactly as before.
 */
export async function middleware(request: NextRequest) {
  if (MOCK_MODE) {
    return NextResponse.next({ request });
  }
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api (route handlers manage their own auth)
     * - common file extensions
     */
    "/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|woff2?)$).*)",
  ],
};
