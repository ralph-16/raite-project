"use client";

import * as React from "react";
import { Check, Lock, Minus, Plus } from "lucide-react";
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
  NODE_H,
  NODE_W,
  VIEW_H,
  VIEW_W,
  getDependents,
  getStatus,
  layout,
  type DemoNode,
  type DemoRoadmap,
} from "@/lib/roadmap/demo";

const STORAGE_KEY = "kl.progress.demo";

function readStored(): string[] {
  try {
    const rawValue = window.localStorage.getItem(STORAGE_KEY);
    if (!rawValue) return [];
    const value: unknown = JSON.parse(rawValue);
    return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

function wrapTitle(title: string): [string, string | null] {
  const words = title.split(" ");
  if (title.length <= 18) return [title, null];
  let first = "";
  for (const w of words) {
    if ((first + " " + w).trim().length > 16) break;
    first = (first + " " + w).trim();
  }
  const rest = title.slice(first.length).trim();
  return [first || words[0], rest ? (rest.length > 18 ? rest.slice(0, 17) + "…" : rest) : null];
}

interface Transform {
  x: number;
  y: number;
  k: number;
}

export function RoadmapDemo({ roadmap }: { roadmap: DemoRoadmap }) {
  const [doneKeys, setDoneKeys] = React.useState<string[]>([]);
  const [selectedKey, setSelectedKey] = React.useState<string | null>(null);
  const [lastDone, setLastDone] = React.useState<string | null>(null);
  const [focusedKey, setFocusedKey] = React.useState<string | null>(null);
  const [t, setT] = React.useState<Transform>({ x: 0, y: 0, k: 1 });
  const dragRef = React.useRef<{ px: number; py: number } | null>(null);
  const svgRef = React.useRef<SVGSVGElement | null>(null);

  React.useEffect(() => {
    setDoneKeys(readStored());
  }, []);

  React.useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (e: WheelEvent): void => {
      e.preventDefault();
      setT((prev) => ({ ...prev, k: Math.min(2, Math.max(0.5, prev.k - e.deltaY * 0.001)) }));
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, []);

  const doneSet = React.useMemo(() => new Set(doneKeys), [doneKeys]);
  const byKey = React.useMemo(() => new Map(roadmap.nodes.map((n) => [n.key, n])), [roadmap]);
  const justUnlocked = React.useMemo(() => {
    if (!lastDone) return new Set<string>();
    return new Set(getDependents(lastDone).filter((k) => getStatus(byKey.get(k)!, doneSet) === "available"));
  }, [lastDone, doneSet, byKey]);

  const persist = (next: string[]): void => {
    setDoneKeys(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Storage unavailable; progress still works for this session.
    }
  };

  const selected: DemoNode | null = selectedKey ? (byKey.get(selectedKey) ?? null) : null;
  const selectedStatus = selected ? getStatus(selected, doneSet) : null;
  const selectedPrereqs = selected
    ? (roadmap.prereqs[selected.key] ?? []).map((k) => byKey.get(k)?.title ?? k)
    : [];

  const zoomBy = (d: number): void =>
    setT((prev) => ({ ...prev, k: Math.min(2, Math.max(0.5, prev.k + d)) }));

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4 px-6 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-sans text-2xl font-bold tracking-tight">{roadmap.title}</h1>
          <p className="text-sm text-muted-foreground">
            {doneKeys.length} of {roadmap.nodes.length} complete
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" aria-label="Zoom out" onClick={() => zoomBy(-0.2)}>
            <Minus />
          </Button>
          <Button variant="outline" size="icon" aria-label="Zoom in" onClick={() => zoomBy(0.2)}>
            <Plus />
          </Button>
          <Button variant="outline" onClick={() => setT({ x: 0, y: 0, k: 1 })}>
            Fit
          </Button>
          <Button variant="outline" onClick={() => { persist([]); setLastDone(null); }}>
            Reset
          </Button>
        </div>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-muted" role="progressbar"
        aria-valuenow={doneKeys.length} aria-valuemin={0} aria-valuemax={roadmap.nodes.length}>
        <div
          className="h-full origin-left bg-primary transition-transform"
          style={{ transform: `scaleX(${doneKeys.length / roadmap.nodes.length})` }}
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
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
            setT((prev) => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
          }}
          onPointerUp={() => { dragRef.current = null; }}
        >
          <g transform={`translate(${t.x} ${t.y}) scale(${t.k})`}>
            {roadmap.edges.map((e) => {
              const a = layout(byKey.get(e.depends_on_key)!);
              const b = layout(byKey.get(e.node_key)!);
              const x1 = a.x + NODE_W;
              const y1 = a.y + NODE_H / 2;
              const x2 = b.x;
              const y2 = b.y + NODE_H / 2;
              const lit = doneSet.has(e.depends_on_key);
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
              const status = getStatus(node, doneSet);
              const [line1, line2] = wrapTitle(node.title);
              const pop = lastDone === node.key || justUnlocked.has(node.key);
              return (
                <g
                  key={node.key}
                  transform={`translate(${x} ${y})`}
                  tabIndex={0}
                  role="treeitem"
                  aria-label={`${node.title}, ${status}`}
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
                      status === "completed" && "fill-primary stroke-primary",
                      status === "available" && "fill-card stroke-lory-yellow",
                      status === "locked" && "fill-muted stroke-border opacity-60",
                      focusedKey === node.key && "stroke-ring"
                    )}
                    strokeWidth={status === "available" || focusedKey === node.key ? 3 : 2}
                  />
                  <text
                    x={16}
                    y={30}
                    className={cn(
                      "font-sans text-[13px] font-semibold",
                      status === "completed" ? "fill-primary-foreground" : "fill-foreground"
                    )}
                  >
                    {line1}
                  </text>
                  {line2 ? (
                    <text
                      x={16}
                      y={46}
                      className={cn(
                        "font-sans text-[13px] font-semibold",
                        status === "completed" ? "fill-primary-foreground" : "fill-foreground"
                      )}
                    >
                      {line2}
                    </text>
                  ) : null}
                  <text
                    x={16}
                    y={62}
                    className={cn(
                      "font-sans text-[11px] font-medium",
                      status === "completed" ? "fill-primary-foreground" : "fill-muted-foreground"
                    )}
                  >
                    {node.type} · {node.estimated_hours}h
                  </text>
                  {status === "completed" ? (
                    <Check x={NODE_W - 28} y={12} width={16} height={16} className="stroke-primary-foreground" />
                  ) : null}
                  {status === "locked" ? (
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
          {selected && selectedStatus ? (
            <div className="flex h-full flex-col gap-4 overflow-y-auto">
              <SheetHeader>
                <SheetTitle>{selected.title}</SheetTitle>
                <SheetDescription>
                  {selected.type} · {selected.estimated_hours}h · {selectedStatus}
                </SheetDescription>
              </SheetHeader>
              <p className="text-sm text-muted-foreground">{selected.description}</p>
              {selectedStatus === "locked" ? (
                <p className="rounded-xl border border-border bg-muted px-3 py-2 text-sm">
                  Unlocks after: {selectedPrereqs.join(", ")}
                </p>
              ) : null}
              <div className="flex flex-col gap-2">
                <h2 className="font-sans text-sm font-semibold">Sample resources</h2>
                {selected.resources.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No resources for this milestone.</p>
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
                          {r.type} · {r.provider} · {r.duration_minutes} min · {r.difficulty}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="mt-auto flex gap-2 pb-2">
                {selectedStatus === "completed" ? (
                  <Button
                    variant="outline"
                    onClick={() => {
                      persist(doneKeys.filter((k) => k !== selected.key));
                      setLastDone(null);
                    }}
                  >
                    Undo
                  </Button>
                ) : (
                  <Button
                    disabled={selectedStatus === "locked"}
                    title={selectedStatus === "locked" ? `Unlocks after: ${selectedPrereqs.join(", ")}` : undefined}
                    onClick={() => {
                      persist([...doneKeys, selected.key]);
                      setLastDone(selected.key);
                    }}
                  >
                    {selectedStatus === "locked" ? `Locked: finish ${selectedPrereqs.join(", ")}` : "Mark complete"}
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
