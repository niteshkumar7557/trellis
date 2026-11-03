"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { StatusMark } from "@/components/ui/Status";
import { kids, subjectById, topicById } from "@shared/data";
import { Draggable, gsap, prefersReducedMotion, useGSAP } from "@/lib/gsap";
import { STATUS_LABEL, helpsOf, needsOf, neededBy, progressOf, statusOf } from "@shared/graph";
import type { Status } from "@shared/types";
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
  onSelect: (id: string) => void;
}

const MIN = 0.3;
const MAX = 1.6;
/** Below this the names are too small to read, so the map opens on the focus topic instead. */
const READABLE = 0.72;
/** At most this many lines of one kind are named one by one; past that, one summary tag. */
const MAX_NAMED = 3;
/** The camera never zooms out past this on its own when bringing a topic into view. */
const LEGIBLE = 0.62;
/** How far along a line its name sits: near the end for lines into the topic in focus, near the start for lines out. */
const NEAR_END = 0.72;
const NEAR_START = 0.28;

/** An arrowhead with its tip on the line's end, turned along the line's last few pixels. */
function Arrowhead({ head, kind }: { head: Head; kind: "rest" | "on" | "soft" | "reach" | "trace" }) {
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

/** Every hard prerequisite below a topic, as the nodes that show them on this layout. */
function chainBelow(id: string, layout: Layout): Set<string> {
  const out = new Set<string>();
  const seen = new Set<string>();
  const stack = [id];
  while (stack.length) {
    const cur = stack.pop()!;
    if (seen.has(cur)) continue;
    seen.add(cur);
    const n = shownAs(cur, layout);
    if (n) out.add(n.topic.id);
    stack.push(...needsOf(cur));
  }
  return out;
}

export function MapCanvas({ layout, statuses, required, targets, nextId, selected, trace, traceOn, focusId, rightInset = 0, onSelect }: Props) {
  const viewport = useRef<HTMLDivElement>(null);
  const world = useRef<HTMLDivElement>(null);
  const traceGroup = useRef<SVGGElement>(null);
  const view = useRef({ x: 0, y: 0, s: 1 });
  const [hovered, setHovered] = useState<string | null>(null);
  const [scale, setScale] = useState(1);

  const lit = useMemo(() => (hovered ? chainBelow(hovered, layout) : null), [hovered, layout]);
  const focus = hovered ?? selected;

  // Links that leave a frame, and soft links, are only drawn for the topic in focus.
  const focusEdges = useMemo(() => {
    if (!focus) return [];
    const self = shownAs(focus, layout);
    if (!self) return [];
    const out: { key: string; d: string; mid: Point; trail: Point[]; head: Head; kind: "needs" | "helps"; label: string; t: number; other: string }[] = [];
    const add = (pre: string, dep: string, kind: "needs" | "helps") => {
      const a = shownAs(pre, layout);
      const b = shownAs(dep, layout);
      if (!a || !b || a === b) return;
      if (kind === "needs" && layout.edges.some((e) => e.from === b.topic.id && e.to === a.topic.id && e.kind === "needs")) return;
      if (a.kind === "frame" && b.topic.parentId === a.topic.id) return;
      if (b.kind === "frame" && a.topic.parentId === b.topic.id) return;
      const incoming = b === self;
      const l = link(a, b);
      out.push({
        key: `${kind}-${pre}-${dep}`,
        ...l,
        kind,
        label: kind === "helps" ? "helps" : incoming ? "needed first" : "unlocks",
        t: incoming ? NEAR_END : NEAR_START,
        other: incoming ? a.topic.id : b.topic.id,
      });
    };
    for (const p of needsOf(focus)) add(p, focus, "needs");
    for (const d of neededBy(focus)) add(focus, d, "needs");
    for (const p of helpsOf(focus)) add(p, focus, "helps");
    return out;
  }, [focus, layout]);

  // Names only where they answer a question: on the lines of the topic in focus.
  // A name sits on its line only if the line is long enough on screen to hold it and the
  // spot covers no topic. Otherwise it becomes a small tag on the topic at the other end.
  const relations = useMemo(() => {
    const none = {
      lines: [] as { key: string; kind: "needs" | "helps"; label: string; near: Point }[],
      tags: new Map<string, { kind: "needs" | "helps"; label: string }>(),
      /** On the topic in focus, when one kind of line is too many to name one by one. */
      summary: [] as { label: string; count: number }[],
      self: null as string | null,
    };
    if (!focus) return none;
    const self = shownAs(focus, layout)?.topic.id;
    if (!self) return none;
    const own = layout.edges
      .filter((e) => e.from === self || e.to === self)
      .map((e) => ({
        key: `${e.kind}-${e.from}-${e.to}`,
        trail: e.trail,
        t: e.from === self ? NEAR_END : NEAR_START,
        kind: e.kind,
        // `from` is the dependent: a line into the focus from below brings what it needs.
        label: e.kind === "helps" ? "helps" : e.from === self ? "needed first" : "unlocks",
        other: e.from === self ? e.to : e.from,
      }));
    const every = [...own, ...focusEdges.map(({ key, trail, t, kind, label, other }) => ({ key, trail, t, kind, label, other }))];
    // Naming the same relation six times is noise: past a few, say it once, on the topic in focus.
    const count = new Map<string, number>();
    for (const l of every) count.set(l.label, (count.get(l.label) ?? 0) + 1);
    const all = every.filter((l) => count.get(l.label)! <= MAX_NAMED);
    const summary = [...count].filter(([, n]) => n > MAX_NAMED).map(([label, n]) => ({ label, count: n }));

    // Labels keep their size on screen, so their footprint in the world grows as you zoom out.
    const k = Math.min(1.6, 1 / scale);
    const blocks = layout.nodes.filter((n) => n.kind !== "frame").map((n) => ({ x: n.x + n.w / 2, y: n.y + n.h / 2, w: n.w + 6, h: n.h + 6 }));
    const placed: { x: number; y: number; w: number; h: number }[] = [];
    const selfNode = layout.byId.get(self);
    if (summary.length && selfNode) placed.push({ x: selfNode.x + selfNode.w - 60 * k, y: selfNode.y, w: 120 * k, h: 20 * k });
    const clashes = (p: Point, w: number, h: number) =>
      [...placed, ...blocks].some((b) => Math.abs(b.x - p.x) < (b.w + w) / 2 && Math.abs(b.y - p.y) < (b.h + h) / 2);

    const lines: typeof none.lines = [];
    const tags: typeof none.tags = new Map();
    const sized = all.map((l) => {
      const w = (16 + l.label.length * 6) * k;
      const length = l.trail.slice(1).reduce((sum, p, i) => sum + Math.hypot(p.x - l.trail[i].x, p.y - l.trail[i].y), 0);
      // On screen, the line must be clearly longer than the label it carries.
      return { ...l, w, h: 20 * k, roomy: length * scale > (w / k) * 1.8 };
    });

    // First the tags, for lines too short to carry a name: their corners are taken.
    const tagBox = (id: string, w: number, h: number) => {
      const n = layout.byId.get(id);
      return n ? { x: n.x + n.w - 8 - w / 2, y: n.y, w, h } : null;
    };
    const toTag = (l: (typeof sized)[number]) => {
      if (tags.has(l.other)) return;
      tags.set(l.other, { kind: l.kind, label: l.label });
      const b = tagBox(l.other, l.w, l.h);
      if (b) placed.push(b);
    };
    for (const l of sized) if (!l.roomy) toTag(l);

    // Then names on the roomy lines, slid along each line until clear of topics, tags and each other.
    for (const l of sized) {
      if (!l.roomy) continue;
      const step = l.t > 0.5 ? -0.08 : 0.08;
      let spot: Point | null = null;
      for (let i = 0; i < 7 && !spot; i++) {
        const p = along(l.trail, Math.min(0.9, Math.max(0.1, l.t + step * i)));
        if (!clashes(p, l.w, l.h)) spot = p;
      }
      if (spot) {
        placed.push({ x: spot.x, y: spot.y, w: l.w, h: l.h });
        lines.push({ key: l.key, kind: l.kind, label: l.label, near: spot });
      } else {
        toTag(l);
      }
    }
    return { lines, tags, summary, self };
  }, [focus, layout, focusEdges, scale]);

  const tracePaths = useMemo(() => {
    if (!trace) return [];
    return trace.slice(0, -1).flatMap((from, i) => {
      const dep = shownAs(from, layout);
      const pre = shownAs(trace[i + 1], layout);
      return dep && pre && dep !== pre ? [{ key: `${from}-${trace[i + 1]}`, ...link(pre, dep) }] : [];
    });
  }, [trace, layout]);

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

  const fit = useCallback(
    (animate = true) => {
      const vp = viewport.current;
      if (!vp) return;
      const { width: vw, height: vh } = vp.getBoundingClientRect();
      const s = Math.min(MAX, Math.max(MIN, Math.min((vw - 32) / layout.width, (vh - 32) / layout.height, 1)));
      apply((vw - layout.width * s) / 2, (vh - layout.height * s) / 2, s, animate);
    },
    [layout, apply],
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
      const ns = Math.min(MAX, Math.max(MIN, s * factor));
      apply(px - ((px - x) * ns) / s, py - ((py - y) * ns) / s, ns, animate);
    },
    [readView, apply],
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
    <div ref={viewport} className={styles.viewport} data-hovering={hovered ? "true" : undefined}>
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
              data-dim={lit ? !lit.has(id) && !kids(id).some((c) => lit.has(c.id)) : undefined}
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
            if (e.kind === "helps" && e.from !== focus && e.to !== focus) return null;
            const on = lit ? lit.has(e.from) && lit.has(e.to) : false;
            const off = lit ? !on : !required.has(e.from);
            return (
              <g key={`${e.kind}-${e.from}-${e.to}`} data-on={on || undefined} data-off={off || undefined} className={styles.line}>
                <path d={e.d} className={e.kind === "helps" ? styles.edgeSoft : e.level === "sub" ? styles.edgeInner : styles.edge} data-on={on || undefined} data-off={off || undefined} />
                <Arrowhead head={e.head} kind={on ? "on" : e.kind === "helps" ? "soft" : "rest"} />
              </g>
            );
          })}
          {focusEdges.map((e) => (
            <g key={e.key}>
              <path d={e.d} className={e.kind === "helps" ? styles.edgeSoft : styles.edgeReach} />
              <Arrowhead head={e.head} kind={e.kind === "helps" ? "soft" : "reach"} />
            </g>
          ))}
          {/* On hover the lit chain flows upward, so the direction reads at a glance. */}
          {lit &&
            layout.edges
              .filter((e) => e.kind === "needs" && lit.has(e.from) && lit.has(e.to))
              .map((e) => <path key={`f-${e.from}-${e.to}`} d={e.d} className={styles.flow} />)}
          {lit &&
            focusEdges
            .filter((e) => e.kind === "needs")
            .map((e) => (
              <path key={`f-${e.key}`} d={e.d} className={styles.flow} />
            ))}
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
          const dim = lit ? !lit.has(id) : false;

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
              style={{ left: n.x + n.w - 8, top: n.y, transform: `translate(-100%, -50%) scale(${Math.min(1.6, 1 / scale)})` }}
            >
              {relations.summary.map((x) => `${x.label} ${x.count}`).join(" · ")}
            </span>
          );
        })()}
        {/* Where a line is too short for its name, the name sits on the topic at the other end. */}
        {[...relations.tags].map(([id, t]) => {
          const n = layout.byId.get(id);
          if (!n) return null;
          return (
            <span
              key={`tag-${id}`}
              className={`${styles.edgeLabel} ${styles.nodeTag}`}
              data-kind={t.kind}
              style={{ left: n.x + n.w - 8, top: n.y, transform: `translate(-100%, -50%) scale(${Math.min(1.6, 1 / scale)})` }}
            >
              {t.label}
            </span>
          );
        })}
        {traceOn && tracePaths.length > 0 && (
          <span
            className={`${styles.edgeLabel} ${styles.traceLabel}`}
            style={{
              left: tracePaths[tracePaths.length - 1].mid.x,
              top: tracePaths[tracePaths.length - 1].mid.y,
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
