"use client";

import { Button } from "@/components/ui/button";
import { useAuthDrawer } from "@/components/auth/auth-drawer-provider";

const categories = [
  {
    title: "Build",
    description: "Explore paths focused on creating software, applications, systems, and digital products.",
    paths: ["Software Developer", "Cybersecurity Analyst"],
  },
  {
    title: "Analyze",
    description: "Explore paths focused on understanding information, finding patterns, and solving problems with data.",
    paths: ["Data Analyst", "Business Analyst"],
  },
  {
    title: "Design",
    description: "Explore paths focused on creating experiences, visuals, and digital content.",
    paths: ["UI/UX Designer", "Graphic Designer"],
  },
  {
    title: "Communicate",
    description: "Explore paths focused on content, audiences, messaging, and digital communication.",
    paths: ["Content Strategist", "Marketing Specialist"],
  },
];

export function CareerExploration() {
  const { openAuth } = useAuthDrawer();

  return (
    <section id="career-paths" className="border-t border-border">
      <div className="mx-auto max-w-5xl px-6 py-16 md:py-20">
        <div className="flex flex-col gap-16">
          <div className="max-w-xl flex flex-col gap-4">
            <h2 className="font-display text-3xl md:text-4xl font-normal tracking-tight">
              You don&apos;t need to know your career yet.
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Not sure what you want to become? That&apos;s okay. Ka-Lakbay can help you explore possibilities based on the things you enjoy, the problems you like solving, and the ways you prefer to work.
            </p>
          </div>

          <div className="grid gap-px bg-border md:grid-cols-2">
            {categories.map((cat) => (
              <div key={cat.title} className="bg-background p-8 flex flex-col gap-4">
                <h3 className="font-display font-normal text-lg">
                  {cat.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {cat.description}
                </p>
                <div className="flex flex-wrap gap-2 pt-2">
                  {cat.paths.map((path) => (
                    <span
                      key={path}
                      className="text-xs px-3 py-1.5 rounded-full border border-border text-muted-foreground"
                    >
                      {path}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div>
            <Button
              size="lg"
              onClick={(event) => openAuth("signup", event.currentTarget)}
            >
              Explore Possibilities
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
