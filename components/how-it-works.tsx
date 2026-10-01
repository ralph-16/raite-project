const steps = [
  {
    number: "01",
    title: "Discover",
    description: "Tell Ka-Lakbay about your interests, experience, knowledge, and what you enjoy doing.",
  },
  {
    number: "02",
    title: "Diagnose",
    description: "Understand your current skills, strengths, developing areas, and what still needs to be explored.",
  },
  {
    number: "03",
    title: "Explore",
    description: "Discover possible career paths that connect with your interests and current capabilities.",
  },
  {
    number: "04",
    title: "Learn",
    description: "Follow small learning activities and resources focused on the skills you want to develop.",
  },
  {
    number: "05",
    title: "Prove",
    description: "Complete challenges that let you demonstrate that you can actually apply what you learned.",
  },
  {
    number: "06",
    title: "Reassess",
    description: "Your demonstrated skills update your profile and help shape what you can explore or learn next.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="border-t border-border">
      <div className="mx-auto max-w-5xl px-6 py-16 md:py-20">
        <div className="flex flex-col gap-16">
          <div className="max-w-xl flex flex-col gap-4">
            <h2 className="font-display text-3xl md:text-4xl font-normal tracking-tight">
              From uncertainty to your next step.
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Ka-Lakbay learns about you, explores possible paths with you, and helps you develop and demonstrate the skills those paths use.
            </p>
          </div>

          <div className="grid gap-px bg-border md:grid-cols-2 lg:grid-cols-3">
            {steps.map((step) => (
              <div key={step.number} className="bg-background p-8 flex flex-col gap-4">
                <span className="text-xs text-muted-foreground font-mono">
                  {step.number}
                </span>
                <h3 className="font-display font-normal text-lg">
                  {step.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
