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

/*
  `ranksep` is the least room between two rows of big topics. The map makes it taller when
  a gap has more lanes than fit (see laneRoutes). `lanes` says how lines between big topics
  are drawn: the corner radius and the space between two lanes in a gap (null would mean
  the old smoothed route). The miniature has lanes too since 15 Nov 2026: without them
  React Native's showed the same flat bundles the full map had.
*/
/**
 * How a line crosses a gap. "curve": one smooth S from straight up, through its lane, to
 * straight up again. "corner": up, a rounded corner, across along the lane, a corner, up.
 * Both keep every line at its own height in the gap, which is what stops the stacking.
 */
const SHAPE: "curve" | "corner" = "curve";

/** Lanes inside an open frame: smaller corners and closer lanes, since its boxes are smaller. */
const FRAME_LANES = { radius: 10, space: 7, shape: SHAPE };

const SIZES = {
  full: { nodesep: 28, ranksep: 72, margin: 40, w: BIG_W, h: BIG_H, lanes: { radius: 22, space: 10, shape: SHAPE } },
  /** For the miniature: closed big topics only, packed tight so the shape reads at a glance. */
  mini: { nodesep: 8, ranksep: 26, margin: 4, w: 30, h: 12, lanes: { radius: 5, space: 3, shape: SHAPE } },
  /**
   * For the landing page's hero: closed big topics drawn exactly as on the app's map, a
   * little smaller and packed closer, so the widest row (seven topics in React Native)
   * still fits a 1440px screen at close to full size.
   */
  plate: { nodesep: 12, ranksep: 30, margin: 12, w: 206, h: BIG_H, lanes: { radius: 10, space: 6, shape: SHAPE } },
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

  const run = (ranksep: number) => {
    const g = new dagre.graphlib.Graph();
    g.setGraph({ rankdir: "BT", nodesep: GAP_X, ranksep, edgesep: 8, marginx: 0, marginy: 0 });
    g.setDefaultEdgeLabel(() => ({}));
    for (const t of linked) g.setNode(t.id, { width: NODE_W, height: NODE_H });
    for (const e of inner) g.setEdge(e.to, e.from);
    if (linked.length) dagre.layout(g);
    return g;
  };
  // The lines inside get lanes too (laneRoutes). Their first pass only says how much room
  // between rows they need; if it's more than GAP_Y, the frame is laid out again, taller.
  // Until 15 Nov 2026 the rows were always 24px apart, and where one subtopic feeds three
  // (Redis: How AOF works) the lines bunched into hooks and a flat run under the boxes.
  let g = run(GAP_Y);
  if (linked.length && inner.length) {
    const box = (id: string): Box => {
      const n = g.node(id);
      return { x: n.x - NODE_W / 2, y: n.y - NODE_H / 2, w: NODE_W, h: NODE_H };
    };
    const need = laneRoutes(
      inner.map((e) => ({ key: "", pre: box(e.to), dep: box(e.from), via: (g.edge(e.to, e.from).points as Point[]) ?? [] })),
      linked.map((t) => box(t.id)),
      FRAME_LANES,
    ).ranksep;
    if (need > GAP_Y) g = run(need);
  }
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
  const bigEdges = edges.filter((e) => bigIds.has(e.from) && bigIds.has(e.to));

  // Lays the big topics out with a given room between rows.
  const arrange = (ranksep: number) => {
    const g = new dagre.graphlib.Graph();
    g.setGraph({ rankdir: "BT", nodesep: z.nodesep, ranksep, marginx: z.margin, marginy: z.margin });
    g.setDefaultEdgeLabel(() => ({}));
    for (const t of bigs) {
      const f = frames.get(t.id);
      g.setNode(t.id, f ? { width: f.w, height: f.h } : { width: z.w, height: z.h });
    }
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
    const hard = bigEdges
      .filter((e) => e.kind === "needs")
      .map((e) => ({ key: `${e.from}>${e.to}`, pre: byId.get(e.to)!, dep: byId.get(e.from)!, via: (g.edge(e.to, e.from).points as Point[]) ?? [] }));
    const lanes = z.lanes ? laneRoutes(hard, nodes.filter((n) => n.kind !== "sub"), z.lanes) : null;
    return { g, nodes, byId, hard, lanes };
  };

  // Dagre's x positions don't depend on the room between rows, so the lanes counted on the
  // first pass are the lanes the second pass needs: one extra layout at most.
  let pass = arrange(z.ranksep);
  if (pass.lanes && pass.lanes.ranksep > z.ranksep) pass = arrange(pass.lanes.ranksep);
  const { g, nodes, byId, hard, lanes } = pass;

  const laid: LaidEdge[] = [];
  for (const e of bigEdges) {
    const pre = byId.get(e.to)!;
    const dep = byId.get(e.from)!;
    if (e.kind === "needs") {
      const h = hard.find((x) => x.key === `${e.from}>${e.to}`)!;
      // Hard links get their own lane (laneRoutes); the miniature keeps dagre's route, smoothed.
      laid.push({ ...e, level: "big", ...(lanes?.routes.get(h.key) ?? route(pre, dep, h.via.slice(1, -1))) });
    } else {
      // Soft links aren't part of the layout, so they take the direct curve.
      laid.push({ ...e, level: "big", ...route(pre, dep) });
    }
  }
  // Inside a frame, every hard link between two of its subtopics is drawn in lanes, the same
  // way as the lines between big topics (only the subtopics with links form its rows).
  for (const [bigId, f] of frames) {
    const frame = byId.get(bigId)!;
    const links: HardLink[] = [...f.paths].map(([k, pts]) => {
      const [from, to] = k.split(">");
      return { key: k, pre: byId.get(to)!, dep: byId.get(from)!, via: pts.map((p) => ({ x: p.x + frame.x, y: p.y + frame.y })) };
    });
    const linkedBoxes = [...new Set(links.flatMap((l) => [l.pre, l.dep]))];
    const { routes } = laneRoutes(links, linkedBoxes, FRAME_LANES);
    for (const l of links) {
      const [from, to] = l.key.split(">");
      laid.push({ from, to, kind: "needs", level: "sub", ...routes.get(l.key)! });
    }
  }

  const info = g.graph();
  const layout: Layout = { subjectId, nodes, edges: laid, byId, width: info.width ?? 0, height: info.height ?? 0 };
  cache.set(key, layout);
  return layout;
}

/** A hard link between two big topics, as dagre left it. */
interface HardLink {
  key: string;
  pre: Box;
  dep: Box;
  /** Dagre's points, from the prerequisite up. */
  via: Point[];
}

type Route = { d: string; mid: Point; trail: Point[]; head: Head };

/**
 * Lines between big topics, each in its own lane (added 15 Nov 2026).
 *
 * The problem it fixes: route() curves every line through dagre's bend point, which sits at
 * the exact middle of the gap between two rows. On a map as wide as React Native (25 big
 * topics, over 4000px) many lines cross the same gap and cover thousands of pixels sideways
 * in 56px of height, so they all ran flat along the same middle line and lay on top of
 * each other: a thick grey bundle where nobody can tell which line goes where. And
 * whether a line came out as a soft S or a rigid flat run depended only on how far it went
 * sideways, so the map mixed two styles.
 *
 * What it does instead, the way a metro map or a circuit board is drawn:
 * - Rows and gaps. Big topics in one dagre rank form a row; between two rows is a gap.
 *   A line goes up through its own row, crosses one gap per rank it climbs, and passes
 *   through each row in between at the spot dagre kept free for it (its "dummy" point).
 * - Lanes. In each gap, every line that has to move sideways gets a height of its own,
 *   and two lines share a height only when they don't overlap sideways. The order follows
 *   the rule that avoids crossings: of two lines going right, the one starting further
 *   left takes the higher lane (mirrored for lines going left).
 * - Ports. Lines leaving the top of one box (or entering the bottom of one) start at
 *   different points along it, in the order they head off in, so a box with six lines
 *   shows six starts instead of one blot.
 * - One shape. Every line is up, across, up, with rounded corners; a short step across
 *   becomes a soft S because its corners meet.
 * - Room. If a gap needs more lanes than fit, `ranksep` says how much room between rows
 *   would fit them all, and layoutFor lays the map out again with it.
 *
 * The trade: lines are longer than a straight diagonal, and the map is a little taller.
 * A tool like ELK's orthogonal router would also do this, but it is a 1.5 MB dependency
 * for one step this file can do in a hundred lines. The test in
 * backend/test/map-layout.test.ts still checks no line crosses a box and every head points up.
 */
/**
 * How far apart lines start (or end) when several share one edge of a box. 24px, not 12:
 * at 12 the three lines leaving a corner of Redis's Basic data operations read as one
 * thick stroke at normal zoom (owner, 15 Nov 2026). A box too narrow for its lines at
 * this spacing spreads them evenly across its width instead.
 */
const PORT_GAP = 24;

/** The least room between a lane and the boxes above and below it. */
const CLEAR = 6;

function laneRoutes(links: HardLink[], bigs: Box[], opts: { radius: number; space: number; shape: "curve" | "corner" }): { routes: Map<string, Route>; ranksep: number } {
  const R = opts.radius;

  // Rows, top to bottom. Dagre centres a rank's boxes on one line.
  const byCentre = new Map<number, Box[]>();
  for (const b of bigs) {
    const c = Math.round(b.y + b.h / 2);
    byCentre.set(c, [...(byCentre.get(c) ?? []), b]);
  }
  const rows = [...byCentre.values()]
    .map((bs) => ({ top: Math.min(...bs.map((b) => b.y)), bottom: Math.max(...bs.map((b) => b.y + b.h)) }))
    .sort((a, b) => a.top - b.top);
  const rowOf = (b: Box) => rows.findIndex((r) => b.y >= r.top - 1 && b.y + b.h <= r.bottom + 1);
  const clampTo = (b: Box, x: number) => Math.min(b.x + b.w - 14, Math.max(b.x + 14, x));

  // 1. Each line's path through the rows in between: one x per row it passes through.
  const plans = links.map((l) => {
    const lo = rowOf(l.dep);
    const hi = rowOf(l.pre);
    const through: number[] = [];
    for (let r = hi - 1; r > lo; r--) {
      const row = rows[r];
      const inRow = l.via.filter((p) => p.y >= row.top && p.y <= row.bottom);
      // Dagre's point in this row; failing that (it shouldn't), a straight share of the way.
      const near = inRow.sort((a, b) => Math.abs(a.y - (row.top + row.bottom) / 2) - Math.abs(b.y - (row.top + row.bottom) / 2))[0];
      const t = (hi - r) / (hi - lo);
      through.push(near?.x ?? l.pre.x + l.pre.w / 2 + t * (l.dep.x + l.dep.w / 2 - l.pre.x - l.pre.w / 2));
    }
    // Where it would like to leave and arrive. Boxes that overlap sideways and are one gap
    // apart get a straight line where they overlap.
    let start: number;
    let end: number;
    if (through.length) {
      start = clampTo(l.pre, through[0]);
      end = clampTo(l.dep, through[through.length - 1]);
    } else {
      const left = Math.max(l.pre.x, l.dep.x) + 14;
      const right = Math.min(l.pre.x + l.pre.w, l.dep.x + l.dep.w) - 14;
      if (left <= right) start = end = Math.min(right, Math.max(left, l.dep.x + l.dep.w / 2));
      else {
        start = clampTo(l.pre, l.dep.x + l.dep.w / 2);
        end = clampTo(l.dep, l.pre.x + l.pre.w / 2);
      }
    }
    return { l, lo, hi, through, start, end, xs: [] as number[], lanes: [] as (number | null)[] };
  });

  // 2. Ports: spread the lines on one side of one box apart, keeping their order.
  const spreadPorts = (side: Map<Box, { want: number; heading: number; set: (x: number) => void }[]>) => {
    for (const [box, list] of side) {
      list.sort((a, b) => a.want - b.want || a.heading - b.heading);
      const gap = Math.min(PORT_GAP, (box.w - 28) / Math.max(1, list.length - 1));
      const xs = list.map((p) => p.want);
      for (let i = 1; i < xs.length; i++) xs[i] = Math.max(xs[i], xs[i - 1] + gap);
      const right = box.x + box.w - 14;
      for (let i = xs.length - 1; i >= 0; i--) xs[i] = Math.min(xs[i], i === xs.length - 1 ? right : xs[i + 1] - gap);
      list.forEach((p, i) => p.set(Math.max(box.x + 14, xs[i])));
    }
  };
  const tops = new Map<Box, { want: number; heading: number; set: (x: number) => void }[]>();
  const bottoms = new Map<Box, { want: number; heading: number; set: (x: number) => void }[]>();
  for (const p of plans) {
    const towards = p.through[0] ?? p.end;
    const from = p.through[p.through.length - 1] ?? p.start;
    tops.set(p.l.pre, [...(tops.get(p.l.pre) ?? []), { want: p.start, heading: towards, set: (x) => (p.start = x) }]);
    bottoms.set(p.l.dep, [...(bottoms.get(p.l.dep) ?? []), { want: p.end, heading: from, set: (x) => (p.end = x) }]);
  }
  spreadPorts(tops);
  spreadPorts(bottoms);

  // 3. Lanes: in each gap, a height for every line that moves sideways in it.
  //    Gap r is the one between row r-1 (above) and row r (below).
  type Seg = { a: number; b: number; set: (y: number) => void };
  const gaps = new Map<number, Seg[]>();
  for (const p of plans) {
    p.xs = [p.start, ...p.through, p.end];
    p.lanes = p.xs.slice(1).map(() => null);
    for (let k = 0; k < p.xs.length - 1; k++) {
      const a = p.xs[k];
      const b = p.xs[k + 1];
      if (Math.abs(a - b) < 0.5) continue; // straight up: needs no lane
      const gap = p.hi - k;
      gaps.set(gap, [...(gaps.get(gap) ?? []), { a, b, set: (y) => (p.lanes[k] = y) }]);
    }
  }
  let need = 0;
  for (const [gap, segs] of gaps) {
    // Pack each direction into as few lanes as it can, in the order that crosses least.
    const pack = (list: Seg[]) => {
      const lanes: Seg[][] = [];
      for (const s of list) {
        const lo = Math.min(s.a, s.b) - R - 4;
        const hi = Math.max(s.a, s.b) + R + 4;
        let lane = lanes.find((l) => l.every((o) => Math.max(o.a, o.b) < lo || Math.min(o.a, o.b) > hi));
        if (!lane) lanes.push((lane = []));
        lane.push(s);
      }
      return lanes;
    };
    const rightward = pack(segs.filter((s) => s.b > s.a).sort((x, y) => x.a - y.a));
    const leftward = pack(segs.filter((s) => s.b < s.a).sort((x, y) => y.a - x.a));
    const all = [...rightward, ...leftward];
    need = Math.max(need, all.length);

    // Lanes sit clear of the boxes: room for the arrowhead's stem and a corner above, a
    // corner below, and CLEAR more on each side. Without it the outer lanes ran right along
    // a frame's edge and read as part of its border.
    const top = rows[gap - 1].bottom + HEAD_LENGTH + R + CLEAR;
    const bottom = rows[gap].top - R - CLEAR;
    const step = all.length > 1 ? Math.min(opts.space * 1.6, (bottom - top) / (all.length - 1)) : 0;
    const centre = (top + bottom) / 2;
    all.forEach((lane, i) => {
      const y = centre + (i - (all.length - 1) / 2) * step;
      for (const s of lane) s.set(y);
    });
  }

  // 4. Draw: the corners of up-across-up, rounded.
  const routes = new Map<string, Route>();
  for (const p of plans) {
    const { pre, dep } = p.l;
    const tip = { x: p.end, y: dep.y + dep.h };
    const corners: Point[] = [{ x: p.start, y: pre.y }];
    p.lanes.forEach((y, k) => {
      if (y === null) return;
      corners.push({ x: p.xs[k], y }, { x: p.xs[k + 1], y });
    });
    corners.push({ x: p.end, y: tip.y + HEAD_LENGTH });
    // Drop points that add nothing (a turn of zero, or two in one place).
    const pts = corners.filter((c, i) => {
      const prev = corners[i - 1];
      const next = corners[i + 1];
      if (prev && Math.hypot(c.x - prev.x, c.y - prev.y) < 0.5) return false;
      return !(prev && next && ((prev.x === c.x && c.x === next.x) || (prev.y === c.y && c.y === next.y)));
    });
    routes.set(p.l.key, opts.shape === "curve" ? curved(p, rows, tip) : rounded(pts, tip, R));
  }

  return { routes, ranksep: Math.ceil(HEAD_LENGTH + 2 * R + 2 * CLEAR + Math.max(0, need - 1) * opts.space) };
}

/**
 * The "curve" shape: straight up to the gap, then one cubic S across it whose two control
 * points sit at the line's lane height, so it leaves and arrives vertically and is flattest
 * at its own lane (three quarters of the way to it, at the middle). The S stays inside the
 * gap, between its two ends sideways, so it can't touch a box; then straight up through
 * the row (or to the arrowhead's stem).
 */
function curved(
  p: { l: HardLink; hi: number; xs: number[]; lanes: (number | null)[]; start: number },
  rows: { top: number; bottom: number }[],
  tip: Point,
): Route {
  const stem = tip.y + HEAD_LENGTH;
  let d = `M${p.start},${p.l.pre.y}`;
  const trail: Point[] = [{ x: p.start, y: p.l.pre.y }];
  p.lanes.forEach((lane, k) => {
    if (lane === null) return;
    const gap = p.hi - k;
    const last = k === p.lanes.length - 1;
    const p0 = { x: p.xs[k], y: rows[gap].top };
    const p3 = { x: p.xs[k + 1], y: last ? Math.max(rows[gap - 1].bottom, stem) : rows[gap - 1].bottom };
    const c1 = { x: p0.x, y: lane };
    const c2 = { x: p3.x, y: lane };
    d += ` L${p0.x},${p0.y} C${c1.x},${c1.y} ${c2.x},${c2.y} ${p3.x},${p3.y}`;
    trail.push(p0);
    for (let i = 1; i <= 12; i++) trail.push(bezier(p0, c1, c2, p3, i / 12));
  });
  d += ` L${tip.x},${stem} L${tip.x},${tip.y}`;
  trail.push({ x: tip.x, y: stem }, tip);
  return { d, mid: along(trail, 0.5), trail, head: { x: tip.x, y: tip.y, angle: -90 } };
}

/**
 * A path through square corners, each one rounded, then a straight stem to the tip.
 * Each corner takes at most half of the straight runs beside it (all of the first and the
 * last run), so two corners never overlap and a short step reads as an S.
 */
function rounded(pts: Point[], tip: Point, R: number): Route {
  const len = (a: Point, b: Point) => Math.hypot(b.x - a.x, b.y - a.y);
  let d = `M${pts[0].x},${pts[0].y}`;
  const trail: Point[] = [pts[0]];
  for (let i = 1; i < pts.length - 1; i++) {
    const [a, c, b] = [pts[i - 1], pts[i], pts[i + 1]];
    const inLen = len(a, c) * (i === 1 ? 1 : 0.5);
    const outLen = len(c, b) * (i === pts.length - 2 ? 1 : 0.5);
    const r = Math.min(R, inLen, outLen);
    const p1 = { x: c.x + ((a.x - c.x) / len(a, c)) * r, y: c.y + ((a.y - c.y) / len(a, c)) * r };
    const p2 = { x: c.x + ((b.x - c.x) / len(c, b)) * r, y: c.y + ((b.y - c.y) / len(c, b)) * r };
    d += ` L${p1.x},${p1.y} Q${c.x},${c.y} ${p2.x},${p2.y}`;
    trail.push(p1);
    for (let k = 1; k <= 4; k++) {
      const t = k / 4;
      const u = 1 - t;
      trail.push({ x: u * u * p1.x + 2 * u * t * c.x + t * t * p2.x, y: u * u * p1.y + 2 * u * t * c.y + t * t * p2.y });
    }
  }
  const last = pts[pts.length - 1];
  d += ` L${last.x},${last.y} L${tip.x},${tip.y}`;
  trail.push(last, tip);
  return { d, mid: along(trail, 0.5), trail, head: { x: tip.x, y: tip.y, angle: -90 } };
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
