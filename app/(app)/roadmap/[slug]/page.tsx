import Link from "next/link";

import { CareerRoadmap } from "@/components/roadmap/career-roadmap";
import { Button } from "@/components/ui/button";
import { getCareer } from "@/lib/mock/careers";
import { loadRoadmap } from "@/lib/mock/roadmaps";

export const metadata = {
  title: "Roadmap — Ka-Lakbay",
  description: "Your personalized learning map.",
};

/**
 * Roadmap canvas destination (MVP screen: personalized roadmap).
 *
 * Slugs with authored JSON in `/data/roadmaps` render the pan/zoom
 * skill-tree canvas; anything else keeps the friendly "still drawing"
 * state instead of a 404.
 */
export default async function RoadmapPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const career = getCareer(slug);
  const roadmap = await loadRoadmap(slug);

  if (!career || !roadmap) {
    return (
      <main className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-3xl flex-col items-start justify-center gap-4 px-6 py-16">
        <p className="font-sans text-xs text-muted-foreground">{slug}</p>
        <h1 className="font-sans font-extrabold tracking-tight text-4xl">
          Lory is still drawing this map
        </h1>
        <p className="max-w-md text-muted-foreground">
          The skill tree for this path arrives in the next build step. Your
          answers and saved places are already kept.
        </p>
        <Button asChild variant="outline">
          <Link href="/home">Back to home</Link>
        </Button>
      </main>
    );
  }

  return (
    <main>
      <div className="mx-auto max-w-5xl px-6 pt-6">
        <Link
          href="/home"
          className="font-sans text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          ← Back to home
        </Link>
      </div>
      <CareerRoadmap
        roadmap={roadmap}
        careerSlug={career.slug}
        careerTitle={career.title}
        isSample={career.is_sample_data}
      />
    </main>
  );
}
