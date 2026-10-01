/**
 * Typed loader for /data/copy.json (landing page copy).
 *
 * Swap point: with real content this becomes a CMS or i18n lookup; the
 * component API (`landingCopy().hero.headlineBefore`) stays the same, so
 * English/Filipino strings can move out of the components without touching
 * them.
 */

import copyData from "@/data/copy.json";

import { landingCopySchema } from "./schemas";
import type { LandingCopy } from "./types";

const parsed = landingCopySchema.parse(copyData);

export function landingCopy(): LandingCopy {
  return parsed;
}
