import { landingCopy } from "@/lib/mock/copy";

const COPY = landingCopy();

/** Three steps only — the full Discover → Reassess loop lives in the app. */
export function HowItWorks() {
  return (
    <section id="how-it-works" className="border-t border-border">
      <div className="mx-auto max-w-5xl px-6 py-16 md:py-20">
        <div className="flex flex-col gap-12">
          <div className="max-w-xl flex flex-col gap-3">
            <h2 className="font-display text-3xl md:text-4xl font-normal tracking-tight">
              {COPY.howItWorks.title}
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              {COPY.howItWorks.intro}
            </p>
          </div>

          <ol className="grid gap-px bg-border md:grid-cols-3">
            {COPY.howItWorks.steps.map((step) => (
              <li key={step.number} className="flex flex-col gap-3 bg-background p-8">
                <span className="font-mono text-xs text-muted-foreground">
                  {step.number}
                </span>
                <h3 className="font-display font-normal text-lg">
                  {step.title}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {step.description}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
