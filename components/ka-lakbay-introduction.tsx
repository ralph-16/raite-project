import { Reveal } from "@/components/reveal";

const capabilities = [
  {
    title: "Understand",
    description:
      "Builds a profile from your answers and your optional resume.",
  },
  {
    title: "Explore",
    description:
      "Suggests possible paths and explains why each one came up.",
  },
  {
    title: "Learn",
    description: "Explains one concept at a time, with examples and hints.",
  },
  {
    title: "Evaluate",
    description:
      "Checks a challenge you submit against the skill it was meant to show.",
  },
];

/**
 * WHAT AI DOES — the page's one Kind Berry block. White ink holds at 4.8:1
 * on Kind Berry (§3.5), so the block reads the same in both themes. States
 * the product and the AI boundary in the same place.
 */
export function KaLakbayIntroduction() {
  return (
    <section id="about" className="bg-primary text-primary-foreground">
      <Reveal className="mx-auto max-w-5xl px-6 py-20 md:py-28">
        <p className="font-sans font-medium text-[11px] uppercase tracking-[0.2em]">
          What AI does here
        </p>

        <h2 className="mt-5 max-w-4xl font-sans font-extrabold tracking-tight text-4xl leading-[1.08] md:text-6xl">
          AI helps you explore.
          <br className="hidden md:block" /> You make the decisions.
        </h2>

        <div className="mt-12 grid gap-10 md:grid-cols-[0.95fr_1.05fr] md:gap-14">
          <p className="text-base leading-relaxed md:text-lg">
            Ka-Lakbay is an AI guide for students. It asks questions, maps what
            you can already do, explains the ideas behind a path, and gives
            feedback on the challenges you take on. It suggests. You choose,
            you learn, you prove it.
          </p>

          <dl className="border-t border-primary-foreground/40">
            {capabilities.map((capability) => (
              <div
                key={capability.title}
                className="grid gap-1 border-b border-primary-foreground/40 py-4 md:grid-cols-[7rem_minmax(0,1fr)] md:gap-6"
              >
                <dt className="font-sans font-semibold tracking-tight text-lg leading-snug">
                  {capability.title}
                </dt>
                <dd className="text-sm leading-relaxed">
                  {capability.description}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="mt-10 max-w-xl border border-primary-foreground/40 p-5">
          <p className="text-sm leading-relaxed">
            <span className="font-medium">AI disclosure:</span> AI-generated
            content is labelled throughout. Its suggestions are possibilities
            to explore, not guarantees about your future.
          </p>
        </div>
      </Reveal>
    </section>
  );
}
