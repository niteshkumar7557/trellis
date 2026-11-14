// Lays a subject out as a graph that grows upward: foundations at the bottom,
// the goal's targets near the top — the way a plant climbs a trellis.
//
// Two levels. Big topics are laid out by dagre. A big topic you haven't reached is
// a single closed node; one you have reached opens into a frame holding its
// subtopics, laid out inside it by a second dagre (arrangeFrame).

import dagre from "@dagrejs/dagre";
import { bigTopicsOf, edges, kids, topicById } from "@shared/data";
import type { SubjectId, Topic } from "@shared/types";

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
  /** Between two big topics, or two subtopics inside the same frame. A link between subtopics
   *  in different big topics is never drawn on its own: it shows as the line between their
   *  big topics (MapCanvas, `relationLines`). */
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
  full: { nodesep: 28, ranksep: 56, margin: 40, w: BIG_W, h: BIG_H },
  /** For the miniature: closed big topics only, packed tight so the shape reads at a glance. */
  mini: { nodesep: 8, ranksep: 26, margin: 4, w: 30, h: 12 },
  /**
   * For the landing page's hero: closed big topics drawn exactly as on the app's map, a
   * little smaller and packed closer, so the widest row (seven topics in React Native)
   * still fits a 1440px screen at close to full size.
   */
  plate: { nodesep: 12, ranksep: 30, margin: 12, w: 206, h: BIG_H },
};

/**
 * Where each subtopic sits inside its frame, relative to the frame's top-left, and the
 * points each link inside the frame passes through.
 *
 * Subtopics linked to each other inside the frame are laid out by dagre, the same way the
 * big topics are. Before 14 Nov 2026 they went in hand-made rows of three; a level wider than
 * three wrapped into a second row, and the lines from the row below then ran straight
 * through the boxes in between (View → Pressable through Switch). Dagre gives every level
 * one row and routes long links around the boxes. The frame gets wider instead, which is the
 * trade: a wide frame is easier to read than lines through names.
 *
 * Subtopics with no "needs" link to another one in the same frame (their prerequisites are
 * all in other big topics) have no line to route, so they sit in rows along the bottom of
 * the frame: the foundations of a frame are at its bottom, like the map's.
 */
function arrangeFrame(bigId: string) {
  const inside = kids(bigId);
  const ids = new Set(inside.map((t) => t.id));
  const inner = edges.filter((e) => e.kind === "needs" && ids.has(e.from) && ids.has(e.to));
  const linked = inside.filter((t) => inner.some((e) => e.from === t.id || e.to === t.id));
  const loose = inside.filter((t) => !linked.includes(t));

  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: "BT", nodesep: GAP_X, ranksep: GAP_Y, edgesep: 8, marginx: 0, marginy: 0 });
  g.setDefaultEdgeLabel(() => ({}));
  for (const t of linked) g.setNode(t.id, { width: NODE_W, height: NODE_H });
  for (const e of inner) g.setEdge(e.to, e.from);
  if (linked.length) dagre.layout(g);
  const gw = linked.length ? (g.graph().width ?? 0) : 0;
  const gh = linked.length ? (g.graph().height ?? 0) : 0;

  // The loose ones fill rows as wide as the dagre part (at least COLS), so the frame doesn't
  // grow sideways for them.
  const perRow = Math.max(COLS, Math.floor((gw + GAP_X) / (NODE_W + GAP_X)));
  const rows: Topic[][] = [];
  for (let i = 0; i < loose.length; i += perRow) rows.push(loose.slice(i, i + perRow));
  const rowW = (n: number) => n * NODE_W + (n - 1) * GAP_X;
  const innerW = Math.max(gw, ...rows.map((r) => rowW(r.length)));
  const bandTop = HEAD + gh + (gh && rows.length ? GAP_Y : 0);
  const w = PAD * 2 + innerW;
  const h = bandTop + rows.length * NODE_H + Math.max(0, rows.length - 1) * GAP_Y + PAD;

  const dx = PAD + (innerW - gw) / 2;
  const spots = new Map<string, Point>();
  for (const t of linked) {
    const n = g.node(t.id);
    spots.set(t.id, { x: dx + n.x - NODE_W / 2, y: HEAD + n.y - NODE_H / 2 });
  }
  rows.forEach((row, r) => {
    const left = PAD + (innerW - rowW(row.length)) / 2;
    row.forEach((t, i) => spots.set(t.id, { x: left + i * (NODE_W + GAP_X), y: bandTop + r * (NODE_H + GAP_Y) }));
  });
  // Dagre's bend points for each link, keyed "dependent>prerequisite", in frame coordinates.
  const paths = new Map<string, Point[]>();
  for (const e of inner) {
    const pts = (g.edge(e.to, e.from).points as Point[]) ?? [];
    paths.set(`${e.from}>${e.to}`, pts.map((p) => ({ x: p.x + dx, y: p.y + HEAD })));
  }
  return { w, h, spots, paths };
}

export function layoutFor(subjectId: SubjectId, open: Set<string>, size: keyof typeof SIZES = "full"): Layout {
  // Only the full map opens big topics into frames; the two small sizes draw every one closed.
  const openIds = size !== "full" ? [] : [...open].filter((id) => topicById.get(id)?.subjectId === subjectId).sort();
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
    g.setNode(t.id, f ? { width: f.w, height: f.h } : { width: z.w, height: z.h });
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
    const pre = byId.get(e.to)!;
    const dep = byId.get(e.from)!;
    // Hard links follow dagre's route, which goes around the boxes; soft ones aren't part of
    // the layout, so they take the direct curve.
    const via = e.kind === "needs" ? (g.edge(e.to, e.from).points as Point[]) ?? [] : [];
    laid.push({ ...e, level: "big", ...route(pre, dep, via.slice(1, -1)) });
  }
  // Inside a frame, every hard link between two of its subtopics is drawn, along dagre's route.
  for (const [bigId, f] of frames) {
    const frame = byId.get(bigId)!;
    for (const [k, pts] of f.paths) {
      const [from, to] = k.split(">");
      const via = pts.slice(1, -1).map((p) => ({ x: p.x + frame.x, y: p.y + frame.y }));
      laid.push({ from, to, kind: "needs", level: "sub", ...route(byId.get(to)!, byId.get(from)!, via) });
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

/**
 * A line from a prerequisite (below) up to its dependent, through the given bend points.
 *
 * It leaves the TOP of the prerequisite and enters the BOTTOM of the dependent, going
 * straight up at both ends, so every arrowhead points up (design: arrows point upward, in
 * learning order). Dagre's own end points sit where the line from the box's centre crosses
 * its border, which for a wide box or a steep fan is often a SIDE; smoothing through those
 * made lines leave sideways and hook back just before the arrowhead (Basic data operations
 * fanned seven lines out of its left and right edges). The end points slide along the edge
 * towards the next bend, so a fan of lines still spreads out instead of starting at one dot.
 */
export function route(pre: Box, dep: Box, via: Point[] = []): { d: string; mid: Point; trail: Point[]; head: Head } {
  const above = dep.y + dep.h <= pre.y + 1;
  // Only a soft link can join two boxes side by side or upside down; it takes the old plain
  // curve between facing edges.
  if (!above) return link(pre, dep);
  const inset = (b: Box, x: number) => Math.min(b.x + b.w - 14, Math.max(b.x + 14, x));
  const pts = via.filter((p) => p.y < pre.y && p.y > dep.y + dep.h);
  const start = { x: inset(pre, pts[0]?.x ?? dep.x + dep.w / 2), y: pre.y };
  const tip = { x: inset(dep, pts[pts.length - 1]?.x ?? pre.x + pre.w / 2), y: dep.y + dep.h };
  // The line ends in a straight stem as long as the arrowhead, so the head always points
  // straight up. Turned along a curve's last pixels instead, it came out tilted wherever a
  // line has to cover a lot of ground sideways in little height (24px between rows in a
  // frame), and a field of tilted heads reads as noise.
  const end = { x: tip.x, y: tip.y + HEAD_LENGTH };
  // Through dagre's bend points, which sit in the gaps between rows where no box is: that is
  // what keeps a line off every box in between (a plain S-curve from one box to the other
  // cut across a big frame's corner). The result reads as up, across in a gap, up.
  const all = [start, ...pts, end];
  // Catmull-Rom tangents inside; straight up at the two ends, as strongly as the old plain
  // curve (link) so short hops still leave and arrive vertically.
  const tangent = (i: number): Point => {
    if (i === 0 || i === all.length - 1) {
      const other = all[i === 0 ? 1 : i - 1];
      return { x: 0, y: -3 * Math.max(18, Math.abs(other.y - all[i].y) / 2) };
    }
    return { x: (all[i + 1].x - all[i - 1].x) / 2, y: (all[i + 1].y - all[i - 1].y) / 2 };
  };
  let d = `M${start.x},${start.y}`;
  const trail: Point[] = [start];
  for (let i = 0; i < all.length - 1; i++) {
    const p0 = all[i];
    const p3 = all[i + 1];
    const t0 = tangent(i);
    const t1 = tangent(i + 1);
    // Control points stay between the segment's two ends sideways, so the curve never swings
    // past a bend and comes back (the hooks under Performance and Persistence).
    const lo = Math.min(p0.x, p3.x);
    const hi = Math.max(p0.x, p3.x);
    const clampX = (x: number) => Math.min(hi, Math.max(lo, x));
    const c1 = { x: clampX(p0.x + t0.x / 3), y: p0.y + t0.y / 3 };
    const c2 = { x: clampX(p3.x - t1.x / 3), y: p3.y - t1.y / 3 };
    d += ` C${c1.x},${c1.y} ${c2.x},${c2.y} ${p3.x},${p3.y}`;
    for (let k = 1; k <= 8; k++) trail.push(bezier(p0, c1, c2, p3, k / 8));
  }
  d += ` L${tip.x},${tip.y}`;
  trail.push(tip);
  return { d, mid: along(trail, 0.5), trail, head: { x: tip.x, y: tip.y, angle: -90 } };
}

function bezier(p0: Point, c1: Point, c2: Point, p3: Point, t: number): Point {
  const u = 1 - t;
  return {
    x: u * u * u * p0.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * p3.x,
    y: u * u * u * p0.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * p3.y,
  };
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
  const p0 = { x: sx, y: sY };
  const c1 = { x: sx, y: sY + dir * bend };
  const c2 = { x: ex, y: eY - dir * bend };
  const p3 = { x: ex, y: eY };
  const trail = Array.from({ length: 13 }, (_, i) => bezier(p0, c1, c2, p3, i / 12));
  return { d: `M${sx},${sY} C${sx},${c1.y} ${ex},${c2.y} ${ex},${eY}`, mid: bezier(p0, c1, c2, p3, 0.5), trail, head: headOf(p0, c1, c2, p3) };
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
