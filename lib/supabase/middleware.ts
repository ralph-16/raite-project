import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

import { ONBOARDED_COOKIE, POST_SIGN_UP_ROUTE } from '@/lib/auth/routes'
import { isProtectedPath } from '@/lib/constants'

/**
 * Which routes need a signed-in student lives in `lib/constants.ts`, shared
 * with the client-side mock-mode guard so the two gates can't drift apart.
 *
 * Unauthenticated visitors to those routes are sent to the landing page with
 * `?auth=login&next=...`, which opens the Sign Up / Log In drawer in place —
 * no separate login page to keep in sync.
 */

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  // With Fluid compute, don't put this client in a global environment
  // variable. Always create a new one on each request.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Do not run code between createServerClient and
  // supabase.auth.getClaims(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  // IMPORTANT: If you remove getClaims() and you use server-side rendering
  // with the Supabase client, your users may be randomly logged out.
  const { data } = await supabase.auth.getClaims()
  const user = data?.claims

  const { pathname } = request.nextUrl
  const isProtected = isProtectedPath(pathname)

  if (!user && isProtected) {
    // `next` is preserved so authentication can send the student straight to
    // where they were headed (see lib/auth/routes.ts).
    const next = `${pathname}${request.nextUrl.search}`
    const url = request.nextUrl.clone()
    url.pathname = '/'
    url.search = ''
    url.searchParams.set('auth', 'login')
    url.searchParams.set('next', next)
    return NextResponse.redirect(url)
  }

  // Onboarding gate: a signed-in student who has not completed onboarding
  // cannot open protected pages directly (e.g. typing /home in the address
  // bar) — they go to /onboarding instead. /onboarding itself is never
  // gated, so this cannot loop. Completion is DB truth first
  // (profiles.onboarding_completed, written by POST /api/profiler via the
  // service role), with the kl_onboarded device cookie as fallback for
  // environments without SUPABASE_SERVICE_ROLE_KEY.
  const needsCompletion =
    isProtected &&
    pathname !== POST_SIGN_UP_ROUTE &&
    !pathname.startsWith(`${POST_SIGN_UP_ROUTE}/`)

  if (user && needsCompletion) {
    const userId =
      typeof user === 'object' && user !== null
        ? (user as { sub?: unknown }).sub
        : null
    const completed =
      typeof userId === 'string' && userId
        ? await hasCompletedOnboarding(supabase, request, userId)
        : false
    if (!completed) {
      const url = request.nextUrl.clone()
      url.pathname = POST_SIGN_UP_ROUTE
      url.search = ''
      // Preserve the refreshed session cookies on the redirect (see the
      // IMPORTANT note below about keeping browser and server in sync).
      const redirect = NextResponse.redirect(url)
      for (const cookie of supabaseResponse.cookies.getAll()) {
        redirect.cookies.set(cookie)
      }
      return redirect
    }
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is.
  // If you're creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!

  return supabaseResponse
}

/**
 * Whether this signed-in student has completed onboarding. DB flag first,
 * device cookie as fallback — mirrors hasCompletedOnboarding() in
 * lib/auth/actions.ts (which runs in server actions, not middleware, so the
 * logic is intentionally duplicated here against the middleware client).
 */
async function hasCompletedOnboarding(
  supabase: ReturnType<typeof createServerClient>,
  request: NextRequest,
  userId: string
): Promise<boolean> {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('onboarding_completed')
      .eq('id', userId)
      .maybeSingle()
    if (profile?.onboarding_completed === true) return true
  } catch {
    // A failed profile read falls through to the cookie so a transient DB
    // error degrades to the device signal instead of erroring the request.
  }
  return request.cookies.get(ONBOARDED_COOKIE)?.value === userId
}
