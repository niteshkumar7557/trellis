"use client";

import { useRef } from "react";
import { gsap, prefersReducedMotion, useGSAP } from "@/lib/gsap";
import { statusOf } from "@/lib/graph";
import type { Status, SubjectId } from "@/lib/types";
import { layoutFor } from "./layout";

const NONE = new Set<string>();

interface Props {
  subjectId: SubjectId;
  /** Big topics the goal needs; everything else is drawn as skippable. */
  required: Set<string>;
  statuses?: Map<string, Status>;
  width?: number;
  height?: number;
  className?: string;
  /** Redraws (and re-animates) when this changes. */
  animateKey?: string;
}

/** The whole map in miniature: a dot per big topic, a line per prerequisite. */
export function MiniMap({ subjectId, required, statuses, width = 420, height = 300, className, animateKey }: Props) {
  const svg = useRef<SVGSVGElement>(null);
  const layout = layoutFor(subjectId, NONE, "mini");
  const pad = 8;
  const s = Math.min((width - pad * 2) / layout.width, (height - pad * 2) / layout.height);
  const ox = (width - layout.width * s) / 2;
  const oy = (height - layout.height * s) / 2;

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      gsap.fromTo("[data-req='1']", { opacity: 0.25 }, { opacity: 1, duration: 0.4, stagger: 0.012, ease: "power1.out" });
    },
    { scope: svg, dependencies: [animateKey] },
  );

  return (
    <svg ref={svg} width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={className} role="img" aria-label="The shape of this goal on the map">
      <g transform={`translate(${ox} ${oy}) scale(${s})`}>
        {layout.edges
          .filter((e) => e.kind === "needs")
          .map((e) => (
            <path
              key={`${e.from}-${e.to}`}
              d={e.d}
              fill="none"
              stroke={required.has(e.from) ? "var(--edge)" : "var(--edge-soft)"}
              strokeWidth={(required.has(e.from) ? 1.4 : 1) / s}
            />
          ))}
        {layout.nodes.map((n) => {
          const req = required.has(n.topic.id);
          const st = statuses ? statusOf(statuses, n.topic.id) : "new";
          const fill = !req ? "var(--edge-soft)" : st === "done" ? "var(--done)" : st === "stuck" ? "var(--stuck)" : st === "learning" ? "var(--learning)" : "var(--text)";
          return (
            <rect
              key={n.topic.id}
              data-req={req ? "1" : "0"}
              x={n.x}
              y={n.y}
              width={n.w}
              height={n.h}
              rx={n.h / 2}
              fill={fill}
            />
          );
        })}
      </g>
    </svg>
  );
}
