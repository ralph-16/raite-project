import { landingCopy } from "@/lib/mock/copy";

const COPY = landingCopy();

/** Four cards — one line each, no filler. */
export function Features() {
  return (
    <section id="features" className="border-t border-border">
      <div className="mx-auto max-w-5xl px-6 py-16 md:py-20">
        <div className="flex flex-col gap-12">
          <div className="max-w-xl flex flex-col gap-3">
            <h2 className="font-display text-3xl md:text-4xl font-normal tracking-tight">
              {COPY.features.title}
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              {COPY.features.intro}
            </p>
          </div>

          <ul className="grid gap-px bg-border sm:grid-cols-2">
            {COPY.features.items.map((feature) => (
              <li
                key={feature.title}
                className="flex flex-col gap-2 bg-background p-8"
              >
                <h3 className="font-display font-normal text-lg">
                  {feature.title}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
