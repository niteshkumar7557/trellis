"use client";

// "Stuck" as a scroll scene: the sample student is stuck on FlatList, and the page shows
// the rule working, one step per stretch of scroll:
//   1. what they said;
//   2. the trace running down the map, one step, then two;
//   3. the evidence for each topic it reaches;
//   4. the one with the weakest evidence, named first.
//
// The topics, their statuses, the evidence and the ranking all come from suspectsFor() via
// ./sample.ts. Only where each topic sits in this small drawing is decided here.
//
// How the motion is built, and why:
// - The finished drawing is the default. It is what the HTML and CSS show with no script,
//   on a phone, and for anyone who asked for less motion. The scene only ever hides things
//   and brings them back, so nothing can be left missing.
// - On a wide screen the section is pinned and one GSAP timeline is tied to the scroll
//   (scrub). A timeline, not four separate triggers, because the steps must stay in order
//   when someone scrolls back up.

import { useLayoutEffect, useRef } from "react";
import { StatusMark } from "@/components/ui/Status";
import { connect } from "@/components/map/layout";
import { gsap, useGSAP } from "@/lib/gsap";
import { needsOf } from "@shared/graph";
import type { Status } from "@shared/types";
import { likely, STUCK_ID, stuckDays, stuckTopic, stuckWords, trace } from "./sample";
import styles from "./landing.module.css";

const W = 860;
const H = 500;
const NODE_W = 248;
/** Two lines: the topic's name, and the evidence for it. */
const NODE_H = 64;
/** The name's and the evidence's full sizes; keep in step with .traceName and .evidence in landing.module.css. */
const NAME_SIZE = 16;
const NOTE_SIZE = 14;
const ROW_Y = [20, 206, 416]; // the stuck topic, one step down, two steps down

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** A line of the trace, from a topic down to one it needs. */
interface Line {
  upper: string;
  lower: string;
  step: 1 | 2;
  /** On the way from the stuck topic to the one named first. */
  likely: boolean;
}

/** The smallest space between two boxes in a row, and between a box and the edge. */
const MIN_GAP = 16;

/**
 * Lays out one row: the boxes spread evenly across the drawing, as wide as NODE_W when
 * they fit and narrower when they don't. Narrowing beats the alternatives: a wider
 * drawing would shrink every label on the page, and a second row would read as a third
 * step down, which the rule doesn't take.
 */
function spread(count: number, y: number): Box[] {
  const w = Math.min(NODE_W, (W - (count + 1) * MIN_GAP) / count);
  const gap = (W - count * w) / (count + 1);
  return Array.from({ length: count }, (_, i) => ({ x: gap + i * (w + gap), y, w, h: NODE_H }));
}

/**
 * Where each topic sits: the rows are the steps. Step 2 is ordered by where the topics
 * that need it sit, so its lines cross as little as possible, then spread like step 1.
 *
 * It used to put each step-2 topic straight under the middle of the topics that need it.
 * That looked tidy with two or three, but the redesigned React Native (15 Nov 2026) gave
 * FlatList four, and two of them landed on the same spot. Spreading can't overlap.
 */
function place() {
  const boxes = new Map<string, Box>();
  const lines: Line[] = [];
  const onPath = (upper: string, lower: string) => {
    const i = likely.path.indexOf(upper);
    return i !== -1 && likely.path[i + 1] === lower;
  };

  boxes.set(STUCK_ID, { x: (W - NODE_W) / 2, y: ROW_Y[0], w: NODE_W, h: NODE_H });
  const one = trace.filter((t) => t.step === 1);
  const oneBoxes = spread(one.length, ROW_Y[1]);
  one.forEach((t, i) => {
    boxes.set(t.topic.id, oneBoxes[i]);
    lines.push({ upper: STUCK_ID, lower: t.topic.id, step: 1, likely: onPath(STUCK_ID, t.topic.id) });
  });

  const two = trace
    .filter((x) => x.step === 2)
    .map((t) => {
      const parents = one.filter((o) => needsOf(o.topic.id).includes(t.topic.id));
      const xs = parents.map((p) => boxes.get(p.topic.id)!.x);
      return { t, parents, at: xs.reduce((a, b) => a + b, 0) / xs.length };
    })
    .sort((a, b) => a.at - b.at);
  const twoBoxes = spread(two.length, ROW_Y[2]);
  two.forEach(({ t, parents }, i) => {
    boxes.set(t.topic.id, twoBoxes[i]);
    for (const p of parents) lines.push({ upper: p.topic.id, lower: t.topic.id, step: 2, likely: onPath(p.topic.id, t.topic.id) });
  });
  return { boxes, lines };
}

const { boxes, lines } = place();

export function StuckTrace() {
  const root = useRef<HTMLElement>(null);

  // Every name shows in full: each row's names are measured, and the row is set in the
  // size at which its longest name fits its box (the evidence line shrinks by the same
  // amount, so the name stays the bigger of the two). A row shrinks together so its boxes
  // look alike. Measured, not estimated: letter widths vary too much (Components is 9.4px a
  // letter at 16px, ScrollView 7.9), and an estimate cut names that fitted. This runs before
  // the first paint, and again once the web font has loaded, since that changes the widths.
  // The server's HTML has the full size; only a name that doesn't fit is made smaller.
  useLayoutEffect(() => {
    const svg = root.current?.querySelector("svg");
    if (!svg) return;
    const fit = () => {
      for (const row of ["0", "1", "2"]) {
        const names = [...svg.querySelectorAll<SVGTextElement>(`[data-name-row="${row}"]`)];
        const notes = [...svg.querySelectorAll<SVGTextElement>(`[data-note-row="${row}"]`)];
        for (const t of [...names, ...notes]) t.style.fontSize = "";
        const scale = Math.min(1, ...names.map((t) => Number(t.dataset.room) / t.getComputedTextLength()));
        if (scale >= 1) continue;
        for (const t of names) t.style.fontSize = `${NAME_SIZE * scale}px`;
        for (const t of notes) t.style.fontSize = `${NOTE_SIZE * scale}px`;
      }
    };
    fit();
    let live = true;
    void document.fonts?.ready.then(() => live && fit());
    return () => {
      live = false;
    };
  }, []);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(min-width: 901px) and (prefers-reduced-motion: no-preference)", () => {
        const tl = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: { trigger: root.current, start: "top top", end: "+=110%", pin: true, scrub: 0.5 },
        });
        // It starts from only the stuck topic and what was said about it.
        tl.from("[data-line='1']", { drawSVG: "0%", duration: 1, stagger: 0.12 }, 0.3)
          .from("[data-topic='1']", { opacity: 0, duration: 0.5, stagger: 0.12 }, "<0.4")
          .from("[data-line='2']", { drawSVG: "0%", duration: 1, stagger: 0.12 })
          .from("[data-topic='2']", { opacity: 0, duration: 0.5, stagger: 0.12 }, "<0.4")
          .from("[data-evidence]", { opacity: 0, duration: 0.5, stagger: 0.15 }, "+=0.2")
          // The lines that led nowhere fade to their resting opacity (set in the CSS).
          .from("[data-cleared]", { opacity: 1, duration: 0.8 }, "+=0.3")
          .from("[data-verdict]", { opacity: 0, scale: 0.9, transformOrigin: "50% 50%", duration: 0.6 }, "<")
          .to({}, { duration: 0.6 }); // hold the result before the pin lets go

        // The three sentences on the left light up as their step plays.
        const steps = gsap.utils.toArray<HTMLElement>("[data-step]");
        gsap.set(steps.slice(1), { opacity: 0.35 });
        tl.to(steps[1], { opacity: 1, duration: 0.4 }, 0.8).to(steps[2], { opacity: 1, duration: 0.4 }, tl.duration() - 2);
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} className={styles.stuck} aria-labelledby="stuck-title">
      <div className={styles.stuckText}>
        <h2 id="stuck-title" className={styles.h2}>
          Stuck is traced, not guessed
        </h2>
        <p data-step>
          You say you got nowhere with {stuckTopic.name}. That is the most useful thing you can tell it.
        </p>
        <p data-step>
          Trellis follows the map down two steps and looks at the evidence for each topic underneath: what you finished,
          what was hard, what you only said you knew.
        </p>
        <p data-step>
          The weakest footing is named first, and your prompt starts there. It is a fixed rule you can read, never an
          AI&apos;s opinion.
        </p>
      </div>

      <div className={styles.stuckArt} data-ui>
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Stuck on ${stuckTopic.name}. May be why: ${likely.topic.name}.`}>
          {lines.map((l) => (
            <path
              key={`${l.upper}-${l.lower}`}
              data-line={l.step}
              data-cleared={l.likely ? undefined : ""}
              className={styles.traceLine}
              data-likely={l.likely || undefined}
              // Drawn from the upper topic downward: the direction the rule looks in.
              d={reverse(connect(boxes.get(l.lower)!, boxes.get(l.upper)!))}
            />
          ))}

          <TraceNode id={STUCK_ID} row={0} name={stuckTopic.name} status="stuck" tone="stuck" note={`Stuck for ${stuckDays} days`} />
          {trace.map((t) => (
            <g key={t.topic.id} data-topic={t.step}>
              <TraceNode id={t.topic.id} row={t.step} name={t.topic.name} status={t.status} tone={t.place === 0 ? "likely" : undefined} note={t.evidence} />
            </g>
          ))}

          {/* The verdict, pinned to the topic the rule names first. */}
          <g data-verdict transform={`translate(${boxes.get(likely.topic.id)!.x + boxes.get(likely.topic.id)!.w - 60} ${boxes.get(likely.topic.id)!.y - 6})`}>
            <rect className={styles.verdictTag} x="-52" y="-15" width="104" height="26" rx="13" />
            <text className={styles.verdictText} y="3">
              May be why
            </text>
          </g>
        </svg>

        <p className={styles.said}>“{stuckWords}”</p>

        {/* The same result as a list, for screens too narrow for the drawing: the stuck
            topic, then what is underneath it in the order the rule ranks them. */}
        <ol className={styles.traceList}>
          {[...trace]
            .sort((a, b) => (a.place ?? 99) - (b.place ?? 99))
            .map((t) => (
              <li key={t.topic.id} data-likely={t.place === 0 || undefined}>
                <StatusMark status={t.status} size={12} />
                <span className={styles.traceListName}>{t.topic.name}</span>
                <span className={styles.traceListNote}>{t.place === 0 ? `May be why. ${t.evidence}` : t.evidence}</span>
              </li>
            ))}
        </ol>
      </div>
    </section>
  );
}

interface NodeProps {
  id: string;
  /** Which step it is (0 is the stuck topic): a row's names share one size. */
  row: number;
  name: string;
  status: Status;
  tone?: "stuck" | "likely";
  /** The evidence line under the name. */
  note?: string;
}

function TraceNode({ id, row, name, status, tone, note }: NodeProps) {
  const b = boxes.get(id)!;
  return (
    <g transform={`translate(${b.x} ${b.y})`}>
      <rect className={styles.traceBox} data-tone={tone} width={b.w} height={b.h} rx="8" />
      <g transform="translate(16 15)">
        <StatusMark status={status} size={12} />
      </g>
      {/* data-room: the width the name may take, from after the mark to 12px short of the edge. */}
      <text className={styles.traceName} x="38" y="27" data-name-row={row} data-room={b.w - 38 - 12}>
        {name}
      </text>
      {note && (
        <text data-evidence data-note-row={row} className={styles.evidence} x="38" y="49">
          {note}
        </text>
      )}
    </g>
  );
}

/**
 * connect() draws a link upward, from a prerequisite to the topic that needs it, as one
 * cubic curve "M a C b c d". The trace should draw itself downward, so swap the ends.
 */
function reverse(d: string) {
  const [a, b, c, e] = d.replace(/[MC]/g, " ").trim().split(/\s+/);
  return `M${e} C${c} ${b} ${a}`;
}
