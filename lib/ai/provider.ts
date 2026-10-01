import "server-only";

/**
 * Provider factory.
 *
 * The one place that knows which provider adapters exist. Adding OpenAI
 * or Anthropic later means adding a file under `lib/ai/providers/` and one case
 * here — no application code changes, and no feature ever imports an SDK.
 */

import { aiConfigurationError } from "./errors";
import { GeminiProvider } from "./providers/gemini";
import { MockProvider } from "./providers/mock";
import type { AIProvider, AIProviderId } from "./types";

/** Cached instances. Providers are stateless, so one per id is enough. */
const registry = new Map<AIProviderId, AIProvider>();

/**
 * Resolves the adapter for a provider id.
 *
 * Throws `configuration` for an unknown id. `config.ts` validates the id from
 * the environment first, so reaching here with an unknown value means the two
 * files disagree — worth failing loudly rather than defaulting to the mock,
 * which would serve placeholder output in production.
 */
export function getAIProvider(id: AIProviderId): AIProvider {
  const cached = registry.get(id);
  if (cached) return cached;

  const provider = createProvider(id);
  registry.set(id, provider);
  return provider;
}

function createProvider(id: AIProviderId): AIProvider {
  switch (id) {
    case "mock":
      return new MockProvider();
    case "gemini":
      return new GeminiProvider();
    default:
      throw aiConfigurationError(`AI provider "${id}" is not implemented.`, {
        provider: id,
      });
  }
}

/**
 * Registered provider ids. Exposed so a future settings screen or test can
 * enumerate what this build supports.
 */
export function listAIProviders(): AIProviderId[] {
  return ["mock", "gemini"];
}

/**
 * Drops cached instances. Test-only: lets a test change `process.env` and get a
 * fresh adapter without restarting the process.
 */
export function resetAIProviderRegistry(): void {
  registry.clear();
}
