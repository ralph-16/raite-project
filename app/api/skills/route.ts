import { NextResponse } from "next/server";

import { FALLBACK_SKILLS } from "@/lib/onboarding/questions";
import { createClient } from "@/lib/supabase/server";

/**
 * Reference skills for the onboarding skills step.
 *
 * Reads the world-readable `skills` table so the UI never hardcodes its own
 * large catalog. Falls back to static examples when Supabase is unreachable
 * or unauthenticated — the flow must work without a backend in this task.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("skills")
      .select("slug, name")
      .order("name")
      .limit(40);

    if (error || !data || data.length === 0) {
      return NextResponse.json({ skills: [...FALLBACK_SKILLS] });
    }
    return NextResponse.json({ skills: data });
  } catch {
    return NextResponse.json({ skills: [...FALLBACK_SKILLS] });
  }
}
