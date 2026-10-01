const capabilities = [
  {
    title: "Understand",
    description: "Helps build your student profile from your answers and optional resume.",
  },
  {
    title: "Explore",
    description: "Helps you discover career paths relevant to your interests and capabilities.",
  },
  {
    title: "Learn",
    description: "Explains concepts and provides examples, practice, and hints.",
  },
  {
    title: "Evaluate",
    description: "Helps evaluate your submitted challenges against a defined skill rubric.",
  },
];

export function KaLakbayIntroduction() {
  return (
    <section className="border-t border-border">
      <div className="mx-auto max-w-5xl px-6 py-16 md:py-20">
        <div className="flex flex-col gap-16">
          <div className="max-w-xl flex flex-col gap-4">
            <h2 className="font-display text-3xl md:text-4xl font-normal tracking-tight">
              Meet Ka-Lakbay
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Ka-Lakbay is your AI learning companion. Ka-Lakbay asks questions, helps you explore possibilities, explains concepts, gives practice guidance, and evaluates skill challenges.
            </p>
          </div>

          <div className="grid gap-px bg-border md:grid-cols-2">
            {capabilities.map((cap) => (
              <div key={cap.title} className="bg-background p-8 flex flex-col gap-3">
                <h3 className="font-display font-normal text-lg">
                  {cap.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {cap.description}
                </p>
              </div>
            ))}
          </div>

          <div className="border border-border rounded-sm p-6 max-w-xl">
            <p className="text-sm text-muted-foreground leading-relaxed">
              <span className="text-foreground font-medium">AI Disclosure:</span> Ka-Lakbay is an AI. Its suggestions are possibilities to explore, not guarantees about your future.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
