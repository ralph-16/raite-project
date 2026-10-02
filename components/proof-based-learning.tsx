import { Reveal } from "@/components/reveal";

const states = [
  {
    title: "Started",
    description: "You've begun exploring this skill.",
  },
  {
    title: "Developing",
    description: "You're building your understanding and ability.",
  },
  {
    title: "Demonstrated",
    description: "You've successfully applied the skill in a challenge or task.",
  },
  {
    title: "Strong",
    description:
      "You've demonstrated the skill consistently across relevant activities.",
  },
];

/** Progress is stated as skill levels the student can actually demonstrate. */
export function ProofBasedLearning() {
  return (
    <section id="proof" className="bg-background">
      <Reveal className="mx-auto max-w-5xl px-6 py-20 md:py-28">
        <div className="max-w-2xl">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            Proof, not certificates
          </p>
          <h2 className="mt-5 font-display font-normal text-4xl leading-[1.08] md:text-5xl">
            Learning isn&apos;t just about finishing a course.
          </h2>
          <p className="mt-5 text-base leading-relaxed text-muted-foreground md:text-lg">
            Ka-Lakbay tracks what you can demonstrate, not simply what you have
            consumed. Every skill carries a level you earned by doing
            something.
          </p>
        </div>

        <div className="mt-12 grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-4">
          {states.map((state, i) => (
            <div
              key={state.title}
              className="flex flex-col gap-3 bg-background p-6 md:p-7"
            >
              <span className="font-mono text-xs text-muted-foreground">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="font-display font-normal text-xl md:text-2xl">
                {state.title}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {state.description}
              </p>
            </div>
          ))}
        </div>

        <p className="mt-8 max-w-md text-sm text-muted-foreground">
          Finishing a resource does not mean you have mastered a skill — so it
          never counts as one.
        </p>
      </Reveal>
    </section>
  );
}
