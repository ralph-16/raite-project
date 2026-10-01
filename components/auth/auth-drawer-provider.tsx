"use client";

import * as React from "react";

import type { AuthMode } from "@/lib/auth/types";
import { AuthDrawer } from "./auth-drawer";

const AUTH_QUERY_PARAM = "auth";

interface AuthDrawerContextValue {
  isOpen: boolean;
  mode: AuthMode;
  /**
   * Opens the drawer in `mode`.
   *
   * Pass the element that triggered it (usually `event.currentTarget`) so
   * focus can be handed back when the drawer closes.
   */
  openAuth: (mode: AuthMode, trigger?: HTMLElement | null) => void;
  closeAuth: () => void;
  /** Sign Up ↔ Log In without closing the drawer. */
  setMode: (mode: AuthMode) => void;
}

const AuthDrawerContext = React.createContext<AuthDrawerContextValue | null>(
  null
);

/** Throws when used outside `<AuthDrawerProvider>` so misuse fails loudly. */
export function useAuthDrawer(): AuthDrawerContextValue {
  const context = React.useContext(AuthDrawerContext);
  if (!context) {
    throw new Error("useAuthDrawer must be used within <AuthDrawerProvider>.");
  }
  return context;
}

interface State {
  isOpen: boolean;
  mode: AuthMode;
}

function readModeParam(): AuthMode | null {
  const value = new URLSearchParams(window.location.search).get(
    AUTH_QUERY_PARAM
  );
  return value === "signup" || value === "login" ? value : null;
}

/**
 * Owns the authentication drawer's open/mode state and renders it.
 *
 * Wrapping the landing page means the page stays mounted underneath the
 * drawer: opening it never unmounts or re-renders the landing content, so
 * scroll position and any in-page state are preserved.
 */
export function AuthDrawerProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [state, setState] = React.useState<State>({
    isOpen: false,
    mode: "signup",
  });
  const restoreFocusRef = React.useRef<HTMLElement | null>(null);
  const initialisedRef = React.useRef(false);

  const openAuth = React.useCallback(
    (mode: AuthMode, trigger?: HTMLElement | null) => {
      restoreFocusRef.current =
        trigger ??
        (document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null);
      setState({ isOpen: true, mode });
    },
    []
  );

  const closeAuth = React.useCallback(() => {
    setState((prev) => (prev.isOpen ? { ...prev, isOpen: false } : prev));
  }, []);

  const setMode = React.useCallback((mode: AuthMode) => {
    setState((prev) => ({ ...prev, mode }));
  }, []);

  /**
   * Deep-link support: `/?auth=signup` and `/?auth=login` (what middleware
   * sends unauthenticated visitors to) open the drawer on load, and the URL
   * stays in sync while it is open. This uses `replaceState` — never a
   * navigation — so the landing page is never reloaded or duplicated.
   */
  React.useEffect(() => {
    const url = new URL(window.location.href);

    if (!initialisedRef.current) {
      initialisedRef.current = true;
      const incoming = readModeParam();
      if (incoming) {
        setState({ isOpen: true, mode: incoming });
        return;
      }
    }

    if (state.isOpen) url.searchParams.set(AUTH_QUERY_PARAM, state.mode);
    else url.searchParams.delete(AUTH_QUERY_PARAM);
    window.history.replaceState(
      window.history.state,
      "",
      `${url.pathname}${url.search}${url.hash}`
    );
  }, [state.isOpen, state.mode]);

  /**
   * Focus restoration.
   *
   * Radix's modal dialog restores focus to a registered `SheetTrigger` only,
   * and this drawer is opened imperatively from anywhere on the page — so we
   * hand focus back to the element that opened it ourselves.
   */
  React.useEffect(() => {
    if (state.isOpen) return;
    const trigger = restoreFocusRef.current;
    if (!trigger) return;
    restoreFocusRef.current = null;
    const frame = window.requestAnimationFrame(() => trigger.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [state.isOpen]);

  const value = React.useMemo<AuthDrawerContextValue>(
    () => ({
      isOpen: state.isOpen,
      mode: state.mode,
      openAuth,
      closeAuth,
      setMode,
    }),
    [state.isOpen, state.mode, openAuth, closeAuth, setMode]
  );

  return (
    <AuthDrawerContext.Provider value={value}>
      {children}
      <AuthDrawer
        open={state.isOpen}
        mode={state.mode}
        onOpenChange={(open) =>
          open
            ? setState((prev) => ({ ...prev, isOpen: true }))
            : closeAuth()
        }
        onModeChange={setMode}
      />
    </AuthDrawerContext.Provider>
  );
}
