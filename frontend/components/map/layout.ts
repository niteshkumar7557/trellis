// Lays a subject out as a graph that grows upward: foundations at the bottom,
// the goal's targets near the top — the way a plant climbs a trellis.
//
// Two levels. Big topics are laid out by dagre. A big topic you haven't reached is
// a single closed node; one you have reached opens into a frame holding its
// subtopics, prerequisites lower down inside the frame too.

import dagre from "@dagrejs/dagre";
import { bigTopicsOf, edges, kids, topicById } from "@/lib/data";
import type { SubjectId, Topic } from "@/lib/types";

export const NODE_W = 188;
export const NODE_H = 36;
export const BIG_W = 212;
export const BIG_H = 58;

const COLS = 3;
const GAP_X = 12;
/** Room between rows inside a frame, so the arrows between them aren't crushed. */
const GAP_Y = 24;
const PAD = 14;
const HEAD = 44;

export interface Box {
  x: number; // top-left
  y: number;
  w: number;
  h: number;
}

export interface LaidNode extends Box {
  topic: Topic;
  /** A big topic drawn closed, a big topic drawn open as a frame, or a subtopic inside one. */
  kind: "closed" | "frame" | "sub";
}

export interface LaidEdge {
  /** The dependent topic. */
  from: string;
  /** Its prerequisite. */
  to: string;
  kind: "needs" | "helps";
  /** Between two big topics, or two subtopics inside the same frame. */
  level: "big" | "sub";
  /** Drawn from the prerequisite (below) up to the dependent, so arrowheads point the way you learn. */
  d: string;
  /** Halfway along the line. */
  mid: Point;
  /** Points along the line, from the prerequisite to the dependent, for placing its name. */
  trail: Point[];
  /** Where the arrowhead goes, turned to follow the line's last few pixels. */
  head: Head;
}

export interface Head {
  x: number;
  y: number;
  /** Degrees. */
  angle: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface Layout {
  subjectId: SubjectId;
  nodes: LaidNode[];
  edges: LaidEdge[];
  byId: Map<string, LaidNode>;
  width: number;
  height: number;
}

const cache = new Map<string, Layout>();

const SIZES = {
  full: { nodesep: 28, ranksep: 56, margin: 40 },
  /** For the miniature: closed big topics only, packed tight so the shape reads at a glance. */
  mini: { nodesep: 8, ranksep: 26, margin: 4 },
};

/** Where each subtopic sits inside its frame, relative to the frame's top-left. */
function arrangeFrame(bigId: string) {
  const inside = kids(bigId);
  const ids = new Set(inside.map((t) => t.id));
  const local = new Map<string, number>();
  const depth = (id: string): number => {
    const hit = local.get(id);
    if (hit !== undefined) return hit;
    const d = edges
      .filter((e) => e.kind === "needs" && e.from === id && ids.has(e.to))
      .reduce((m, e) => Math.max(m, depth(e.to) + 1), 0);
    local.set(id, d);
    return d;
  };
  // Rows from the bottom up: shallowest first, wrapped at COLS per row. Each level is
  // ordered by where its prerequisites sit, so links run up rather than across.
  const rows: Topic[][] = [];
  const where = new Map<string, number>();
  const maxDepth = Math.max(0, ...inside.map((t) => depth(t.id)));
  for (let d = 0; d <= maxDepth; d++) {
    const level = inside.filter((t) => depth(t.id) === d);
    const pull = (t: Topic) => {
      const pre = edges.filter((e) => e.kind === "needs" && e.from === t.id && where.has(e.to)).map((e) => where.get(e.to)!);
      return pre.length ? pre.reduce((a, b) => a + b, 0) / pre.length : 0.5;
    };
    if (d > 0) level.sort((a, b) => pull(a) - pull(b));
    // Prerequisite-free items go to the outside so the linked ones stay together.
    else level.sort((a, b) => Number(!edges.some((e) => e.to === a.id && ids.has(e.from))) - Number(!edges.some((e) => e.to === b.id && ids.has(e.from))));
    level.forEach((t, i) => where.set(t.id, level.length > 1 ? i / (level.length - 1) : 0.5));
    for (let i = 0; i < level.length; i += COLS) rows.push(level.slice(i, i + COLS));
  }
  const cols = Math.min(COLS, Math.max(...rows.map((r) => r.length)));
  const w = PAD * 2 + cols * NODE_W + (cols - 1) * GAP_X;
  const h = HEAD + rows.length * NODE_H + (rows.length - 1) * GAP_Y + PAD;
  const spots = new Map<string, { x: number; y: number }>();
  rows.forEach((row, r) => {
    const top = h - PAD - (r + 1) * NODE_H - r * GAP_Y;
    const rowW = row.length * NODE_W + (row.length - 1) * GAP_X;
    row.forEach((t, i) => spots.set(t.id, { x: (w - rowW) / 2 + i * (NODE_W + GAP_X), y: top }));
  });
  return { w, h, spots };
}

export function layoutFor(subjectId: SubjectId, open: Set<string>, size: keyof typeof SIZES = "full"): Layout {
  const openIds = size === "mini" ? [] : [...open].filter((id) => topicById.get(id)?.subjectId === subjectId).sort();
  const key = `${subjectId}:${size}:${openIds.join(",")}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const z = SIZES[size];
  const isOpen = new Set(openIds);

  const bigs = bigTopicsOf(subjectId);
  const bigIds = new Set(bigs.map((t) => t.id));
  const frames = new Map(openIds.map((id) => [id, arrangeFrame(id)]));

  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: "BT", nodesep: z.nodesep, ranksep: z.ranksep, marginx: z.margin, marginy: z.margin });
  g.setDefaultEdgeLabel(() => ({}));
  for (const t of bigs) {
    const f = frames.get(t.id);
    if (size === "mini") g.setNode(t.id, { width: 30, height: 12 });
    else g.setNode(t.id, f ? { width: f.w, height: f.h } : { width: BIG_W, height: BIG_H });
  }
  const bigEdges = edges.filter((e) => bigIds.has(e.from) && bigIds.has(e.to));
  // Only hard prerequisites decide the levels; soft ones are drawn over the result.
  for (const e of bigEdges) if (e.kind === "needs") g.setEdge(e.to, e.from);
  dagre.layout(g);

  const nodes: LaidNode[] = [];
  for (const topic of bigs) {
    const n = g.node(topic.id);
    const box = { x: n.x - n.width / 2, y: n.y - n.height / 2, w: n.width, h: n.height };
    nodes.push({ topic, kind: isOpen.has(topic.id) ? "frame" : "closed", ...box });
    const f = frames.get(topic.id);
    if (!f) continue;
    for (const child of kids(topic.id)) {
      const s = f.spots.get(child.id)!;
      nodes.push({ topic: child, kind: "sub", x: box.x + s.x, y: box.y + s.y, w: NODE_W, h: NODE_H });
    }
  }
  const byId = new Map(nodes.map((n) => [n.topic.id, n]));

  const laid: LaidEdge[] = [];
  for (const e of bigEdges) {
    if (e.kind === "needs") {
      const pts = (g.edge(e.to, e.from).points as Point[]) ?? [];
      laid.push({ ...e, level: "big", ...smooth(pts), mid: middle(pts), trail: pts });
    } else {
      laid.push({ ...e, level: "big", ...link(byId.get(e.to)!, byId.get(e.from)!) });
    }
  }
  // Inside a frame, every hard link between two of its subtopics is drawn.
  for (const e of edges) {
    if (e.kind !== "needs") continue;
    const a = byId.get(e.from);
    const b = byId.get(e.to);
    if (a?.kind === "sub" && b?.kind === "sub" && a.topic.parentId === b.topic.parentId) {
      laid.push({ ...e, level: "sub", ...link(b, a) });
    }
  }

  const info = g.graph();
  const layout: Layout = { subjectId, nodes, edges: laid, byId, width: info.width ?? 0, height: info.height ?? 0 };
  cache.set(key, layout);
  return layout;
}

/** The node that stands for a topic on this layout: itself, or its closed big topic. */
export function shownAs(id: string, layout: Layout): LaidNode | undefined {
  return layout.byId.get(id) ?? layout.byId.get(topicById.get(id)?.parentId ?? "");
}

/** A curve from a prerequisite up to its dependent, whatever their sizes, and its midpoint. */
export function link(pre: Box, dep: Box): { d: string; mid: Point; trail: Point[]; head: Head } {
  const sx = pre.x + pre.w / 2;
  const ex = dep.x + dep.w / 2;
  const above = dep.y + dep.h <= pre.y + 1;
  const sY = above ? pre.y : pre.y + pre.h;
  const eY = above ? dep.y + dep.h : dep.y;
  const bend = Math.max(18, Math.abs(eY - sY) / 2);
  const dir = above ? -1 : 1;
  const c1 = sY + dir * bend;
  const c2 = eY - dir * bend;
  // A cubic Bézier at t = ½.
  const at = (t: number): Point => {
    const u = 1 - t;
    return {
      x: u * u * u * sx + 3 * u * u * t * sx + 3 * u * t * t * ex + t * t * t * ex,
      y: u * u * u * sY + 3 * u * u * t * c1 + 3 * u * t * t * c2 + t * t * t * eY,
    };
  };
  const trail = Array.from({ length: 13 }, (_, i) => at(i / 12));
  return {
    d: `M${sx},${sY} C${sx},${c1} ${ex},${c2} ${ex},${eY}`,
    mid: at(0.5),
    trail,
    head: headOf({ x: sx, y: sY }, { x: sx, y: c1 }, { x: ex, y: c2 }, { x: ex, y: eY }),
  };
}

export const connect = (pre: Box, dep: Box) => link(pre, dep).d;

/** The point a fraction of the way along a trail, by distance. */
export function along(trail: Point[], t: number): Point {
  if (trail.length < 2) return trail[0] ?? { x: 0, y: 0 };
  const seg = trail.slice(1).map((p, i) => Math.hypot(p.x - trail[i].x, p.y - trail[i].y));
  let left = seg.reduce((a, b) => a + b, 0) * t;
  for (let i = 0; i < seg.length; i++) {
    if (left <= seg[i] || i === seg.length - 1) {
      const k = seg[i] ? Math.min(1, left / seg[i]) : 0;
      return { x: trail[i].x + (trail[i + 1].x - trail[i].x) * k, y: trail[i].y + (trail[i + 1].y - trail[i].y) * k };
    }
    left -= seg[i];
  }
  return trail[trail.length - 1];
}

/** The middle of dagre's points; the smoothed curve passes through them. */
function middle(pts: Point[]): Point {
  if (!pts.length) return { x: 0, y: 0 };
  if (pts.length % 2) return pts[(pts.length - 1) / 2];
  const a = pts[pts.length / 2 - 1];
  const b = pts[pts.length / 2];
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

/** Catmull-Rom through dagre's points, as cubic Béziers. */
function smooth(pts: Point[]): { d: string; head: Head } {
  if (pts.length < 2) return { d: "", head: { x: 0, y: 0, angle: -90 } };
  if (pts.length === 2) {
    const [a, b] = pts;
    return { d: `M${a.x},${a.y} L${b.x},${b.y}`, head: { x: b.x, y: b.y, angle: (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI } };
  }
  let d = `M${pts[0].x},${pts[0].y}`;
  let head: Head = { x: 0, y: 0, angle: -90 };
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C${c1x},${c1y} ${c2x},${c2y} ${p2.x},${p2.y}`;
    if (i === pts.length - 2) head = headOf(p1, { x: c1x, y: c1y }, { x: c2x, y: c2y }, p2);
  }
  return { d, head };
}

/** How long an arrowhead is: it turns to match this much of the end of its line. */
export const HEAD_LENGTH = 8;

/**
 * An arrowhead for a line ending in this cubic: at its tip, turned to match the direction of
 * the last HEAD_LENGTH pixels it covers (not the single last pixel, which on a bend points
 * somewhere else and makes the head look crooked).
 */
function headOf(p0: Point, c1: Point, c2: Point, p3: Point): Head {
  const at = (t: number): Point => {
    const u = 1 - t;
    return {
      x: u * u * u * p0.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * p3.x,
      y: u * u * u * p0.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * p3.y,
    };
  };
  let back = at(0);
  for (let t = 0.98; t >= 0; t -= 0.02) {
    const q = at(t);
    if (Math.hypot(p3.x - q.x, p3.y - q.y) >= HEAD_LENGTH) {
      back = q;
      break;
    }
  }
  return { x: p3.x, y: p3.y, angle: (Math.atan2(p3.y - back.y, p3.x - back.x) * 180) / Math.PI };
}
