import { z } from "zod";
import raw from "@/data/roadmaps/demo.json";

const resourceSchema = z.object({
  type: z.enum(["course", "documentation", "tutorial", "article", "video", "project"]),
  title: z.string(),
  provider: z.string(),
  url: z.string().url(),
  duration_minutes: z.number(),
  difficulty: z.string(),
});

const nodeSchema = z.object({
  key: z.string(),
  type: z.enum(["skill", "project", "proof", "milestone"]),
  title: z.string(),
  description: z.string(),
  tier: z.number().int().min(0),
  lane: z.number().int().min(0),
  estimated_hours: z.number(),
  resources: z.array(resourceSchema),
});

const edgeSchema = z.object({
  node_key: z.string(),
  depends_on_key: z.string(),
});

const roadmapSchema = z.object({
  schema_version: z.literal(1),
  career_slug: z.string(),
  title: z.string(),
  nodes: z.array(nodeSchema).min(1),
  edges: z.array(edgeSchema),
});

export type DemoNode = z.infer<typeof nodeSchema>;
export type DemoEdge = z.infer<typeof edgeSchema>;
export type NodeStatus = "completed" | "locked" | "available";

const parsed = roadmapSchema.parse(raw);

const KEYS = new Set(parsed.nodes.map((n) => n.key));
for (const e of parsed.edges) {
  const missing = [e.node_key, e.depends_on_key].filter((k) => !KEYS.has(k));
  if (missing.length > 0 && process.env.NODE_ENV !== "production") {
    throw new Error(`[roadmap-demo] edge references missing key: ${missing.join(", ")}`);
  }
}

// Depth-first cycle check; throws in dev so a bad DAG fails loudly.
function assertAcyclic(): void {
  const adj = new Map<string, string[]>();
  for (const n of parsed.nodes) adj.set(n.key, []);
  for (const e of parsed.edges) adj.get(e.node_key)?.push(e.depends_on_key);
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (key: string): void => {
    if (visited.has(key)) return;
    if (visiting.has(key)) throw new Error(`[roadmap-demo] cycle detected at ${key}`);
    visiting.add(key);
    for (const next of adj.get(key) ?? []) visit(next);
    visiting.delete(key);
    visited.add(key);
  };
  for (const n of parsed.nodes) visit(n.key);
}
if (process.env.NODE_ENV !== "production") assertAcyclic();

const PREREQS: Record<string, string[]> = {};
for (const n of parsed.nodes) PREREQS[n.key] = [];
for (const e of parsed.edges) PREREQS[e.node_key].push(e.depends_on_key);

const DEPENDENTS: Record<string, string[]> = {};
for (const n of parsed.nodes) DEPENDENTS[n.key] = [];
for (const e of parsed.edges) DEPENDENTS[e.depends_on_key].push(e.node_key);

/** Derived status: completed > locked (any prereq undone) > available. */
export function getStatus(node: DemoNode, doneSet: Set<string>): NodeStatus {
  if (doneSet.has(node.key)) return "completed";
  const blocked = (PREREQS[node.key] ?? []).some((k) => !doneSet.has(k));
  return blocked ? "locked" : "available";
}

export function getPrereqs(key: string): string[] {
  return PREREQS[key] ?? [];
}

export function getDependents(key: string): string[] {
  return DEPENDENTS[key] ?? [];
}

// Fixed grid positions: x = tier, y = lane. No layout library.
export const NODE_W = 176;
export const NODE_H = 76;
const TIER_X = 260;
const LANE_Y = 180;
const ORIGIN_X = 60;
const ORIGIN_Y = 60;

export function layout(node: DemoNode): { x: number; y: number } {
  return { x: ORIGIN_X + node.tier * TIER_X, y: ORIGIN_Y + node.lane * LANE_Y };
}

export const VIEW_W = ORIGIN_X * 2 + 4 * TIER_X + NODE_W;
export const VIEW_H = ORIGIN_Y * 2 + 2 * LANE_Y + NODE_H;

export interface DemoRoadmap {
  title: string;
  careerSlug: string;
  nodes: DemoNode[];
  edges: DemoEdge[];
  prereqs: Record<string, string[]>;
}

export function loadDemoRoadmap(): DemoRoadmap {
  return {
    title: parsed.title,
    careerSlug: parsed.career_slug,
    nodes: parsed.nodes,
    edges: parsed.edges,
    prereqs: PREREQS,
  };
}
