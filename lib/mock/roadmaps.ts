/**
 * Roadmap loader + graph rules.
 *
 * Reads `/data/roadmaps/<career_slug>.json`, validates it with Zod, checks
 * the graph is a real DAG, and returns `null` when no roadmap exists for a
 * slug (the UI then shows Lory's friendly "still drawing this map" state).
 *
 * Swap point: replace `ROADMAP_MODULES` with a Supabase read of
 * `get_roadmap_definition(career_id)` — the returned shape is identical to
 * `supabase/DATABASE.md`'s roadmap JSON.
 */

import { roadmapSchema } from "./schemas";
import type {
  NodeProgressStatus,
  NodeState,
  Roadmap,
  RoadmapEdge,
  RoadmapNode,
} from "./types";

/**
 * Static imports keep the JSON in the client bundle (no fetch, no API route).
 * One entry per authored roadmap — slugs without an entry return `null`.
 */
const ROADMAP_MODULES: Record<
  string,
  () => Promise<{ default: unknown }>
> = {
  "software-developer": () =>
    import("@/data/roadmaps/software-developer.json"),
  "data-analyst": () => import("@/data/roadmaps/data-analyst.json"),
};

/** True when this career has a drawable map (drives the CTA state). */
export function hasRoadmap(careerSlug: string): boolean {
  return Object.prototype.hasOwnProperty.call(ROADMAP_MODULES, careerSlug);
}

/** Loads and validates one roadmap. `null` = no map authored (not an error). */
export async function loadRoadmap(careerSlug: string): Promise<Roadmap | null> {
  const load = ROADMAP_MODULES[careerSlug];
  if (!load) return null;
  try {
    const loaded = await load();
    const result = validateRoadmap(loaded.default);
    if (result.errors.length) {
      console.warn(
        `[roadmap] ${careerSlug} failed validation:`,
        result.errors.join("; ")
      );
      return null;
    }
    return result.roadmap;
  } catch (error) {
    console.warn(`[roadmap] could not load ${careerSlug}`, error);
    return null;
  }
}

/* ------------------------------------------------------------------ *
 * Validation — Zod shape + graph integrity
 * ------------------------------------------------------------------ */

export interface RoadmapValidation {
  roadmap: Roadmap | null;
  errors: string[];
}

export function validateRoadmap(raw: unknown): RoadmapValidation {
  const parsed = roadmapSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      roadmap: null,
      errors: parsed.error.issues.map(
        (issue) => `${issue.path.join(".")}: ${issue.message}`
      ),
    };
  }

  const roadmap = parsed.data;
  const errors: string[] = [];

  const keys = new Set<string>();
  for (const node of roadmap.nodes) {
    if (keys.has(node.key)) errors.push(`duplicate node key: ${node.key}`);
    keys.add(node.key);
  }

  for (const edge of roadmap.edges) {
    if (!keys.has(edge.node_key)) {
      errors.push(`edge target missing: ${edge.node_key}`);
    }
    if (!keys.has(edge.depends_on_key)) {
      errors.push(`edge source missing: ${edge.depends_on_key}`);
    }
    if (edge.node_key === edge.depends_on_key) {
      errors.push(`self edge on: ${edge.node_key}`);
    }
  }

  if (errors.length) return { roadmap: null, errors };

  const cycle = findCycle(roadmap.nodes, roadmap.edges);
  if (cycle) errors.push(`cycle detected: ${cycle.join(" -> ")}`);

  return { roadmap: errors.length ? null : roadmap, errors };
}

/** Kahn's algorithm — returns the first cycle found, or `null` when acyclic. */
export function findCycle(
  nodes: RoadmapNode[],
  edges: RoadmapEdge[]
): string[] | null {
  const dependents = new Map<string, string[]>();
  const indegree = new Map<string, number>();
  for (const node of nodes) {
    dependents.set(node.key, []);
    indegree.set(node.key, 0);
  }
  for (const edge of edges) {
    dependents.get(edge.depends_on_key)?.push(edge.node_key);
    indegree.set(edge.node_key, (indegree.get(edge.node_key) ?? 0) + 1);
  }

  const queue = nodes
    .filter((node) => (indegree.get(node.key) ?? 0) === 0)
    .map((node) => node.key);
  let visited = 0;
  while (queue.length) {
    const key = queue.shift() as string;
    visited += 1;
    for (const next of dependents.get(key) ?? []) {
      const remaining = (indegree.get(next) ?? 0) - 1;
      indegree.set(next, remaining);
      if (remaining === 0) queue.push(next);
    }
  }
  if (visited === nodes.length) return null;
  const stuck = nodes
    .filter((node) => (indegree.get(node.key) ?? 0) > 0)
    .map((node) => node.key);
  return [...stuck, stuck[0]];
}

/* ------------------------------------------------------------------ *
 * Unlock rules — DATABASE.md: a node unlocks when ALL prerequisites
 * are complete (AND semantics). `locked` is derived, never stored.
 * ------------------------------------------------------------------ */

export function prerequisitesOf(
  edges: RoadmapEdge[],
  nodeKey: string
): string[] {
  return edges
    .filter((edge) => edge.node_key === nodeKey)
    .map((edge) => edge.depends_on_key);
}

/** Node states for one render pass, derived from stored progress + edges. */
export function computeNodeStates(
  nodes: RoadmapNode[],
  edges: RoadmapEdge[],
  statuses: Record<string, NodeProgressStatus>
): Record<string, NodeState> {
  const states: Record<string, NodeState> = {};
  for (const node of nodes) {
    const status = statuses[node.key] ?? "not_started";
    if (status === "completed") {
      states[node.key] = "completed";
      continue;
    }
    if (status === "in_progress") {
      states[node.key] = "in_progress";
      continue;
    }
    const open = prerequisitesOf(edges, node.key).every(
      (prerequisite) => (statuses[prerequisite] ?? "not_started") === "completed"
    );
    states[node.key] = open ? "available" : "locked";
  }
  return states;
}

/** 0–100 for the header progress bar (completed nodes ÷ total nodes). */
export function roadmapPercent(
  nodes: RoadmapNode[],
  statuses: Record<string, NodeProgressStatus>
): number {
  if (!nodes.length) return 0;
  const done = nodes.filter(
    (node) => (statuses[node.key] ?? "not_started") === "completed"
  ).length;
  return Math.round((done / nodes.length) * 100);
}
