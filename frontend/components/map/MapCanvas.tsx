"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { StatusMark } from "@/components/ui/Status";
import { subjectById, topicById } from "@shared/data";
import { Draggable, gsap, prefersReducedMotion, useGSAP } from "@/lib/gsap";
import { STATUS_LABEL, progressOf, statusOf } from "@shared/graph";
import type { Status } from "@shared/types";
import { chainPicture, isDim, lineKey, ownPicture, type Label } from "./focus";
import { HEAD_LENGTH, along, link, shownAs, type Head, type Layout, type LaidNode, type Point } from "./layout";
import styles from "./map.module.css";

interface Props {
  layout: Layout;
  statuses: Map<string, Status>;
  required: Set<string>;
  targets: Set<string>;
  nextId: string | null;
  selected: string | null;
  /** From the stuck topic down to its suspect; drawn when `traceOn`. */
  trace: string[] | null;
  traceOn: boolean;
  /** Where the map opens when the whole graph would be too small to read. */
  focusId: string | null;
  /** Pixels on the right covered by the topic sheet; the camera keeps things out from under it. */
  rightInset?: number;
  /**
   * Whether the selected topic shows its path the way a hover does (its chain lit, the rest
   * dimmed, beads running). The topic sheet has the switch. Off: the map stays at rest.
   */
  pathOn?: boolean;
  onSelect: (id: string) => void;
}

/**
 * The camera never zooms out past the scale that fits the whole map, nor below this. Until
 * 14 Nov 2026 the floor was a fixed 0.3, and Redis with every big topic open (about
 * 5000px wide) didn't fit any screen at 0.3. Zoomed that far out the names can't be read,
 * but the shape can, which is the point of zooming out.
 */
const FLOOR = 0.05;
const MIN_USUAL = 0.3;
const MAX = 1.6;
/** Below this the names are too small to read, so the map opens on the focus topic instead. */
const READABLE = 0.72;
/** At most this many lines of one kind are named one by one; past that, one summary tag. */
const MAX_NAMED = 3;
/** The camera never zooms out past this on its own when bringing a topic into view. */
const LEGIBLE = 0.62;
/** The clickable header strip of an open big topic, which names must not cover. */
const FRAME_HEAD = 40;

/** Where a tag sits on its box: just outside one of its corners. */
type Corner = "top-right" | "top-left" | "bottom-right" | "bottom-left";

/** An arrowhead with its tip on the line's end, turned along the line's last few pixels. */
function Arrowhead({ head, kind }: { head: Head; kind: "rest" | "on" | "soft" | "trace" }) {
  const k = kind === "trace" ? 1.3 : 1;
  return (
    <path
      d={`M0,0 L${-HEAD_LENGTH * k},${-3.5 * k} L${-HEAD_LENGTH * k},${3.5 * k} Z`}
      // Rounded: server and browser can differ in the last digit, which breaks hydration.
      transform={`translate(${head.x.toFixed(2)} ${head.y.toFixed(2)}) rotate(${head.angle.toFixed(2)})`}
      className={styles.arrowHead}
      data-k={kind}
    />
  );
}

export function MapCanvas({ layout, statuses, required, targets, nextId, selected, trace, traceOn, focusId, rightInset = 0, pathOn = true, onSelect }: Props) {
  const viewport = useRef<HTMLDivElement>(null);
  const world = useRef<HTMLDivElement>(null);
  const traceGroup = useRef<SVGGElement>(null);
  const view = useRef({ x: 0, y: 0, s: 1 });
  const [hovered, setHovered] = useState<string | null>(null);
  const [scale, setScale] = useState(1);

  // The topic in focus. A selected topic with its path on holds the map: hovering other
  // topics doesn't replace its path (the owner's call, 14 Nov 2026: a path you opened should
  // stay put while the pointer crosses the map). With no selection, or its path hidden,
  // hover works as before.
  const holding = pathOn && selected !== null;
  const focus = holding ? selected : hovered;
  // What it lights and names (./focus.ts): its own lines both ways, and the chain below.
  const picture = useMemo(() => (focus ? chainPicture(focus, layout, ownPicture(focus, layout)) : null), [focus, layout]);
  // Dimming and beads come with the picture, for a hover and a selected topic alike.
  const lit = picture;

  // Names only where they answer a question: the relations of the topic in focus, each on its
  // line when one line joins the two boxes and is long enough on screen to hold the name, or
  // else as a small tag above the box at the other end.
  const relations = useMemo(() => {
    const none = {
      lines: [] as { key: string; kind: "needs" | "helps"; label: string; near: Point }[],
      tags: [] as { id: string; kind: "needs" | "helps"; label: string; corner: Corner }[],
      /** On the topic in focus, when one kind of relation is too many to name one by one. */
      summary: [] as { label: string; count: number }[],
      self: null as string | null,
    };
    if (!focus || !picture) return none;
    const self = shownAs(focus, layout)?.topic.id;
    if (!self) return none;
    // Naming the same relation six times is noise: past a few, say it once, on the topic in focus.
    const count = new Map<Label, number>();
    for (const n of picture.names) count.set(n.label, (count.get(n.label) ?? 0) + 1);
    const named = picture.names.filter((n) => count.get(n.label)! <= MAX_NAMED);
    const summary = [...count].filter(([, c]) => c > MAX_NAMED).map(([label, c]) => ({ label, count: c }));

    // Labels keep their size on screen, so their footprint in the world grows as you zoom out.
    const k = Math.min(1.6, 1 / scale);
    const H = 20 * k;
    const widthOf = (label: string) => (18 + label.length * 6.2) * k;
    // Everything a name must not cover: every box, and the header strip of every open big
    // topic (before 14 Nov 2026 frames were left out, so names landed on "Core components").
    // A frame's header is mostly empty: what matters is its name on the left and its count
    // on the right. Blocking the whole strip would push every tag in the top row elsewhere.
    // Each block remembers whose it is, so a tag isn't kept off its own box.
    const blocks = layout.nodes.flatMap((n) => {
      const owner = n.topic.id;
      if (n.kind !== "frame") return [{ owner, x: n.x + n.w / 2, y: n.y + n.h / 2, w: n.w + 6, h: n.h + 6 }];
      const nameW = 44 + n.topic.name.length * 7.4;
      return [
        { owner, x: n.x + nameW / 2, y: n.y + FRAME_HEAD / 2, w: nameW, h: FRAME_HEAD },
        { owner, x: n.x + n.w - 26, y: n.y + FRAME_HEAD / 2, w: 52, h: FRAME_HEAD },
      ];
    });
    // The "Next" pill straddles the top-left of the next topic's box (map.module.css, .nextTag).
    const next = nextId ? shownAs(nextId, layout) : null;
    if (next) blocks.push({ owner: "", x: next.x + 10 + 21, y: next.y - 1, w: 42, h: 20 });
    const placed: { x: number; y: number; w: number; h: number }[] = [];
    const clashes = (b: { x: number; y: number; w: number; h: number }, against = [...placed, ...blocks]) =>
      against.some((o) => Math.abs(o.x - b.x) < (o.w + b.w) / 2 && Math.abs(o.y - b.y) < (o.h + b.h) / 2);

    // A tag sits just outside its box, at a corner: above on the right, above on the left,
    // then below, whichever is clear first, so it never covers a name. It used to sit across
    // the top border, over the box's own name.
    const SPOTS: Corner[] = ["top-right", "top-left", "bottom-right", "bottom-left"];
    const tagSpot = (id: string, w: number, corner: Corner) => {
      const n = layout.byId.get(id)!;
      const right = corner.endsWith("right") ? n.x + n.w - 6 : n.x + 6 + w;
      const y = corner.startsWith("top") ? n.y + 3 - H / 2 : n.y + n.h - 3 + H / 2;
      return { x: right - w / 2, y, w, h: H };
    };
    // How much of other boxes, names and labels a tag at this spot would cover (0: clear).
    const tagCover = (id: string, b: { x: number; y: number; w: number; h: number }) => {
      const others = blocks.filter((o) => o.owner !== id);
      return [...placed, ...others].reduce((sum, o) => {
        const dx = Math.max(0, Math.min(o.x + o.w / 2, b.x + b.w / 2) - Math.max(o.x - o.w / 2, b.x - b.w / 2));
        const dy = Math.max(0, Math.min(o.y + o.h / 2, b.y + b.h / 2) - Math.max(o.y - o.h / 2, b.y - b.h / 2));
        return sum + dx * dy;
      }, 0);
    };
    const tagged = new Map<string, { kind: "needs" | "helps"; labels: Label[] }>();
    const toTag = (id: string, kind: "needs" | "helps", label: Label) => {
      const t = tagged.get(id) ?? { kind, labels: [] };
      if (!t.labels.includes(label)) t.labels.push(label);
      tagged.set(id, t);
    };
    if (summary.length) {
      const text = summary.map((x) => `${x.label} ${x.count}`).join(" · ");
      placed.push(tagSpot(self, widthOf(text), "top-right"));
    }

    const lines: typeof none.lines = [];
    const roomy = named.filter((n) => {
      if (!n.line) return false;
      const length = n.line.trail.slice(1).reduce((sum, p, i) => sum + Math.hypot(p.x - n.line!.trail[i].x, p.y - n.line!.trail[i].y), 0);
      // On screen, the line must be clearly longer than the name it carries.
      return length * scale > (widthOf(n.label) / k) * 1.8;
    });
    for (const n of named) if (!roomy.includes(n)) toTag(n.other, n.kind, n.label);
    const tags: typeof none.tags = [];
    const placeTags = () => {
      for (const [id, t] of tagged) {
        if (tags.some((x) => x.id === id)) continue;
        const label = t.labels.join(" · ");
        const w = widthOf(label);
        // The first clear corner; zoomed far out, where every corner touches something, the
        // one that covers least.
        const cover = SPOTS.map((c) => tagCover(id, tagSpot(id, w, c)));
        const clear = cover.indexOf(0);
        const corner = SPOTS[clear >= 0 ? clear : cover.indexOf(Math.min(...cover))];
        placed.push(tagSpot(id, w, corner));
        tags.push({ id, kind: t.kind, label, corner });
      }
    };
    placeTags();
    // Then names on the roomy lines, slid along each line until clear of boxes, tags and each other.
    for (const n of roomy) {
      const { trail, t, key } = n.line!;
      const w = widthOf(n.label);
      const step = t > 0.5 ? -0.08 : 0.08;
      let spot: Point | null = null;
      for (let i = 0; i < 8 && !spot; i++) {
        const p = along(trail, Math.min(0.92, Math.max(0.08, t + step * i)));
        if (!clashes({ x: p.x, y: p.y, w, h: H })) spot = p;
      }
      if (spot) {
        placed.push({ x: spot.x, y: spot.y, w, h: H });
        lines.push({ key, kind: n.kind, label: n.label, near: spot });
      } else {
        toTag(n.other, n.kind, n.label);
      }
    }
    placeTags();
    return { lines, tags, summary, self };
  }, [focus, picture, layout, scale, nextId]);

  const tracePaths = useMemo(() => {
    if (!trace) return [];
    return trace.slice(0, -1).flatMap((from, i) => {
      const dep = shownAs(from, layout);
      const pre = shownAs(trace[i + 1], layout);
      return dep && pre && dep !== pre ? [{ key: `${from}-${trace[i + 1]}`, ...link(pre, dep) }] : [];
    });
  }, [trace, layout]);

  // "may be why" sits on the last step of the trace, slid along it until it covers no box or
  // frame name. At its plain midpoint it landed on whatever the line crossed ("Image").
  const traceSpot = useMemo(() => {
    const last = tracePaths[tracePaths.length - 1];
    if (!last) return null;
    const k = Math.min(1.6, 1 / scale);
    const w = (18 + "may be why".length * 6.6) * k;
    const h = 20 * k;
    const boxes = layout.nodes.map((n) => (n.kind === "frame" ? { x: n.x, y: n.y, w: n.w, h: FRAME_HEAD } : n));
    const clear = (p: Point) => !boxes.some((b) => p.x + w / 2 > b.x && p.x - w / 2 < b.x + b.w && p.y + h / 2 > b.y && p.y - h / 2 < b.y + b.h);
    for (const t of [0.5, 0.42, 0.58, 0.34, 0.66, 0.26, 0.74, 0.18, 0.82]) {
      const p = along(last.trail, t);
      if (clear(p)) return p;
    }
    return last.mid;
  }, [tracePaths, layout, scale]);

  // Camera moves. Plain callbacks: they only run from effects and handlers, never in render.
  const readView = useCallback(() => {
    const el = world.current!;
    return {
      x: Number(gsap.getProperty(el, "x")),
      y: Number(gsap.getProperty(el, "y")),
      s: Number(gsap.getProperty(el, "scale")) || view.current.s,
    };
  }, []);

  const apply = useCallback((x: number, y: number, s: number, animate = true) => {
    view.current = { x, y, s };
    setScale(s);
    gsap.to(world.current, {
      x,
      y,
      scale: s,
      transformOrigin: "0 0",
      duration: animate && !prefersReducedMotion() ? 0.55 : 0,
      ease: "power3.inOut",
      overwrite: "auto",
    });
  }, []);

  /** How far out the camera may go: far enough to see the whole map, whatever its size. */
  const minScale = useCallback(() => {
    const vp = viewport.current;
    if (!vp) return MIN_USUAL;
    const { width: vw, height: vh } = vp.getBoundingClientRect();
    const fits = Math.min((vw - 32) / layout.width, (vh - 32) / layout.height);
    return Math.max(FLOOR, Math.min(MIN_USUAL, fits));
  }, [layout]);

  const fit = useCallback(
    (animate = true) => {
      const vp = viewport.current;
      if (!vp) return;
      const { width: vw, height: vh } = vp.getBoundingClientRect();
      const s = Math.min(MAX, Math.max(minScale(), Math.min((vw - 32) / layout.width, (vh - 32) / layout.height, 1)));
      apply((vw - layout.width * s) / 2, (vh - layout.height * s) / 2, s, animate);
    },
    [layout, apply, minScale],
  );

  /** Fit if the whole map is readable; otherwise centre the focus topic at a readable size. */
  const openView = useCallback(() => {
    const vp = viewport.current;
    if (!vp) return;
    const { width: vw, height: vh } = vp.getBoundingClientRect();
    const fitScale = Math.min((vw - 32) / layout.width, (vh - 32) / layout.height, 1);
    const n = focusId ? shownAs(focusId, layout) : null;
    if (fitScale >= READABLE || !n) return fit(false);
    const s = 0.86;
    apply(vw / 2 - (n.x + n.w / 2) * s, vh * 0.45 - (n.y + n.h / 2) * s, s, false);
  }, [layout, focusId, fit, apply]);

  const zoomBy = useCallback(
    (factor: number, cx?: number, cy?: number, animate = true) => {
      const vp = viewport.current;
      if (!vp) return;
      const rect = vp.getBoundingClientRect();
      const px = cx ?? rect.width / 2;
      const py = cy ?? rect.height / 2;
      const { x, y, s } = readView();
      const ns = Math.min(MAX, Math.max(minScale(), s * factor));
      apply(px - ((px - x) * ns) / s, py - ((py - y) * ns) / s, ns, animate);
    },
    [readView, apply, minScale],
  );

  // Open the view when the subject changes, and drag to pan. Until the student moves the
  // camera themselves, it follows the focus as the map loads and grows.
  const openRef = useRef(openView);
  const touched = useRef(false);
  useLayoutEffect(() => {
    openRef.current = openView;
  });
  useEffect(() => {
    if (!touched.current) openRef.current();
  }, [layout, focusId]);
  useGSAP(
    () => {
      touched.current = false;
      openRef.current();
      const [drag] = Draggable.create(world.current, {
        type: "x,y",
        trigger: viewport.current,
        inertia: !prefersReducedMotion(),
        cursor: "grab",
        activeCursor: "grabbing",
        dragClickables: false,
        zIndexBoost: false,
        onDragStart() {
          touched.current = true;
        },
        onDragEnd() {
          view.current = { ...view.current, x: this.x, y: this.y };
        },
      });
      return () => drag.kill();
    },
    { scope: viewport, dependencies: [layout.subjectId], revertOnUpdate: true },
  );

  // Wheel: pan; pinch or Ctrl + wheel: zoom around the pointer.
  useEffect(() => {
    const vp = viewport.current;
    if (!vp) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      touched.current = true;
      const rect = vp.getBoundingClientRect();
      if (e.ctrlKey || e.metaKey) {
        zoomBy(Math.exp(-e.deltaY * 0.01), e.clientX - rect.left, e.clientY - rect.top, false);
      } else {
        const { x, y, s } = readView();
        apply(x - e.deltaX, y - e.deltaY, s, false);
      }
    };
    // Focusing an off-screen node (Tab) makes the browser scroll the viewport; the camera does that job.
    const onScroll = () => {
      if (vp.scrollLeft || vp.scrollTop) vp.scrollTo(0, 0);
    };
    vp.addEventListener("wheel", onWheel, { passive: false });
    vp.addEventListener("scroll", onScroll);
    return () => {
      vp.removeEventListener("wheel", onWheel);
      vp.removeEventListener("scroll", onScroll);
    };
  }, [zoomBy, apply, readView]);

  // Bring the selected topic into view; while a trace is shown, bring the whole trace in,
  // zooming out only as far as it needs.
  useEffect(() => {
    const ids = traceOn && trace ? trace : selected ? [selected] : [];
    const nodes = ids.map((id) => shownAs(id, layout)).filter((n): n is LaidNode => Boolean(n));
    const vp = viewport.current;
    if (!nodes.length || !vp) return;
    const box = {
      x1: Math.min(...nodes.map((n) => n.x)),
      y1: Math.min(...nodes.map((n) => n.y)),
      x2: Math.max(...nodes.map((n) => n.x + n.w)),
      y2: Math.max(...nodes.map((n) => n.y + n.h)),
    };
    const rect = vp.getBoundingClientRect();
    const width = Math.max(240, rect.width - rightInset);
    const { x, y, s } = readView();
    const pad = 32;
    const inView =
      x + box.x1 * s > pad && y + box.y1 * s > pad && x + box.x2 * s < width - pad && y + box.y2 * s < rect.height - 90;
    if (inView) return;
    const fits = Math.min(s, (width - pad * 2) / (box.x2 - box.x1), (rect.height - pad * 4) / (box.y2 - box.y1));
    // Never zoom out past reading size: if the whole trace won't fit, centre on the selected topic.
    const own = selected ? shownAs(selected, layout) : null;
    const target = fits < LEGIBLE && own ? { x1: own.x, y1: own.y, x2: own.x + own.w, y2: own.y + own.h } : box;
    const ns = Math.max(LEGIBLE, Math.min(MAX, fits < LEGIBLE ? Math.max(s, LEGIBLE) : fits));
    apply(width / 2 - ((target.x1 + target.x2) / 2) * ns, rect.height / 2 - 30 - ((target.y1 + target.y2) / 2) * ns, ns);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, layout, traceOn, trace, rightInset]);

  // When a big topic opens, everything slides to its new place and the subtopics grow in.
  const placed = useRef<Map<string, { x: number; y: number }> | null>(null);
  useGSAP(
    () => {
      const before = placed.current;
      placed.current = new Map(layout.nodes.map((n) => [n.topic.id, { x: n.x, y: n.y }]));
      if (!before || before.size === 0 || prefersReducedMotion()) return;
      const arriving: string[] = [];
      for (const n of layout.nodes) {
        const was = before.get(n.topic.id);
        const sel = n.kind === "sub" ? `[data-node="${n.topic.id}"]` : `[data-big="${n.topic.id}"]`;
        if (!was) {
          arriving.push(sel);
          continue;
        }
        if (was.x !== n.x || was.y !== n.y) {
          gsap.from(sel, { x: was.x - n.x, y: was.y - n.y, duration: 0.6, ease: "power3.inOut", clearProps: "transform" });
        }
      }
      if (arriving.length) {
        gsap.from(arriving.join(","), {
          opacity: 0,
          scale: 0.9,
          duration: 0.45,
          delay: 0.35,
          stagger: 0.025,
          ease: "power2.out",
          clearProps: "opacity,transform",
        });
      }
      gsap.from("[data-edges]", { opacity: 0, duration: 0.4, delay: 0.45, clearProps: "opacity" });
    },
    { scope: viewport, dependencies: [layout] },
  );

  // A topic whose status just changed pulses once, so a confirmed check-in is seen landing.
  const previous = useRef(statuses);
  useGSAP(
    () => {
      const before = previous.current;
      previous.current = statuses;
      if (before === statuses || prefersReducedMotion()) return;
      for (const n of layout.nodes) {
        const id = n.topic.id;
        if (n.kind === "frame" || statusOf(before, id) === statusOf(statuses, id)) continue;
        gsap.fromTo(
          n.kind === "sub" ? `[data-node="${id}"]` : `[data-big="${id}"]`,
          { scale: 1.1 },
          { scale: 1, duration: 0.7, ease: "elastic.out(1, 0.45)", clearProps: "scale" },
        );
        gsap.fromTo(`[data-ring="${id}"]`, { opacity: 0.9, scale: 1 }, { opacity: 0, scale: 1.5, duration: 0.9, ease: "power2.out" });
      }
    },
    { scope: viewport, dependencies: [statuses] },
  );

  // The stuck trace draws itself from the stuck topic down to the suspect.
  useGSAP(
    () => {
      const paths = traceGroup.current?.querySelectorAll("path");
      if (!paths?.length) return;
      gsap.killTweensOf(paths);
      if (!traceOn) {
        gsap.to(paths, { opacity: 0, duration: 0.2 });
        return;
      }
      gsap.set(paths, { opacity: 1 });
      if (prefersReducedMotion()) {
        gsap.set(paths, { drawSVG: "0% 100%" });
        return;
      }
      const tl = gsap.timeline();
      paths.forEach((p) => tl.fromTo(p, { drawSVG: "100% 100%" }, { drawSVG: "0% 100%", duration: 0.45, ease: "power1.inOut" }));
    },
    { scope: viewport, dependencies: [traceOn, tracePaths] },
  );

  const hover = (id: string) => ({
    onPointerEnter: () => setHovered(id),
    onPointerLeave: () => setHovered((h) => (h === id ? null : h)),
    onFocus: () => setHovered(id),
    onBlur: () => setHovered((h) => (h === id ? null : h)),
  });

  const frames = layout.nodes.filter((n) => n.kind === "frame");
  const nextBig = nextId ? topicById.get(nextId)?.parentId ?? null : null;

  return (
    <div ref={viewport} className={styles.viewport} data-lit={lit ? "true" : undefined}>
      <div ref={world} className={styles.world} style={{ width: layout.width, height: layout.height }}>
        {/* Open big topics sit underneath as frames. */}
        {frames.map((n) => {
          const id = n.topic.id;
          const status = statusOf(statuses, id);
          const p = progressOf(id, statuses);
          return (
            <div
              key={id}
              data-big={id}
              className={styles.frame}
              style={{ left: n.x, top: n.y, width: n.w, height: n.h }}
              data-status={status}
              data-skip={!required.has(id) || undefined}
              data-dim={lit ? isDim(n, lit) : undefined}
            >
              <button
                type="button"
                className={styles.frameHead}
                aria-pressed={selected === id}
                aria-label={`${n.topic.name}: ${STATUS_LABEL[status]}, ${p.done} of ${p.total} core topics`}
                onClick={() => onSelect(id)}
                {...hover(id)}
              >
                <StatusMark status={status} />
                <span className={styles.frameName}>{n.topic.name}</span>
                <span className={`${styles.frameCount} num`}>
                  {p.done}/{p.total}
                </span>
              </button>
            </div>
          );
        })}

        <svg className={styles.edges} width={layout.width} height={layout.height} aria-hidden="true" data-edges>
          {layout.edges.map((e) => {
            const on = picture?.lines.has(lineKey(e)) ?? false;
            // Soft lines are drawn only for the topic in focus.
            if (e.kind === "helps" && !on) return null;
            // Inside a big topic needed as a whole, the lines keep their resting look.
            const whole = e.level === "sub" && lit?.whole.has(topicById.get(e.from)!.parentId!);
            const off = lit ? !on && !whole : !required.has(e.from);
            return (
              <g key={lineKey(e)} data-on={on || undefined} data-off={off || undefined} className={styles.line}>
                <path d={e.d} className={e.kind === "helps" ? styles.edgeSoft : e.level === "sub" ? styles.edgeInner : styles.edge} data-on={on || undefined} data-off={off || undefined} />
                <Arrowhead head={e.head} kind={e.kind === "helps" ? "soft" : on ? "on" : "rest"} />
              </g>
            );
          })}
          {picture?.extra.map((e) => (
            <g key={e.key}>
              <path d={e.d} className={styles.edgeSoft} data-on />
              <Arrowhead head={e.head} kind="soft" />
            </g>
          ))}
          {/* On hover, beads run up the lit lines, so the direction reads at a glance. Beads
              on a solid line, not gaps in it: gaps made every lit line look dashed, and
              dashed means "helps". */}
          {lit &&
            layout.edges
              .filter((e) => e.kind === "needs" && lit.lines.has(lineKey(e)))
              .map((e) => <path key={`f-${lineKey(e)}`} d={e.d} className={styles.flow} />)}
          <g ref={traceGroup}>
            {tracePaths.map((p) => (
              <path key={`t-${p.key}`} d={p.d} className={styles.trace} />
            ))}
          </g>
          {traceOn && tracePaths.map((p) => <Arrowhead key={`th-${p.key}`} head={p.head} kind="trace" />)}
        </svg>

        {layout.nodes.map((n) => {
          if (n.kind === "frame") return null;
          const id = n.topic.id;
          const status = statusOf(statuses, id);
          const skippable = !required.has(id);
          const dim = lit ? isDim(n, lit) : false;

          if (n.kind === "closed") {
            const p = progressOf(id, statuses);
            const hasNext = nextBig === id;
            return (
              <button
                key={id}
                type="button"
                data-big={id}
                className={styles.closed}
                style={{ left: n.x, top: n.y, width: n.w, height: n.h }}
                data-status={status}
                data-skip={skippable || undefined}
                data-dim={dim || undefined}
                data-target={targets.has(id) || undefined}
                aria-pressed={selected === id}
                aria-label={`${n.topic.name}: ${STATUS_LABEL[status]}, ${p.all} topics inside${skippable ? ", not needed for this goal" : ""}`}
                onClick={() => onSelect(id)}
                {...hover(id)}
              >
                <span className={styles.ring} data-ring={id} aria-hidden="true" />
                {hasNext && <span className={styles.nextTag}>Next</span>}
                <span className={styles.closedTop}>
                  <StatusMark status={status} />
                  <span className={styles.nodeName}>{n.topic.name}</span>
                </span>
                <span className={styles.closedMeta}>
                  <span className={styles.ticks} aria-hidden="true">
                    {Array.from({ length: p.total }, (_, i) => (
                      <span key={i} data-on={i < p.done || undefined} />
                    ))}
                  </span>
                  <span className="num">
                    {status === "know" ? "said I know" : `${p.all} inside`}
                  </span>
                </span>
              </button>
            );
          }

          return (
            <button
              key={id}
              type="button"
              data-node={id}
              className={styles.node}
              style={{ left: n.x, top: n.y, width: n.w, height: n.h }}
              data-status={status}
              data-skip={skippable || undefined}
              data-optional={n.topic.optional || undefined}
              data-dim={dim || undefined}
              data-next={id === nextId || undefined}
              aria-pressed={selected === id}
              aria-label={`${n.topic.name}: ${STATUS_LABEL[status]}${n.topic.optional ? ", optional" : ""}${skippable ? ", skippable for this goal" : ""}${id === nextId ? ", next" : ""}`}
              onClick={() => onSelect(id)}
              {...hover(id)}
            >
              <span className={styles.ring} data-ring={id} aria-hidden="true" />
              {id === nextId && <span className={styles.nextTag}>Next</span>}
              <StatusMark status={status} />
              <span className={styles.nodeText}>
                <span className={styles.nodeName}>{n.topic.name}</span>
              </span>
            </button>
          );
        })}
        {/* Names for the lines of the topic in focus, and "may be why" on the stuck trace.
            They keep their size on screen at any zoom. */}
        {relations.lines.map((l) => (
          <span
            key={`l-${l.key}`}
            className={styles.edgeLabel}
            data-kind={l.kind}
            style={{ left: l.near.x, top: l.near.y, transform: `translate(-50%, -50%) scale(${Math.min(1.6, 1 / scale)})` }}
          >
            {l.label}
          </span>
        ))}
        {relations.self && relations.summary.length > 0 && (() => {
          const n = layout.byId.get(relations.self!);
          if (!n) return null;
          return (
            <span
              className={`${styles.edgeLabel} ${styles.nodeTag} ${styles.summaryTag}`}
              style={{ left: n.x + n.w - 6, top: n.y + 3, transformOrigin: "right bottom", transform: `translate(-100%, -100%) scale(${Math.min(1.6, 1 / scale)})` }}
            >
              {relations.summary.map((x) => `${x.label} ${x.count}`).join(" · ")}
            </span>
          );
        })()}
        {/* Where a line is too short for its name, or the relation crosses big topics, the
            name sits above the box at the other end. */}
        {relations.tags.map((t) => {
          const n = layout.byId.get(t.id);
          if (!n) return null;
          const right = t.corner.endsWith("right");
          const top = t.corner.startsWith("top");
          return (
            <span
              key={`tag-${t.id}`}
              className={`${styles.edgeLabel} ${styles.nodeTag}`}
              data-kind={t.kind}
              style={{
                left: right ? n.x + n.w - 6 : n.x + 6,
                top: top ? n.y + 3 : n.y + n.h - 3,
                // Scaled from the corner that touches the box, so it grows away from it.
                transformOrigin: `${right ? "right" : "left"} ${top ? "bottom" : "top"}`,
                transform: `translate(${right ? "-100%" : "0"}, ${top ? "-100%" : "0"}) scale(${Math.min(1.6, 1 / scale)})`,
              }}
            >
              {t.label}
            </span>
          );
        })}
        {traceOn && traceSpot && (
          <span
            className={`${styles.edgeLabel} ${styles.traceLabel}`}
            style={{
              left: traceSpot.x,
              top: traceSpot.y,
              transform: `translate(-50%, -50%) scale(${Math.min(1.6, 1 / scale)})`,
            }}
          >
            may be why
          </span>
        )}
      </div>

      <div className={styles.legend} aria-label="Key">
        {(["done", "learning", "stuck", "shaky", "know", "new"] as Status[]).map((s) => (
          <span key={s}>
            <StatusMark status={s} />
            {STATUS_LABEL[s]}
          </span>
        ))}
        <span className={styles.legendLine}>
          <svg width="26" height="10" aria-hidden="true">
            <path d="M1 5H19" className={styles.legendEdge} />
            <path d="M18 1.5L24 5L18 8.5Z" className={styles.legendHead} />
          </svg>
          unlocks
        </span>
        <span className={styles.legendLine}>
          <svg width="26" height="10" aria-hidden="true">
            <path d="M1 5H19" className={styles.legendEdgeSoft} />
            <path d="M18 1.5L24 5L18 8.5Z" className={styles.legendHeadSoft} />
          </svg>
          helps (optional)
        </span>
        <span className={styles.legendSkip}>Faded: skippable · Dashed box: optional</span>
      </div>

      <div className={styles.zoom}>
        <button type="button" aria-label="Zoom out" onClick={() => ((touched.current = true), zoomBy(1 / 1.25))}>
          <Icon name="minus" />
        </button>
        <span className="num" aria-live="polite">
          {Math.round(scale * 100)}%
        </span>
        <button type="button" aria-label="Zoom in" onClick={() => ((touched.current = true), zoomBy(1.25))}>
          <Icon name="plus" />
        </button>
        <button type="button" aria-label="Fit the map" onClick={() => ((touched.current = true), fit())}>
          <Icon name="fit" />
        </button>
      </div>
      <span className="visually-hidden">{`${subjectById.get(layout.subjectId)!.name} map`}</span>
    </div>
  );
}
