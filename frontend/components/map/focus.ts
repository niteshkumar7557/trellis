// What the map shows for the topic in focus (hovered, or else selected): which lines and
// boxes light up, and which relations get a name. Pure functions of the layout, so they can
// be read (and checked) without React; MapCanvas only draws the result.
//
// Two rules hold everything together (docs/frontend.md §7):
//
// 1. A link between subtopics in DIFFERENT big topics is shown as the line between their big
//    topics, never as its own line. A subtopic-to-subtopic line across frames had to cross
//    whatever lay between them, other frames' headers and names included. The big-topic line
//    is routed by dagre around the boxes, and the subtopic at the far end is lit (and named
//    with a tag), so nothing precise is lost. When the big topics aren't joined directly
//    (FlatList needs Props: Lists → Core components → React basics), every big-topic line on
//    the way lights up, which is also true: Lists stands on React basics through Core.
//
// 2. Every relation that gets a name has its line lit. Before 14 Nov 2026, hover lit only
//    the chain below while the topic's own "unlocks" and "helps" lines were named but dimmed
//    to 12%, which read as labels floating in empty space.

import { bigOf, isBig, topicById } from "@shared/data";
import { helpsOf, neededBy, needsOf } from "@shared/graph";
import { link, shownAs, type Head, type Layout, type LaidEdge, type LaidNode, type Point } from "./layout";

export type Kind = "needs" | "helps";
export type Label = "needed first" | "unlocks" | "helps";

/** A line the layout doesn't draw at rest: a soft link, shown only for the topic in focus. */
export interface ExtraLine {
  key: string;
  d: string;
  trail: Point[];
  head: Head;
  kind: Kind;
}

/** A relation of the topic in focus, to be named on its line or as a tag on the other box. */
export interface Name {
  label: Label;
  kind: Kind;
  /** The box at the other end. */
  other: string;
  /** The line that carries the name, when one line joins the focus box and `other`. */
  line?: { key: string; trail: Point[]; t: number };
}

export interface Picture {
  /** Boxes (layout node ids) that stay bright. */
  nodes: Set<string>;
  /** Open big topics needed as a whole: everything inside them stays bright too. */
  whole: Set<string>;
  /** Layout lines to draw lit, by `lineKey`. */
  lines: Set<string>;
  extra: ExtraLine[];
  names: Name[];
}

export const lineKey = (e: Pick<LaidEdge, "kind" | "from" | "to">) => `${e.kind}-${e.from}-${e.to}`;

/** How far along a named line its name sits: near the topic in focus. */
const NEAR_FOCUS_END = 0.72;
const NEAR_FOCUS_START = 0.28;

const empty = (): Picture => ({ nodes: new Set(), whole: new Set(), lines: new Set(), extra: [], names: [] });

/** Every big-topic "needs" line on a path from big topic `from` down to big topic `to`. */
function bigPath(layout: Layout, from: string, to: string): LaidEdge[] {
  const down = new Map<string, LaidEdge[]>();
  for (const e of layout.edges) if (e.level === "big" && e.kind === "needs") down.set(e.from, [...(down.get(e.from) ?? []), e]);
  const memo = new Map<string, boolean>();
  const reaches = (id: string): boolean => {
    if (id === to) return true;
    const hit = memo.get(id);
    if (hit !== undefined) return hit;
    memo.set(id, false);
    const ok = (down.get(id) ?? []).some((e) => reaches(e.to));
    memo.set(id, ok);
    return ok;
  };
  const out: LaidEdge[] = [];
  const seen = new Set<string>();
  const walk = (id: string) => {
    if (seen.has(id)) return;
    seen.add(id);
    for (const e of down.get(id) ?? []) {
      if (!reaches(e.to)) continue;
      out.push(e);
      walk(e.to);
    }
  };
  walk(from);
  return out;
}

/**
 * Show one relation, `dep` needs (or is helped by) `pre`, on this layout. Adds its lines and
 * boxes to the picture and returns the line that joins the two boxes directly, if there is one.
 */
function show(layout: Layout, pic: Picture, pre: string, dep: string, kind: Kind): { key: string; trail: Point[] } | null {
  const a = shownAs(pre, layout);
  const b = shownAs(dep, layout);
  if (!a || !b || a === b) return null;
  pic.nodes.add(a.topic.id);
  pic.nodes.add(b.topic.id);

  // Drawn at rest between these two boxes (inside a frame, or between big topics).
  const direct = layout.edges.find((e) => e.from === b.topic.id && e.to === a.topic.id && e.kind === kind);
  if (direct) {
    pic.lines.add(lineKey(direct));
    return { key: lineKey(direct), trail: direct.trail };
  }

  const bigA = bigOf(pre);
  const bigB = bigOf(dep);
  if (bigA !== bigB && kind === "needs") {
    // Rule 1: across big topics, through the big-topic lines.
    for (const e of bigPath(layout, bigB, bigA)) {
      pic.lines.add(lineKey(e));
      pic.nodes.add(e.from);
      pic.nodes.add(e.to);
    }
    return null;
  }

  // A soft link isn't part of the layout. Across big topics it joins the two big boxes (frames
  // route nothing through each other); inside one frame it joins the two subtopics.
  const from = bigA !== bigB ? layout.byId.get(bigA)! : a;
  const to = bigA !== bigB ? layout.byId.get(bigB)! : b;
  const key = `${kind}-${to.topic.id}-${from.topic.id}`;
  if (from !== to && !pic.extra.some((x) => x.key === key)) pic.extra.push({ key, kind, ...link(from, to) });
  return bigA === bigB ? { key, trail: pic.extra.find((x) => x.key === key)!.trail } : null;
}

/** The hovered topic's chain: every hard prerequisite below it, as lit lines and boxes. */
export function chainPicture(id: string, layout: Layout, pic: Picture = empty()): Picture {
  const self = shownAs(id, layout);
  if (!self) return pic;
  pic.nodes.add(self.topic.id);
  // A big topic in focus is needed as a whole by nothing, but it IS the thing in focus:
  // what is inside it shouldn't dim.
  if (self.kind === "frame") pic.whole.add(self.topic.id);
  const seen = new Set<string>();
  const stack = [id];
  while (stack.length) {
    const cur = stack.pop()!;
    if (seen.has(cur)) continue;
    seen.add(cur);
    for (const p of needsOf(cur)) {
      show(layout, pic, p, cur, "needs");
      // A big topic needed by a big topic is needed whole.
      const n = layout.byId.get(p);
      if (isBig(topicById.get(p)!) && n?.kind === "frame") pic.whole.add(p);
      stack.push(p);
    }
  }
  return pic;
}

/** The focus topic's own relations, one step each way: what gets lit and named. */
export function ownPicture(id: string, layout: Layout, pic: Picture = empty()): Picture {
  const self = shownAs(id, layout);
  if (!self) return pic;
  pic.nodes.add(self.topic.id);
  const add = (pre: string, dep: string, kind: Kind, label: Label) => {
    const line = show(layout, pic, pre, dep, kind);
    const other = shownAs(dep === id ? pre : dep, layout);
    if (!other || other === self) return;
    // The name sits near the focus end of its line: the end of a line coming in, the start
    // of a line going out (lines run from the prerequisite up to the dependent).
    const t = dep === id ? NEAR_FOCUS_END : NEAR_FOCUS_START;
    if (pic.names.some((n) => n.other === other.topic.id && n.label === label)) return;
    pic.names.push({ label, kind, other: other.topic.id, line: line ? { ...line, t } : undefined });
  };
  for (const p of needsOf(id)) add(p, id, "needs", "needed first");
  for (const d of neededBy(id)) add(id, d, "needs", "unlocks");
  // Soft links both ways. Before 14 Nov 2026 a subtopic showed only what helps it, never
  // what it helps; big topics showed both, because the layout draws theirs.
  for (const p of helpsOf(id)) add(p, id, "helps", "helps");
  for (const d of helpedBy(id)) add(id, d, "helps", "helps");
  return pic;
}

const helpedByMap = new Map<string, string[]>();
function helpedBy(id: string): string[] {
  if (!helpedByMap.size) {
    for (const t of topicById.values()) for (const p of helpsOf(t.id)) helpedByMap.set(p, [...(helpedByMap.get(p) ?? []), t.id]);
  }
  return helpedByMap.get(id) ?? [];
}

/** Is this box dimmed while something is hovered? */
export function isDim(n: LaidNode, pic: Picture): boolean {
  if (pic.nodes.has(n.topic.id)) return false;
  if (n.kind === "sub") return !pic.whole.has(n.topic.parentId!);
  if (n.kind === "frame") return !pic.whole.has(n.topic.id) && ![...pic.nodes].some((id) => topicById.get(id)?.parentId === n.topic.id);
  return true;
}
