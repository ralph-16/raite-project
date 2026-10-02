import { Reveal } from "@/components/reveal";

const stages = [
  {
    title: "Learn",
    body: "Understand the concept. Short, focused explanations introduce one topic at a time — no 12-hour course.",
  },
  {
    title: "Try",
    body: "Apply it. Small examples and practice tasks let you use it in a real scenario while it is still fresh.",
  },
  {
    title: "Prove",
    body: "Show it. A challenge demonstrates the skill for real, and what you prove updates your profile.",
  },
];

/**
 * LEARN → TRY → PROVE — the page's highlight block (Mellow in light,
 * Flossy in dark), with near-black ink so contrast holds in both themes.
 */
export function LearningStructure() {
  return (
    <section id="learn" className="bg-accent-highlight text-highlight-ink">
      <Reveal className="mx-auto max-w-5xl px-6 py-20 md:py-28">
        <div className="grid gap-6 md:grid-cols-[1.1fr_0.9fr] md:items-end md:gap-12">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.2em]">
              Inside one activity
            </p>
            <h2 className="mt-5 font-display font-normal text-4xl leading-[1.08] md:text-6xl">
              Learn it. Try it. Prove it.
            </h2>
          </div>
          <p className="text-base leading-relaxed md:text-lg">
            Every skill in Ka-Lakbay moves through the same three moves, so you
            always know what you are doing and why it counts.
          </p>
        </div>

        <div className="mt-12 border-t border-highlight-ink/30">
          {stages.map((stage) => (
            <div
              key={stage.title}
              className="grid gap-2 border-b border-highlight-ink/30 py-6 md:grid-cols-[minmax(0,0.55fr)_minmax(0,1.45fr)] md:items-baseline md:gap-10 md:py-7"
            >
              <h3 className="font-display font-normal text-4xl leading-none md:text-5xl">
                {stage.title}
              </h3>
              <p className="text-base leading-relaxed">{stage.body}</p>
            </div>
          ))}
        </div>
      </Reveal>
    </section>
  );
}
