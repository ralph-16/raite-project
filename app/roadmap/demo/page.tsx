import Link from "next/link";
import { RoadmapDemo } from "@/components/roadmap/roadmap-demo";
import { loadDemoRoadmap } from "@/lib/roadmap/demo";

export default function RoadmapDemoPage() {
  const roadmap = loadDemoRoadmap();
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
      <RoadmapDemo roadmap={roadmap} />
    </main>
  );
}
