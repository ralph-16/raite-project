import { Reveal } from "@/components/reveal";

const steps = [
  {
    n: "01",
    title: "Discover",
    body: "Tell Ka-Lakbay what you enjoy, what you have tried, and what you are curious about. That becomes your explorer profile.",
  },
  {
    n: "02",
    title: "Diagnose",
    body: "See your skills as they actually stand: demonstrated, developing, started, not assessed yet. No hidden score.",
  },
  {
    n: "03",
    title: "Map",
    body: "Look at possible paths that connect to your interests, each with the reason it appeared and the skills it asks for.",
  },
  {
    n: "04",
    title: "Learn",
    body: "Work through small activities built around the skills you chose to develop. One concept at a time.",
  },
  {
    n: "05",
    title: "Prove",
    body: "Take a challenge that lets you show the skill instead of just finishing a lesson. Real evidence, not a certificate.",
  },
  {
    n: "06",
    title: "Reassess",
    body: "What you proved updates your profile and shapes what to explore or learn next. Then the loop runs again.",
  },
];

/** THE LOOP — Discover → Diagnose → Map → Learn → Prove → Reassess. */
export function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-background">
      <Reveal className="mx-auto max-w-5xl px-6 py-20 md:py-28">
        <div className="grid gap-6 md:grid-cols-[1.1fr_0.9fr] md:items-end md:gap-12">
          <div>
            <p className="font-sans font-medium text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              How it works
            </p>
            <h2 className="mt-5 font-sans font-extrabold tracking-tight text-4xl leading-[1.08] md:text-6xl">
              One loop, six steps.
            </h2>
          </div>
          <p className="text-base leading-relaxed text-muted-foreground md:text-lg">
            Ka-Lakbay runs the same journey every time you come back: understand
            where you are, explore what fits, build the skill, show it, then
            start again from what changed.
          </p>
        </div>

        <div className="mt-14 border-t border-border">
          {steps.map((step) => (
            <div
              key={step.n}
              className="grid gap-2 border-b border-border py-6 md:grid-cols-[3.5rem_minmax(0,0.85fr)_minmax(0,1.5fr)] md:items-baseline md:gap-8 md:py-7"
            >
              <span className="font-sans text-sm text-muted-foreground">
                {step.n}
              </span>
              <h3 className="flex items-baseline gap-3 font-sans font-bold tracking-tight text-2xl leading-snug md:text-3xl">
                {step.title}
                <span aria-hidden="true" className="text-accent-ink text-base">
                  →
                </span>
              </h3>
              <p className="text-base leading-relaxed text-muted-foreground">
                {step.body}
              </p>
            </div>
          ))}
        </div>

        <p className="mt-6 font-sans text-xs text-muted-foreground">
          …and back to 01. What you prove changes what you explore next.
        </p>
      </Reveal>
    </section>
  );
}
