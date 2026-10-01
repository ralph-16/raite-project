const features = [
  {
    title: "Understand Yourself",
    description: "Build an Explorer Profile based on your interests, knowledge, experience, capabilities, and learning preferences.",
  },
  {
    title: "Explore Career Paths",
    description: "Discover possible careers that connect with what you already know and what interests you.",
  },
  {
    title: "Find Your Skill Gaps",
    description: "See which skills are relevant to a career path and understand where you are currently developing.",
  },
  {
    title: "Build Industry-Level Skills",
    description: "Learn technologies, concepts, and practices used in real-world roles through small learning activities.",
  },
  {
    title: "Build Proof",
    description: "Don't just complete lessons. Apply what you learn through challenges and projects that demonstrate your skills.",
  },
  {
    title: "Keep Growing",
    description: "As you demonstrate new skills, your profile and learning journey can change with you.",
  },
];

export function Features() {
  return (
    <section id="features" className="border-t border-border">
      <div className="mx-auto max-w-5xl px-6 py-16 md:py-20">
        <div className="flex flex-col gap-16">
          <div className="max-w-xl flex flex-col gap-4">
            <h2 className="font-display text-3xl md:text-4xl font-normal tracking-tight">
              Know where you are. Explore where you could go.
            </h2>
          </div>

          <div className="grid gap-px bg-border md:grid-cols-2">
            {features.map((feature) => (
              <div key={feature.title} className="bg-background p-8 flex flex-col gap-3">
                <h3 className="font-display font-normal text-lg">
                  {feature.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
