import { Reveal } from "@/components/reveal";

/**
 * UNCERTAINTY chapter — the one Velvet Cherry block on the page.
 * Answers the visitor's real objection ("I don't know what I want yet")
 * before any product explanation.
 *
 * Text uses `text-primary-foreground` (white in both themes) rather than a
 * raw neutral, so the block stays token-driven — see §3.6.
 */
export function CareerExploration() {
  return (
    <section id="uncertainty" className="bg-lory-burgundy text-primary-foreground">
      <Reveal className="mx-auto max-w-5xl px-6 py-20 md:py-28">
        <div className="max-w-3xl">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-primary-foreground/60">
            Uncertainty
          </p>
          <h2 className="mt-5 font-display font-normal text-4xl leading-[1.08] md:text-6xl">
            You don&apos;t need to know your career yet.
          </h2>

          <div className="mt-8 grid gap-6 md:grid-cols-2 md:gap-10">
            <p className="text-base leading-relaxed text-primary-foreground/80 md:text-lg">
              Most students are asked to choose a career before they have tried
              any of it. Ka-Lakbay starts from what you enjoy and what you can
              already do, then lays out possible paths.
            </p>
            <p className="text-base leading-relaxed text-primary-foreground/80 md:text-lg">
              Each path arrives with the reason it&apos;s there and the skills it
              would ask of you. Nothing is ranked, and nothing is decided for
              you.
            </p>
          </div>

          <p className="mt-10 font-display text-2xl leading-snug text-lory-pink md:text-3xl">
            Alignment, not a verdict.
          </p>
        </div>
      </Reveal>
    </section>
  );
}
