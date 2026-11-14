// How the map is drawn: frontend/components/map/layout.ts (where boxes and lines go) and
// focus.ts (what lights up and gets a name on hover). Both are pure functions with no React,
// and the frontend has no test runner of its own, so they are checked here, with the same
// Vitest as shared/. dagre resolves from frontend/node_modules, next to the files.
//
// These pin what the 14 Nov 2026 review found broken: lines through boxes, arrowheads that
// didn't point up, names on lines that were dimmed, and hovered topics whose own lines stayed
// dark. Run them after changing a subject's links: a new subject can break any of them.

import { describe, expect, it } from "vitest";
import { bigTopicsOf, subjects } from "@shared/data";
import { chainPicture, lineKey, ownPicture } from "../../frontend/components/map/focus";
import { along, layoutFor, type Box, type Layout } from "../../frontend/components/map/layout";

const inside = (p: { x: number; y: number }, b: Box, margin = 2) =>
  p.x > b.x + margin && p.x < b.x + b.w - margin && p.y > b.y + margin && p.y < b.y + b.h - margin;

// The two ends of the range: nothing open, and every big topic open (the busiest the map gets).
const cases: [string, Layout][] = subjects.flatMap((s) => [
  [`${s.name}, all closed`, layoutFor(s.id, new Set())] as [string, Layout],
  [`${s.name}, all open`, layoutFor(s.id, new Set(bigTopicsOf(s.id).map((t) => t.id)))] as [string, Layout],
]);

describe.each(cases)("%s", (_, layout) => {
  it("no two boxes overlap", () => {
    const boxes = layout.nodes.filter((n) => n.kind !== "frame");
    for (const a of boxes) {
      for (const b of boxes) {
        if (a === b) continue;
        const apart = a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y;
        expect(apart, `${a.topic.id} overlaps ${b.topic.id}`).toBe(true);
      }
    }
  });

  it("no hard line passes through a box or a frame it doesn't belong to", () => {
    for (const e of layout.edges) {
      if (e.kind !== "needs") continue;
      const points = Array.from({ length: 120 }, (_, i) => along(e.trail, i / 119));
      const ownFrame = layout.byId.get(e.from)?.topic.parentId;
      for (const n of layout.nodes) {
        if (n.topic.id === e.from || n.topic.id === e.to || n.topic.id === ownFrame) continue;
        expect(points.some((p) => inside(p, n)), `${e.to} → ${e.from} crosses ${n.topic.id}`).toBe(false);
      }
    }
  });

  it("every hard line's arrowhead points straight up", () => {
    for (const e of layout.edges) if (e.kind === "needs") expect(e.head.angle, `${e.to} → ${e.from}`).toBe(-90);
  });

  it("on hover, every line of the hovered box is lit, and every named relation's line or box is lit", () => {
    for (const n of layout.nodes) {
      const id = n.topic.id;
      const pic = chainPicture(id, layout, ownPicture(id, layout));
      for (const e of layout.edges) {
        if (e.kind === "needs" && (e.from === id || e.to === id)) expect(pic.lines.has(lineKey(e)), `${id}: ${lineKey(e)}`).toBe(true);
      }
      for (const name of pic.names) {
        expect(pic.nodes.has(name.other), `${id}: ${name.label} on ${name.other}`).toBe(true);
        if (name.line) {
          const drawn = pic.lines.has(name.line.key) || pic.extra.some((x) => x.key === name.line!.key);
          expect(drawn, `${id}: ${name.label} on ${name.line.key}`).toBe(true);
        }
      }
    }
  });
});
