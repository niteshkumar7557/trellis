"use client";

// The hero: the real React Native map, drawn the way the app draws it.
//
// The topic boxes, the links and the arrowheads use the app map's own CSS classes
// (components/map/map.module.css), not copies of them. Why: a visitor should see the
// product, and a copy would drift the first time the map's look changes. The cost is that
// the landing page loads the map's stylesheet (small), and that a change to those classes
// shows up here too, which is the point.
//
// What is NOT shared is the canvas itself (MapCanvas.tsx: pan, zoom, opening a topic into
// its subtopics, the hover chains). The hero needs none of that, so it is a plain drawing
// of the same layout (components/map/layout.ts, size "plate").
//
// It is live. Changing the goal sets back what that goal lets you skip, and picking a topic
// says whether to skip it and why. Both answers come from shared/graph.ts.
//
// Sizing: the map is laid out in pixels (a "world", as in MapCanvas) and scaled down to the
// width it is given. Below 1100px the names no longer fit, so CSS hides them and each box
// is filled with its status colour: the same drawing as a miniature.

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { StatusMark } from "@/components/ui/Status";
import { HEAD_LENGTH, layoutFor } from "@/components/map/layout";
import map from "@/components/map/map.module.css";
import { gsap, prefersReducedMotion, useGSAP } from "@/lib/gsap";
import { subtopicsOf } from "@shared/data";
import { importanceOf, nextTopic, progressOf, requiredFor, statusOf, STATUS_LABEL } from "@shared/graph";
import type { Status } from "@shared/types";
import { goals, statuses, SUBJECT } from "./sample";
import styles from "./landing.module.css";

const NONE = new Set<string>();
const LEGEND: Status[] = ["done", "learning", "stuck", "shaky", "know", "new"];

export function HeroMap() {
  const root = useRef<HTMLDivElement>(null);
  const fit = useRef<HTMLDivElement>(null);
  const layout = layoutFor(SUBJECT, NONE, "plate");
  const [goalId, setGoalId] = useState(goals[0].id);
  const goal = goals.find((g) => g.id === goalId)!;
  const required = useMemo(() => requiredFor(goal), [goal]);

  // Until the visitor picks a topic, the readout shows the one the student should do next.
  const next = useMemo(() => nextTopic(goal, statuses), [goal]);
  const [picked, setPicked] = useState<string | null>(null);
  const shownId = picked ?? next?.parentId ?? layout.nodes[0].topic.id;
  const shown = layout.byId.get(shownId)!.topic;
  const verdict = importanceOf(shownId, goal, required);

  const bigOnRoute = layout.nodes.filter((n) => required.has(n.topic.id)).length;
  const canSkip = subtopicsOf(SUBJECT).filter((t) => !required.has(t.id)).length;

  // Rows from the bottom up, for the order things grow in.
  const rows = useMemo(() => [...new Set(layout.nodes.map((n) => Math.round(n.y)))].sort((a, b) => b - a), [layout]);
  const rowOf = (id: string) => rows.indexOf(Math.round(layout.byId.get(id)!.y));

  // Scale the world to the width available. The scale is written straight to a CSS variable
  // (no React state), so a resize doesn't re-render the map. Until this runs, the CSS
  // falls back to a scale that suits a 1440px screen.
  useLayoutEffect(() => {
    const el = fit.current!;
    const apply = () => el.style.setProperty("--s", String(el.clientWidth / layout.width));
    apply();
    const watch = new ResizeObserver(apply);
    watch.observe(el);
    return () => watch.disconnect();
  }, [layout.width]);

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      // The map grows the way the subject is learned: each row from the bottom up, its
      // links reaching it just before its topics appear.
      const row = (el: Element) => Number(el.getAttribute("data-row"));
      const tl = gsap.timeline({ defaults: { ease: "power2.out" }, delay: 0.15 });
      tl.from("[data-branch]", { drawSVG: "0%", duration: 0.5, ease: "power1.inOut", delay: (_, el) => row(el) * 0.22 }, 0);
      tl.from("[data-head]", { opacity: 0, duration: 0.2, delay: (_, el) => 0.45 + row(el) * 0.22, clearProps: "opacity" }, 0);
      // clearProps: once a topic has arrived, its opacity must belong to the CSS again, or
      // the goal switch (which sets skippable topics back) would have no effect.
      tl.from("[data-node]", { opacity: 0, y: 10, duration: 0.45, delay: (_, el) => 0.1 + row(el) * 0.22, clearProps: "opacity,transform" }, 0);
    },
    { scope: root },
  );

  return (
    <div ref={root} className={`${styles.sheet} ${styles.night}`} data-ui>
      <div ref={fit} className={styles.mapFit} style={{ aspectRatio: `${layout.width} / ${layout.height}` }}>
        <div
          className={styles.mapWorld}
          style={{ width: layout.width, height: layout.height }}
          role="group"
          aria-label={`The React Native map: ${layout.nodes.length} big topics, foundations at the bottom`}
        >
          <svg className={map.edges} width={layout.width} height={layout.height} aria-hidden="true">
            {layout.edges
              .filter((e) => e.kind === "needs")
              .map((e) => {
                const on = e.from === shownId || e.to === shownId;
                const off = !on && !(required.has(e.from) && required.has(e.to));
                return (
                  <g key={`${e.from}-${e.to}`} className={map.line} data-off={off || undefined}>
                    <path data-branch data-row={rowOf(e.from)} d={e.d} className={map.edge} data-on={on || undefined} data-off={off || undefined} />
                    <path
                      data-head
                      data-row={rowOf(e.from)}
                      d={`M0,0 L${-HEAD_LENGTH},-3.5 L${-HEAD_LENGTH},3.5 Z`}
                      // Rounded: server and browser can differ in the last digit, which breaks hydration.
                      transform={`translate(${e.head.x.toFixed(2)} ${e.head.y.toFixed(2)}) rotate(${e.head.angle.toFixed(2)})`}
                      className={map.arrowHead}
                      data-k={on ? "on" : "rest"}
                    />
                  </g>
                );
              })}
          </svg>

          {layout.nodes.map((n) => {
            const id = n.topic.id;
            const status = statusOf(statuses, id);
            const skippable = !required.has(id);
            const p = progressOf(id, statuses);
            return (
              <button
                key={id}
                type="button"
                data-node
                data-row={rowOf(id)}
                className={`${map.closed} ${styles.heroNode}`}
                style={{ left: n.x, top: n.y, width: n.w, height: n.h }}
                data-status={status}
                data-skip={skippable || undefined}
                data-target={goal.targets.includes(id) || undefined}
                aria-pressed={id === shownId}
                aria-label={`${n.topic.name}: ${STATUS_LABEL[status]}, ${p.all} topics inside${skippable ? ", not needed for this goal" : ""}`}
                onClick={() => setPicked(id)}
                onPointerEnter={(e) => e.pointerType === "mouse" && setPicked(id)}
              >
                <span className={map.closedTop}>
                  <StatusMark status={status} />
                  <span className={map.nodeName}>{n.topic.name}</span>
                </span>
                <span className={map.closedMeta}>
                  <span className={map.ticks} aria-hidden="true">
                    {Array.from({ length: p.total }, (_, i) => (
                      <span key={i} data-on={i < p.done || undefined} />
                    ))}
                  </span>
                  <span className="num">{status === "know" ? "said I know" : `${p.all} inside`}</span>
                </span>
              </button>
            );
          })}
        </div>

        {/* The key sits in the corner the map leaves empty: a subject is narrow at its
            foundations and wide at the top, so the bottom-left is always free. */}
        <ul className={styles.legend} aria-label="Key">
          {LEGEND.map((s) => (
            <li key={s}>
              <StatusMark status={s} size={10} />
              {STATUS_LABEL[s]}
            </li>
          ))}
          <li className={styles.legendNote}>One tick for each core part of a topic.</li>
          <li className={styles.legendNote}>Faded: this goal lets you skip it.</li>
        </ul>
      </div>

      <div className={styles.readout}>
        <div className={styles.readTopic} aria-live="polite">
          <p className={styles.readName}>
            <StatusMark status={statusOf(statuses, shownId)} size={11} />
            {shown.name}
            <span className={styles.verdict} data-verdict={verdict.verdict}>
              {verdict.verdict === "keep" ? "Don't skip" : "Can skip"}
            </span>
          </p>
          <p className={styles.readWhy}>
            {shown.summary} {verdict.reason}
          </p>
        </div>

        <div className={styles.readGoal}>
          <div className={styles.seg} role="radiogroup" aria-label="The goal this map is for">
            {goals.map((g) => (
              <button key={g.id} type="button" role="radio" aria-checked={g.id === goalId} className={styles.segBtn} onClick={() => setGoalId(g.id)}>
                {g.name}
              </button>
            ))}
          </div>
          <p className={`${styles.readCount} num`}>
            {bigOnRoute} of {layout.nodes.length} topics on this route, and {canSkip} smaller ones you can skip.
          </p>
        </div>
      </div>
    </div>
  );
}
