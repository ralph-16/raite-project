const steps = [
  "JavaScript",
  "Functions",
  "Learn the concept",
  "Try an example",
  "Practice",
  "Complete a challenge",
  "Demonstrate the skill",
];

const supportingPoints = [
  "Small learning activities",
  "Practical examples",
  "Practice tasks",
  "Real-world challenges",
  "Proof-based progress",
];

export function LearningStructure() {
  return (
    <section className="border-t border-border">
      <div className="mx-auto max-w-5xl px-6 py-16 md:py-20">
        <div className="flex flex-col gap-16">
          <div className="max-w-xl flex flex-col gap-4">
            <h2 className="font-display text-3xl md:text-4xl font-normal tracking-tight">
              Industry knowledge, one step at a time.
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              You don&apos;t have to learn everything at once. Ka-Lakbay breaks larger skill areas into smaller concepts, examples, practice activities, and challenges.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12">
            {/* Learning path visualization */}
            <div className="flex flex-col gap-1">
              {steps.map((step, i) => (
                <div key={step} className="flex items-center gap-4">
                  <div className="flex-1 py-3 px-4 border border-border bg-card rounded-sm">
                    <span className="text-sm font-medium">{step}</span>
                  </div>
                  {i < steps.length - 1 && (
                    <svg className="text-muted-foreground shrink-0" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M8 2v12M4 10l4 4 4-4" />
                    </svg>
                  )}
                </div>
              ))}
            </div>

            {/* Supporting points */}
            <div className="flex flex-col gap-4">
              <h3 className="font-display font-normal text-lg">
                How you&apos;ll learn
              </h3>
              <ul className="flex flex-col gap-3">
                {supportingPoints.map((point) => (
                  <li key={point} className="flex items-start gap-3 text-sm text-muted-foreground">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
