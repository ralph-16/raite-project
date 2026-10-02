import { Reveal } from "@/components/reveal";

const problems = [
  {
    n: "01",
    title: "Interests don’t translate",
    body: "You know what you enjoy. Turning that into a career you could actually try is the part nobody teaches.",
  },
  {
    n: "02",
    title: "Skills stay invisible",
    body: "Job posts list skills. Nothing tells you which ones you already have, which are close, and which are still missing.",
  },
  {
    n: "03",
    title: "“What next?” is noise",
    body: "Search for a path and you get forty courses, twelve job titles, and no explanation of where to begin.",
  },
];

/**
 * THE PROBLEM — the educational gap Ka-Lakbay exists for: interests to
 * career, skills to evidence, and overload of “what next”.
 */
export function Features() {
  return (
    <section id="problem" className="bg-background">
      <Reveal className="mx-auto max-w-5xl px-6 py-20 md:py-28">
        <div className="grid gap-6 md:grid-cols-[1.1fr_0.9fr] md:items-end md:gap-12">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              The problem
            </p>
            <h2 className="mt-5 font-display font-normal text-4xl leading-[1.08] md:text-6xl">
              Nobody hands you a map.
            </h2>
          </div>
          <p className="text-base leading-relaxed text-muted-foreground md:text-lg">
            Students are pointed at careers without ever seeing what the work
            is, what skills it uses, or how they would get there. The result is
            a gap between &ldquo;I like this&rdquo; and &ldquo;I can do
            this&rdquo;.
          </p>
        </div>

        <div className="mt-14 border-t border-border">
          {problems.map((problem) => (
            <div
              key={problem.n}
              className="grid gap-2 border-b border-border py-7 md:grid-cols-[3.5rem_minmax(0,1fr)_minmax(0,1.5fr)] md:gap-8 md:py-8"
            >
              <span className="font-mono text-sm text-muted-foreground">
                {problem.n}
              </span>
              <h3 className="font-display font-normal text-xl leading-snug md:text-2xl">
                {problem.title}
              </h3>
              <p className="text-base leading-relaxed text-muted-foreground">
                {problem.body}
              </p>
            </div>
          ))}
        </div>
      </Reveal>
    </section>
  );
}
