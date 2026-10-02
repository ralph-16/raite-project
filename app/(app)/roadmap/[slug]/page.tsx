import Link from "next/link";

import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Roadmap — Ka-Lakbay",
  description: "Your personalized learning map.",
};

/**
 * Roadmap canvas destination (MVP screen: personalized roadmap).
 *
 * Phase-3 placeholder: career links from Home land here on a friendly
 * "still drawing" state instead of a 404. The pan/zoom skill-tree canvas
 * replaces this in the next build step.
 */
export default async function RoadmapPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <main className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-3xl flex-col items-start justify-center gap-4 px-6 py-16">
      <p className="font-mono text-xs text-muted-foreground">{slug}</p>
      <h1 className="font-display font-normal text-4xl">
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
