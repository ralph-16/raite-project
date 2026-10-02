import type { ExplorerProfile } from "@/lib/profiler/schema";
import { cn } from "@/lib/utils";

export interface StudentProfileProps {
  profile: ExplorerProfile;
  program?: string;
  yearLevelLabel?: string;
  interests?: string[];
  modelLabel?: string | null;
}

function Section({
  title,
  items,
  emptyText,
  tone,
}: {
  title: string;
  items: string[];
  emptyText: string;
  tone: "strength" | "developing" | "neutral";
}) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="font-sans font-semibold tracking-tight text-lg">{title}</h3>
      {items.length > 0 ? (
        <ul className="flex flex-col gap-1.5">
          {items.map((item) => (
            <li
              key={item}
              className={cn(
                "rounded-lg border px-3 py-2 text-sm",
                tone === "strength" &&
                  "border-border bg-lory-blue/10 text-foreground",
                tone === "developing" &&
                  "border-border bg-lory-yellow/30 text-foreground",
                tone === "neutral" && "border-border bg-muted text-foreground"
              )}
            >
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">{emptyText}</p>
      )}
    </div>
  );
}

/**
 * Readable Explorer Profile: what the student shared, grouped into strengths,
 * developing areas, and unassessed areas. No opaque AI score, no career
 * verdict — this is the starting point for exploration.
 */
export function StudentProfile({
  profile,
  program,
  yearLevelLabel,
  interests,
  modelLabel,
}: StudentProfileProps) {
  return (
    <section
      aria-label="Your Explorer Profile"
      className="flex flex-col gap-5 rounded-xl border border-border bg-card p-5"
    >
      <div className="flex flex-col gap-1">
        <p className="text-xs text-muted-foreground">
          Lory suggests <span aria-hidden="true">·</span> AI-generated from
          your onboarding answers
          {modelLabel ? ` (${modelLabel})` : ""}
        </p>
        <h2 className="font-sans font-semibold tracking-tight text-lg">
          Your Explorer Profile
        </h2>
        {(program || yearLevelLabel) && (
          <p className="text-sm text-muted-foreground">
            {[program, yearLevelLabel].filter(Boolean).join(" · ")}
          </p>
        )}
      </div>

      {interests && interests.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="font-sans font-semibold tracking-tight text-lg">Interests</h3>
          <p className="text-sm text-foreground">{interests.join(", ")}</p>
        </div>
      )}

      <Section
        title="Strengths"
        items={profile.strengths}
        emptyText="Nothing marked as a strength yet — that's fine, exploration starts here."
        tone="strength"
      />
      <Section
        title="Developing areas"
        items={profile.developingAreas}
        emptyText="No developing areas identified yet."
        tone="developing"
      />
      <Section
        title="Unassessed areas"
        items={profile.unassessedAreas}
        emptyText="Everything you mentioned has some signal already."
        tone="neutral"
      />

      {profile.experience.length > 0 && (
        <Section
          title="Experience"
          items={profile.experience}
          emptyText=""
          tone="neutral"
        />
      )}

      <p className="text-sm leading-relaxed text-muted-foreground">
        {profile.summary}
      </p>
      <p className="text-xs text-muted-foreground">
        Possibilities to explore, not guarantees about your future.
      </p>
    </section>
  );
}
