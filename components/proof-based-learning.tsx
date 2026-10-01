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
    description: "You've demonstrated the skill consistently across relevant activities.",
  },
];

export function ProofBasedLearning() {
  return (
    <section className="border-t border-border">
      <div className="mx-auto max-w-5xl px-6 py-16 md:py-20">
        <div className="flex flex-col gap-16">
          <div className="max-w-xl flex flex-col gap-4">
            <h2 className="font-display text-3xl md:text-4xl font-normal tracking-tight">
              Learning isn&apos;t just about finishing a course.
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Ka-Lakbay tracks what you can demonstrate, not simply what you have consumed.
            </p>
          </div>

          <div className="grid gap-px bg-border md:grid-cols-2 lg:grid-cols-4">
            {states.map((state, i) => (
              <div key={state.title} className="bg-background p-8 flex flex-col gap-3">
                <span className="text-xs text-muted-foreground font-mono">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="font-display font-normal text-lg">
                  {state.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {state.description}
                </p>
              </div>
            ))}
          </div>

          <p className="text-sm text-muted-foreground max-w-md">
            Completing a resource does not automatically mean you&apos;ve mastered a skill.
          </p>
        </div>
      </div>
    </section>
  );
}
