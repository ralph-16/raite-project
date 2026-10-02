"use client";

import * as React from "react";
import { Check, Lock, Minus, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import {
  computeNodeStates,
  prerequisitesOf,
  roadmapPercent,
} from "@/lib/mock/roadmaps";
import { loadProgress, saveProgress } from "@/lib/mock/storage";
import type {
  NodeProgressStatus,
  Roadmap,
  RoadmapNode,
} from "@/lib/mock/types";

const NODE_W = 176;
const NODE_H = 76;
const TIER_X = 260;
const LANE_Y = 180;
const ORIGIN = 60;

function layout(node: RoadmapNode): { x: number; y: number } {
  return { x: ORIGIN + node.tier * TIER_X, y: ORIGIN + node.lane * LANE_Y };
}

function wrapTitle(title: string): [string, string | null] {
  const words = title.split(" ");
  if (title.length <= 18) return [title, null];
  let first = "";
  for (const w of words) {
    if (`${first} ${w}`.trim().length > 16) break;
    first = `${first} ${w}`.trim();
  }
  const rest = title.slice(first.length).trim();
  return [first || words[0], rest ? (rest.length > 18 ? `${rest.slice(0, 17)}…` : rest) : null];
}

export interface CareerRoadmapProps {
  roadmap: Roadmap;
  careerSlug: string;
  careerTitle: string;
  isSample: boolean;
}

export function CareerRoadmap({ roadmap, careerSlug, careerTitle, isSample }: CareerRoadmapProps) {
  const [statuses, setStatuses] = React.useState<Record<string, NodeProgressStatus>>({});
  const [selectedKey, setSelectedKey] = React.useState<string | null>(null);
  const [lastDone, setLastDone] = React.useState<string | null>(null);
  const [focusedKey, setFocusedKey] = React.useState<string | null>(null);
  const [pan, setPan] = React.useState({ x: 0, y: 0, k: 1 });
  const dragRef = React.useRef<{ px: number; py: number } | null>(null);
  const svgRef = React.useRef<SVGSVGElement | null>(null);

  React.useEffect(() => {
    setStatuses(loadProgress(careerSlug).nodes);
  }, [careerSlug]);

  React.useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (e: WheelEvent): void => {
      e.preventDefault();
      setPan((prev) => ({ ...prev, k: Math.min(2, Math.max(0.5, prev.k - e.deltaY * 0.001)) }));
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, []);

  const byKey = React.useMemo(() => new Map(roadmap.nodes.map((n) => [n.key, n])), [roadmap]);
  const states = React.useMemo(
    () => computeNodeStates(roadmap.nodes, roadmap.edges, statuses),
    [roadmap, statuses]
  );
  const percent = roadmapPercent(roadmap.nodes, statuses);
  const doneCount = Object.values(statuses).filter((s) => s === "completed").length;

  const justUnlocked = React.useMemo(() => {
    if (!lastDone) return new Set<string>();
    return new Set(
      roadmap.nodes
        .filter((n) => prerequisitesOf(roadmap.edges, n.key).includes(lastDone))
        .filter((n) => states[n.key] === "available")
        .map((n) => n.key)
    );
  }, [lastDone, roadmap, states]);

  const maxTier = Math.max(...roadmap.nodes.map((n) => n.tier));
  const maxLane = Math.max(...roadmap.nodes.map((n) => n.lane));
  const viewW = ORIGIN * 2 + maxTier * TIER_X + NODE_W;
  const viewH = ORIGIN * 2 + maxLane * LANE_Y + NODE_H;

  const persist = (next: Record<string, NodeProgressStatus>): void => {
    setStatuses(next);
    saveProgress(careerSlug, { nodes: next, updatedAt: new Date().toISOString() });
  };

  const selected: RoadmapNode | null = selectedKey ? (byKey.get(selectedKey) ?? null) : null;
  const selectedState = selected ? states[selected.key] : null;
  const selectedPrereqs = selected
    ? prerequisitesOf(roadmap.edges, selected.key).map((k) => byKey.get(k)?.title ?? k)
    : [];

  const zoomBy = (d: number): void =>
    setPan((prev) => ({ ...prev, k: Math.min(2, Math.max(0.5, prev.k + d)) }));

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4 px-6 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-sans text-2xl font-bold tracking-tight">{careerTitle}</h1>
            {isSample ? <Badge variant="quiet">Sample data</Badge> : null}
          </div>
          <p className="text-sm text-muted-foreground">
            {doneCount} of {roadmap.nodes.length} complete · Lory suggests this path, you decide
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" aria-label="Zoom out" onClick={() => zoomBy(-0.2)}>
            <Minus />
          </Button>
          <Button variant="outline" size="icon" aria-label="Zoom in" onClick={() => zoomBy(0.2)}>
            <Plus />
          </Button>
          <Button variant="outline" onClick={() => setPan({ x: 0, y: 0, k: 1 })}>
            Fit
          </Button>
          <Button variant="outline" onClick={() => { persist({}); setLastDone(null); }}>
            Reset
          </Button>
        </div>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-muted" role="progressbar"
        aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label="Roadmap progress">
        <div
          className="h-full origin-left bg-primary transition-transform"
          style={{ transform: `scaleX(${percent / 100})` }}
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${viewW} ${viewH}`}
          className="h-[560px] w-full cursor-grab touch-none active:cursor-grabbing"
          role="tree"
          aria-label={`${roadmap.title} skill tree`}
          onPointerDown={(e) => {
            // Nodes handle their own clicks — capturing here would retarget
            // the click to the svg root and the drawer would never open.
            const target = e.target as Element | null;
            if (target && typeof target.closest === "function" && target.closest('[role="treeitem"]')) return;
            dragRef.current = { px: e.clientX, py: e.clientY };
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            const d = dragRef.current;
            if (!d) return;
            const dx = e.clientX - d.px;
            const dy = e.clientY - d.py;
            dragRef.current = { px: e.clientX, py: e.clientY };
            setPan((prev) => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
          }}
          onPointerUp={() => { dragRef.current = null; }}
        >
          <g transform={`translate(${pan.x} ${pan.y}) scale(${pan.k})`}>
            {roadmap.edges.map((e) => {
              const a = layout(byKey.get(e.depends_on_key)!);
              const b = layout(byKey.get(e.node_key)!);
              const x1 = a.x + NODE_W;
              const y1 = a.y + NODE_H / 2;
              const x2 = b.x;
              const y2 = b.y + NODE_H / 2;
              const lit = statuses[e.depends_on_key] === "completed";
              return (
                <path
                  key={`${e.depends_on_key}-${e.node_key}`}
                  d={`M ${x1} ${y1} C ${x1 + 60} ${y1}, ${x2 - 60} ${y2}, ${x2} ${y2}`}
                  fill="none"
                  className={lit ? "stroke-primary" : "stroke-border"}
                  strokeWidth={lit ? 2.5 : 1.5}
                />
              );
            })}
            {roadmap.nodes.map((node) => {
              const { x, y } = layout(node);
              const state = states[node.key];
              const [line1, line2] = wrapTitle(node.title);
              const pop = lastDone === node.key || justUnlocked.has(node.key);
              return (
                <g
                  key={node.key}
                  transform={`translate(${x} ${y})`}
                  tabIndex={0}
                  role="treeitem"
                  aria-label={`${node.title}, ${state}`}
                  className={cn("cursor-pointer outline-none", pop && "motion-safe:animate-pop-in")}
                  onClick={() => setSelectedKey(node.key)}
                  onKeyDown={(ev) => {
                    if (ev.key === "Enter" || ev.key === " ") {
                      ev.preventDefault();
                      setSelectedKey(node.key);
                    }
                  }}
                  onFocus={() => setFocusedKey(node.key)}
                  onBlur={() => setFocusedKey((f) => (f === node.key ? null : f))}
                >
                  <rect
                    width={NODE_W}
                    height={NODE_H}
                    rx={12}
                    className={cn(
                      "stroke-2",
                      state === "completed" && "fill-primary stroke-primary",
                      state === "in_progress" && "fill-card stroke-primary",
                      state === "available" && "fill-card stroke-lory-yellow",
                      state === "locked" && "fill-muted stroke-border opacity-60",
                      focusedKey === node.key && "stroke-ring"
                    )}
                    strokeWidth={state === "available" || state === "in_progress" || focusedKey === node.key ? 3 : 2}
                  />
                  <text x={16} y={30}
                    className={cn("font-sans text-[13px] font-semibold",
                      state === "completed" ? "fill-primary-foreground" : "fill-foreground")}>
                    {line1}
                  </text>
                  {line2 ? (
                    <text x={16} y={46}
                      className={cn("font-sans text-[13px] font-semibold",
                        state === "completed" ? "fill-primary-foreground" : "fill-foreground")}>
                      {line2}
                    </text>
                  ) : null}
                  <text x={16} y={62}
                    className={cn("font-sans text-[11px] font-medium",
                      state === "completed" ? "fill-primary-foreground" : "fill-muted-foreground")}>
                    {node.type} · {node.estimated_hours}h
                  </text>
                  {state === "completed" ? (
                    <Check x={NODE_W - 28} y={12} width={16} height={16} className="stroke-primary-foreground" />
                  ) : null}
                  {state === "locked" ? (
                    <Lock x={NODE_W - 28} y={12} width={16} height={16} className="stroke-muted-foreground" />
                  ) : null}
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      <Sheet open={selected !== null} onOpenChange={(open) => { if (!open) setSelectedKey(null); }}>
        <SheetContent side="right" aria-label={selected ? `${selected.title} details` : undefined}>
          {selected && selectedState ? (
            <div className="flex h-full flex-col gap-4 overflow-y-auto">
              <SheetHeader>
                <SheetTitle>{selected.title}</SheetTitle>
                <SheetDescription>
                  {selected.type} · {selected.estimated_hours}h · {selectedState} · Lory suggests
                </SheetDescription>
              </SheetHeader>
              <p className="text-sm text-muted-foreground">{selected.description}</p>
              {selectedState === "locked" ? (
                <p className="rounded-xl border border-border bg-muted px-3 py-2 text-sm">
                  Unlocks after: {selectedPrereqs.join(", ")}
                </p>
              ) : null}
              <div className="flex flex-col gap-2">
                <h2 className="font-sans text-sm font-semibold">Sample resources</h2>
                {selected.resources.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No resources listed for this step.</p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {selected.resources.map((r) => (
                      <li key={r.url} className="rounded-xl border border-border px-3 py-2">
                        <a
                          href={r.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-sans text-sm font-medium text-primary underline-offset-4 hover:underline"
                        >
                          {r.title}
                        </a>
                        <p className="text-xs text-muted-foreground">
                          {r.type} · {r.provider} · {r.duration_minutes} min · {r.difficulty}/5{r.note ? ` — ${r.note}` : ""}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="mt-auto flex gap-2 pb-2">
                {selectedState === "completed" ? (
                  <Button variant="outline" onClick={() => { persist({ ...statuses, [selected.key]: "not_started" }); setLastDone(null); }}>
                    Undo
                  </Button>
                ) : (
                  <Button
                    disabled={selectedState === "locked"}
                    title={selectedState === "locked" ? `Unlocks after: ${selectedPrereqs.join(", ")}` : undefined}
                    onClick={() => { persist({ ...statuses, [selected.key]: "completed" }); setLastDone(selected.key); }}
                  >
                    {selectedState === "locked" ? `Locked: finish ${selectedPrereqs.join(", ")}` : "Mark complete"}
                  </Button>
                )}
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
