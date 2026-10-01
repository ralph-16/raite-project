import "server-only";

/**
 * Server-only AI configuration.
 *
 * `import "server-only"` makes this module throw at build time if any client
 * component ever imports it, which is the hard boundary that keeps provider
 * credentials out of the browser bundle. Every AI secret is read here, and no
 * value in this file uses a `NEXT_PUBLIC_` prefix — those are inlined into
 * client bundles by Next.js, so a prefixed secret would be public.
 *
 * The provider is intentionally undecided. `AI_PROVIDER=mock` is the default so
 * the infrastructure can be exercised end to end without committing the project
 * to a vendor.
 */

import { aiConfigurationError } from "./errors";
import type { AIProviderId } from "./types";

export interface AIConfig {
  /** Provider selected by `AI_PROVIDER`. */
  provider: AIProviderId;
  /** Default model. Provider-specific; the mock provider ships its own default. */
  model?: string;
  /** Whether to emit metadata-only development logs. */
  debug: boolean;
}

/** Providers this build knows how to construct. */
export const SUPPORTED_PROVIDERS: readonly AIProviderId[] = ["mock"];

const DEFAULT_PROVIDER: AIProviderId = "mock";

/**
 * Reads and validates configuration from `process.env`.
 *
 * Throws an `AIError` with code `configuration` rather than falling back
 * silently — a misconfigured provider should fail loudly on the server, not
 * quietly serve mock output to a student as if it were a real model.
 */
export function getAIConfig(): AIConfig {
  const rawProvider = process.env.AI_PROVIDER?.trim();
  const provider = (rawProvider || DEFAULT_PROVIDER) as AIProviderId;

  if (!SUPPORTED_PROVIDERS.includes(provider)) {
    throw aiConfigurationError(
      `AI_PROVIDER is set to "${rawProvider}" but no such provider is implemented. ` +
        `Supported providers: ${SUPPORTED_PROVIDERS.join(", ")}.`,
      { detail: `unsupported provider: ${rawProvider}` }
    );
  }

  const model = process.env.AI_MODEL?.trim();
  const debug =
    process.env.AI_DEBUG === "1" ||
    (process.env.NODE_ENV === "development" &&
      process.env.AI_DEBUG !== "0");

  return { provider, model: model || undefined, debug };
}

/**
 * Validates provider-specific credentials.
 *
 * The mock provider needs none, so this returns without touching the
 * environment. A real adapter adds its own check here — keeping the lookup
 * server-side and in one place, rather than scattered through adapters.
 */
export function assertProviderCredentials(
  provider: AIProviderId
): Record<string, string> {
  switch (provider) {
    case "mock":
      return {};
    default: {
      // Unreachable while SUPPORTED_PROVIDERS and this switch agree; present so
      // adding a provider cannot silently skip its credential check.
      throw aiConfigurationError(
        `No credential check is implemented for provider "${provider}".`,
        { provider }
      );
    }
  }
}

/**
 * Environment variable names, for documentation and for the test endpoint's
 * diagnostics. Names only — never values.
 */
export const AI_ENV_VARS = {
  provider: "AI_PROVIDER",
  model: "AI_MODEL",
  debug: "AI_DEBUG",
} as const;
