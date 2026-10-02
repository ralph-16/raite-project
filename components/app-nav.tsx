"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, Loader2, LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { logOut } from "@/lib/auth/actions";
import { mockLogOut, readMockSession } from "@/lib/mock/auth";
import { MOCK_MODE } from "@/lib/mock/flags";
import type { MockSession } from "@/lib/mock/types";
import { cn } from "@/lib/utils";

/**
 * Top navigation for every signed-in page: logo, Home, Profile, Settings,
 * theme toggle and the user menu (email + Log out). No sidebar, no footer
 * navigation — this is the whole app chrome.
 */
const NAV_LINKS = [
  { href: "/home", label: "Home" },
  { href: "/profile", label: "Profile" },
  { href: "/settings", label: "Settings" },
] as const;

export function AppNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = React.useState<MockSession | null>(null);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);
  const [logOutError, setLogOutError] = React.useState<string | null>(null);
  const menuRef = React.useRef<HTMLDivElement | null>(null);

  // Session lives in localStorage, so it is only read after mount.
  React.useEffect(() => {
    setSession(MOCK_MODE ? readMockSession() : null);
  }, []);

  React.useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  const handleLogOut = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    setLogOutError(null);
    const result = MOCK_MODE ? await mockLogOut() : await logOut();
    if (result.ok) {
      router.replace("/");
      return;
    }
    setIsLoggingOut(false);
    setLogOutError(result.message);
  };

  const email = session?.email ?? "";
  const name = session?.displayName ?? "";
  const initials = (name || email || "?").trim().slice(0, 1).toUpperCase();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-1 px-6 py-2 sm:h-16 sm:flex-nowrap sm:py-0">
        <div className="flex items-center gap-6">
          <Link
            href="/home"
            className="flex items-center gap-2 font-sans font-semibold tracking-tight text-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <Image
              src="/logo.png"
              alt=""
              aria-hidden="true"
              width={32}
              height={32}
              className="size-8 shrink-0"
            />
            Ka-Lakbay
          </Link>

          <nav
            aria-label="Main"
            className="order-3 flex w-full items-center gap-1 sm:order-none sm:w-auto"
          >
            {NAV_LINKS.map((link) => {
              const active =
                pathname === link.href || pathname.startsWith(`${link.href}/`);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "inline-flex h-11 items-center rounded-md px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    active
                      ? "bg-lory-yellow/30 text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-1">
          <ThemeToggle />

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
              className="inline-flex h-11 items-center gap-2 rounded-md px-2 text-sm text-muted-foreground transition-colors hover:bg-accent/20 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <span
                aria-hidden="true"
                className="inline-flex size-7 items-center justify-center rounded-full bg-lory-pink/20 text-xs font-medium text-foreground"
              >
                {initials}
              </span>
              <span className="hidden max-w-[12rem] truncate md:inline">
                {email || "Account"}
              </span>
              <ChevronDown aria-hidden="true" className="size-4" />
            </button>

            {menuOpen ? (
              <div
                role="menu"
                aria-label="Account"
                className="absolute right-0 top-full z-50 mt-1 w-64 rounded-xl border border-border bg-card p-2 shadow-lg"
              >
                <div className="flex flex-col gap-1 px-3 py-2">
                  <p className="truncate text-sm font-medium text-foreground">
                    {name || "Student"}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {email || "Signed in"}
                  </p>
                  {MOCK_MODE ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Demo mode — this account lives in your browser.
                    </p>
                  ) : null}
                </div>
                <div className="my-1 h-px bg-border" />
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => void handleLogOut()}
                  disabled={isLoggingOut}
                  className="inline-flex h-11 w-full items-center gap-2 rounded-md px-3 text-sm text-foreground transition-colors hover:bg-accent/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50"
                >
                  {isLoggingOut ? (
                    <Loader2 aria-hidden="true" className="size-4 animate-spin" />
                  ) : (
                    <LogOut aria-hidden="true" className="size-4" />
                  )}
                  {isLoggingOut ? "Logging out…" : "Log out"}
                </button>
                {logOutError ? (
                  <p role="alert" className="px-3 py-2 text-xs text-destructive">
                    {logOutError}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}

/** Sign-out button shared by pages that need one outside the nav menu. */
export function LogOutButton() {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  const handleLogOut = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    const result = MOCK_MODE ? await mockLogOut() : await logOut();
    if (result.ok) {
      router.replace("/");
      return;
    }
    setIsLoggingOut(false);
  };

  return (
    <Button
      type="button"
      variant="outline"
      onClick={() => void handleLogOut()}
      disabled={isLoggingOut}
    >
      {isLoggingOut ? (
        <Loader2 data-icon="inline-start" className="animate-spin" aria-hidden="true" />
      ) : (
        <LogOut data-icon="inline-start" aria-hidden="true" />
      )}
      {isLoggingOut ? "Logging out…" : "Log out"}
    </Button>
  );
}
