"use client";

/**
 * Mock-mode home (MVP screen: career cards).
 *
 * Reads `kl.profile`, `kl.matches`, `kl.bookmarks` and `kl.progress.*` after
 * mount, then renders: Lory's read → continue learning → saved paths →
 * search/sort controls → "Closest to you" (top three) + "Switching or
 * exploring a different path". Alignment % comes from `lib/mock/scoring` and
 * is always labelled as a sample suggestion with a visible reason.
 */

import * as React from "react";

import { CareerCard } from "@/components/career-card";
import { CareerModal } from "@/components/career-modal";
import { ContinueLearning, type ContinueItem } from "@/components/continue-learning";
import { LoryReadStrip } from "@/components/lory-read-strip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { X } from "lucide-react";
import { getCareer, listCareers } from "@/lib/mock/careers";
import { MOCK_MODE } from "@/lib/mock/flags";
import { readMockSession } from "@/lib/mock/auth";
import { computeNodeStates, loadRoadmap, roadmapPercent } from "@/lib/mock/roadmaps";
import {
  loadBookmarks,
  loadMatches,
  loadProfile,
  loadProgress,
  toggleBookmark,
} from "@/lib/mock/storage";
import type { Match, MockProfile, Roadmap, RoadmapProgress } from "@/lib/mock/types";

const SORTS = [
  { id: "fit", label: "Closest to you" },
  { id: "az", label: "A to Z" },
  { id: "fast", label: "Fastest to learn" },
] as const;

type SortId = (typeof SORTS)[number]["id"];

interface Row {
  slug: string;
  title: string;
  score: number | null;
  reason: string | null;
}

export function HomeView() {
  const [ready, setReady] = React.useState(false);
  const [displayName, setDisplayName] = React.useState("there");
  const [profile, setProfile] = React.useState<MockProfile | null>(null);
  const [matches, setMatches] = React.useState<Match[]>([]);
  const [bookmarks, setBookmarks] = React.useState<string[]>([]);
  const [progress, setProgress] = React.useState<Record<string, RoadmapProgress>>({});
  const [roadmaps, setRoadmaps] = React.useState<Record<string, Roadmap>>({});
  const [query, setQuery] = React.useState("");
  const [sort, setSort] = React.useState<SortId>("fit");
  const [openSlug, setOpenSlug] = React.useState<string | null>(null);

  React.useEffect(() => {
    const session = readMockSession();
    setDisplayName(session?.displayName?.split(" ")[0] ?? "there");
    setProfile(loadProfile());
    setMatches(loadMatches());
    setBookmarks(loadBookmarks());

    const stored: Record<string, RoadmapProgress> = {};
    for (const career of listCareers()) {
      const value = loadProgress(career.slug);
      if (Object.keys(value.nodes).length > 0) stored[career.slug] = value;
    }
    setProgress(stored);
    setReady(true);

    // Roadmap JSON loads through the async Zod loader — titles for "next up".
    void (async () => {
      const maps: Record<string, Roadmap> = {};
      for (const slug of Object.keys(stored)) {
        const map = await loadRoadmap(slug);
        if (map) maps[slug] = map;
      }
      setRoadmaps(maps);
    })();
  }, []);

  const rows: Row[] = React.useMemo(() => {
    const bySlug = new Map(matches.map((match) => [match.slug, match]));
    return listCareers().map((career) => {
      const match = bySlug.get(career.slug);
      return {
        slug: career.slug,
        title: career.title,
        score: match?.score ?? null,
        reason: match?.topReasons?.[0] ?? null,
      };
    });
  }, [matches]);

  const hasAnswers = matches.length > 0;
  const search = query.trim().toLowerCase();

  const visible = React.useMemo(() => {
    const filtered = rows.filter((row) => {
      if (!search) return true;
      const career = getCareer(row.slug);
      if (!career) return false;
      return (
        row.title.toLowerCase().includes(search) ||
        career.category.includes(search) ||
        career.description.toLowerCase().includes(search) ||
        career.required_skills.some((skill) =>
          skill.name.toLowerCase().includes(search)
        )
      );
    });
    const sorted = [...filtered];
    if (sort === "az") {
      sorted.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sort === "fast") {
      sorted.sort((a, b) => {
        const monthsA = getCareer(a.slug)?.learning_effort_months ?? 0;
        const monthsB = getCareer(b.slug)?.learning_effort_months ?? 0;
        if (monthsA !== monthsB) return monthsA - monthsB;
        return a.title.localeCompare(b.title);
      });
    } else {
      sorted.sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
    }
    return sorted;
  }, [rows, search, sort]);

  const splitTop = search === "" && hasAnswers && sort === "fit";
  const primary = splitTop ? visible.slice(0, 3) : [];
  const secondary = splitTop ? visible.slice(3) : [];

  const continueItems: ContinueItem[] = React.useMemo(() => {
    return Object.entries(progress).map(([slug, value]) => {
      const career = getCareer(slug);
      const map = roadmaps[slug];
      let nextNode: string | null = null;
      let percent = 0;
      if (map) {
        const states = computeNodeStates(map.nodes, map.edges, value.nodes);
        percent = roadmapPercent(map.nodes, value.nodes);
        nextNode =
          map.nodes.find((node) => states[node.key] === "in_progress")?.title ??
          map.nodes.find((node) => states[node.key] === "available")?.title ??
          null;
      }
      return { slug, title: career?.title ?? slug, percent, nextNode };
    });
  }, [progress, roadmaps]);

  const savedRows = bookmarks
    .map((slug) => rows.find((row) => row.slug === slug))
    .filter((row): row is Row => Boolean(row));

  const openRow = openSlug ? (rows.find((row) => row.slug === openSlug) ?? null) : null;

  const handleSave = React.useCallback((slug: string) => {
    setBookmarks(toggleBookmark(slug));
  }, []);

  const sectionTitle = search
    ? `Results for “${query.trim()}”`
    : !hasAnswers
      ? "Worth exploring"
      : sort === "fit"
        ? "Closest to you"
        : "All careers";

  if (!MOCK_MODE) return null;

  if (!ready) {
    return (
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-10">
        <Skeleton className="h-36 w-full rounded-xl" />
        <Skeleton className="h-6 w-48" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <Skeleton className="h-56 rounded-xl" />
          <Skeleton className="h-56 rounded-xl" />
          <Skeleton className="h-56 rounded-xl" />
        </div>
        <p className="sr-only" role="status">
          Loading your home…
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-6 py-10">
      <LoryReadStrip displayName={displayName} profile={profile} />

      <ContinueLearning items={continueItems} />

      {savedRows.length > 0 ? (
        <section
          aria-labelledby="saved-heading"
          className="flex flex-col gap-3"
        >
          <h2
            id="saved-heading"
            className="font-display font-normal text-xl"
          >
            Saved paths
          </h2>
          <ul className="flex flex-wrap gap-2">
            {savedRows.map((row) => (
              <li
                key={row.slug}
                className="flex h-11 items-center rounded-full border border-border bg-card pl-4"
              >
                <button
                  type="button"
                  onClick={() => setOpenSlug(row.slug)}
                  className="h-11 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lory-blue focus-visible:ring-offset-2 rounded-full"
                >
                  {row.title}
                </button>
                <button
                  type="button"
                  aria-label={`Remove ${row.title} from saved`}
                  onClick={() => handleSave(row.slug)}
                  className="grid size-11 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lory-blue focus-visible:ring-offset-2"
                >
                  <X aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section
        aria-labelledby="careers-heading"
        className="flex flex-col gap-5"
      >
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2
              id="careers-heading"
              className="font-display font-normal text-2xl md:text-3xl"
            >
              {sectionTitle}
            </h2>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              {hasAnswers ? (
                <Badge variant="highlight">Lory suggests (sample)</Badge>
              ) : (
                <Badge variant="quiet">Sample data</Badge>
              )}
              {search
                ? `${visible.length} of ${rows.length} careers`
                : !hasAnswers
                  ? "Eight sample careers — no alignment until you answer."
                  : "Every percentage shows why it is there."}
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1.5 text-xs text-muted-foreground">
              Search
              <Input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Career, skill, or category"
                aria-label="Search careers"
                className="h-11 w-56"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-xs text-muted-foreground">
              Sort
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value as SortId)}
                aria-label="Sort careers"
                className="h-11 rounded-md border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lory-blue focus-visible:ring-offset-2"
              >
                {SORTS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {visible.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>Nothing matches “{query.trim()}”</EmptyTitle>
              <EmptyDescription>
                Try a skill like “SQL”, a category like “design”, or clear the
                search to see every path.
              </EmptyDescription>
            </EmptyHeader>
            <Button
              type="button"
              variant="outline"
              onClick={() => setQuery("")}
            >
              Clear search
            </Button>
          </Empty>
        ) : splitTop ? (
          <>
            <CareerGrid
              rows={primary}
              bookmarks={bookmarks}
              onSave={handleSave}
              onOpen={setOpenSlug}
            />
            {secondary.length > 0 ? (
              <div className="flex flex-col gap-4 border-t border-border pt-6">
                <h3 className="font-display font-normal text-xl">
                  Switching or exploring a different path
                </h3>
                <CareerGrid
                  rows={secondary}
                  bookmarks={bookmarks}
                  onSave={handleSave}
                  onOpen={setOpenSlug}
                />
              </div>
            ) : null}
          </>
        ) : (
          <CareerGrid
            rows={visible}
            bookmarks={bookmarks}
            onSave={handleSave}
            onOpen={setOpenSlug}
          />
        )}
      </section>

      <CareerModal
        career={openRow ? getCareer(openRow.slug) ?? null : null}
        score={openRow?.score ?? null}
        reasons={
          matches.find((match) => match.slug === openSlug)?.topReasons ?? []
        }
        isSaved={openSlug ? bookmarks.includes(openSlug) : false}
        onToggleSave={handleSave}
        onOpenCareer={setOpenSlug}
        open={openSlug !== null}
        onOpenChange={(next) => {
          if (!next) setOpenSlug(null);
        }}
      />
    </main>
  );
}

interface CareerGridProps {
  rows: Row[];
  bookmarks: string[];
  onSave: (slug: string) => void;
  onOpen: (slug: string) => void;
}

/** Static grid — module-level so sections share one layout definition. */
function CareerGrid({ rows, bookmarks, onSave, onOpen }: CareerGridProps) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {rows.map((row) => {
        const career = getCareer(row.slug);
        if (!career) return null;
        return (
          <li key={row.slug}>
            <CareerCard
              career={career}
              alignmentPercent={row.score}
              reason={row.reason}
              isSaved={bookmarks.includes(row.slug)}
              onSave={onSave}
              onClick={onOpen}
            />
          </li>
        );
      })}
    </ul>
  );
}
