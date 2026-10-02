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

/**
 * Resolves the provider fallback chain from `AI_PROVIDER_ORDER`.
 *
 * When set (e.g. `gemini,openrouter`), the service tries each provider in
 * order and moves to the next when one fails with 429 or 503. When unset,
 * the chain is just `[config.provider]` — the single-provider behaviour.
 *
 * Unknown ids are filtered out so a typo cannot silently disable a provider.
 * If nothing valid remains, falls back to `[config.provider]`.
 */
export function resolveProviderChain(config: AIConfig): AIProviderId[] {
  const raw = process.env.AI_PROVIDER_ORDER?.trim();
  if (!raw) return [config.provider];

  const order = raw
    .split(",")
    .map((id) => id.trim())
    .filter((id): id is AIProviderId =>
      SUPPORTED_PROVIDERS.includes(id as AIProviderId)
    );

  return order.length > 0 ? order : [config.provider];
}

/** Providers this build knows how to construct. */
export const SUPPORTED_PROVIDERS: readonly AIProviderId[] = ["mock", "gemini", "openrouter"];

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
 * The mock provider needs none. Gemini requires `GEMINI_API_KEY`. The lookup
 * stays server-side and in one place, rather than scattered through adapters.
 */
export function assertProviderCredentials(
  provider: AIProviderId
): Record<string, string> {
  switch (provider) {
    case "mock":
      return {};
    case "gemini":
      if (!process.env.GEMINI_API_KEY?.trim()) {
        throw aiConfigurationError(
          "AI_PROVIDER is set to \"gemini\" but GEMINI_API_KEY is not set.",
          { provider, detail: "missing GEMINI_API_KEY" }
        );
      }
      return {};
    case "openrouter":
      if (!process.env.OPENROUTER_API_KEY?.trim()) {
        throw aiConfigurationError(
          "AI_PROVIDER is set to \"openrouter\" but OPENROUTER_API_KEY is not set.",
          { provider, detail: "missing OPENROUTER_API_KEY" }
        );
      }
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
  modelFallbacks: "AI_MODEL_FALLBACKS",
  debug: "AI_DEBUG",
  geminiKey: "GEMINI_API_KEY",
  openrouterKey: "OPENROUTER_API_KEY",
} as const;
