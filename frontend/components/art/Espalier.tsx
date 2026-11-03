// An espalier: a fruit tree trained flat along trellis wires, one tier at a time.
// Drawn in code like a plate from an old gardening book. Each tier is a level of
// the map: foundations at the bottom, the goal at the top.
//
// Three seasons are drawn as separate layers so a parent can crossfade them:
//   [data-layer="bare"]   the trained wood alone
//   [data-layer="leaf"]   leaves on the spurs
//   [data-layer="fruit"]  fruit where topics are done

import { useMemo } from "react";

export interface EspalierProps {
  /** Spurs per arm, bottom tier first. Its length is the number of tiers. */
  tiers?: number[];
  /** Fraction of spurs, bottom first, that carry fruit. */
  ripeness?: number;
  seed?: number;
  /** Show the posts and wires of the trellis itself. */
  trellis?: boolean;
  /** Which seasons to draw. */
  layers?: ("bare" | "leaf" | "fruit")[];
  className?: string;
  title?: string;
}

const W = 400;
const H = 500;
const CX = W / 2;
const GROUND = 468;

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Spur {
  x: number;
  y: number;
  /** -1 grows up, 1 grows down. */
  dir: 1 | -1;
  len: number;
  lean: number;
  tier: number;
  order: number;
}

export function Espalier({
  tiers = [4, 4, 3, 3, 2],
  ripeness = 0.6,
  seed = 7,
  trellis = true,
  layers = ["bare", "leaf", "fruit"],
  className,
  title = "An espalier: a fruit tree trained in tiers along trellis wires",
}: EspalierProps) {
  const art = useMemo(() => draw(tiers, seed), [tiers, seed]);
  const ripeCount = Math.round(art.spurs.length * ripeness);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={className} role="img" aria-label={title}>
      {trellis && (
        <g data-part="trellis" stroke="var(--plate-wire)" strokeWidth="1.25" fill="none">
          <path d={`M24 ${GROUND + 2}V${art.tierY.at(-1)! - 26}M${W - 24} ${GROUND + 2}V${art.tierY.at(-1)! - 26}`} strokeWidth="3" stroke="var(--plate-post)" />
          {art.tierY.map((y) => (
            <path key={y} d={`M24 ${y}H${W - 24}`} />
          ))}
        </g>
      )}

      <path d={`M14 ${GROUND + 4}Q${CX} ${GROUND - 6} ${W - 14} ${GROUND + 4}`} stroke="var(--plate-ink)" strokeWidth="1.5" fill="none" />
      <g data-part="ground" stroke="var(--plate-ink)" strokeWidth="0.9" opacity="0.55">
        {art.hatch.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </g>

      {layers.includes("bare") && (
        <g data-layer="bare" fill="none" stroke="var(--plate-ink)" strokeLinecap="round" strokeLinejoin="round">
          <path data-grow="trunk" d={art.trunk} fill="var(--plate-ink)" stroke="none" />
          {art.arms.map((a, i) => (
            <g key={i}>
              <path data-grow="arm" d={a.d} strokeWidth={a.w} />
              <path data-grow="arm" d={a.d} strokeWidth={a.w * 0.35} stroke="var(--plate-paper)" opacity="0.5" transform="translate(0 -0.8)" />
            </g>
          ))}
          {art.spurs.map((s, i) => (
            <path key={i} data-grow="spur" d={spurPath(s)} strokeWidth="1.4" />
          ))}
        </g>
      )}

      {layers.includes("leaf") && (
        <g data-layer="leaf">
          {art.spurs.map((s, i) => (
            <g key={i} transform={`translate(${tipX(s)} ${tipY(s)}) rotate(${s.lean * 40 + (s.dir === -1 ? -90 : 90)})`}>
              <path data-leaf d="M0 0C5 -5 13 -5 18 0C13 5 5 5 0 0Z" fill="var(--plate-leaf)" stroke="var(--plate-ink)" strokeWidth="0.8" />
              <path d="M2 0H15" stroke="var(--plate-ink)" strokeWidth="0.6" opacity="0.7" />
              <path data-leaf d="M2 2C6 7 12 10 16 9C13 5 7 2 2 2Z" fill="var(--plate-leaf)" stroke="var(--plate-ink)" strokeWidth="0.8" />
            </g>
          ))}
        </g>
      )}

      {layers.includes("fruit") && (
        <g data-layer="fruit">
          {art.spurs
            .slice()
            .sort((a, b) => a.order - b.order)
            .slice(0, ripeCount)
            .map((s, i) => {
              const x = tipX(s) + (s.dir === 1 ? 0 : s.lean * 4);
              const y = tipY(s) + (s.dir === 1 ? 9 : -2) + 6;
              return (
                <g key={i} data-fruit>
                  <path d={`M${x} ${y - 7}v-5`} stroke="var(--plate-ink)" strokeWidth="1.1" />
                  <path
                    d={`M${x} ${y - 7}C${x + 5} ${y - 7} ${x + 7} ${y - 2} ${x + 7} ${y + 2}C${x + 7} ${y + 6} ${x + 4} ${y + 8} ${x} ${y + 8}C${x - 4} ${y + 8} ${x - 7} ${y + 6} ${x - 7} ${y + 2}C${x - 7} ${y - 2} ${x - 5} ${y - 7} ${x} ${y - 7}Z`}
                    fill="var(--plate-fruit)"
                    stroke="var(--plate-ink)"
                    strokeWidth="0.9"
                  />
                  <path d={`M${x - 3.2} ${y - 1.5}c.2-1.6 .9-2.6 1.9-3.2`} stroke="var(--plate-paper)" strokeWidth="1" fill="none" />
                </g>
              );
            })}
        </g>
      )}
    </svg>
  );
}

function tipX(s: Spur) {
  return s.x + s.lean * s.len;
}
function tipY(s: Spur) {
  return s.y + s.dir * s.len;
}
function spurPath(s: Spur) {
  const mx = s.x + s.lean * s.len * 0.35;
  const my = s.y + s.dir * s.len * 0.55;
  return `M${s.x} ${s.y}Q${mx} ${my} ${tipX(s)} ${tipY(s)}`;
}

function draw(tiers: number[], seed: number) {
  const r = rng(seed);
  const n = tiers.length;
  const top = 92;
  const step = (GROUND - 56 - top) / Math.max(1, n - 1);
  const tierY = tiers.map((_, i) => GROUND - 56 - i * step);

  // A tapered trunk, slightly alive.
  const topY = tierY[n - 1] - 30;
  const wob = (k: number) => (r() - 0.5) * k;
  const base = 9;
  const tip = 3;
  const pts = Array.from({ length: 7 }, (_, i) => {
    const t = i / 6;
    return { y: GROUND - t * (GROUND - topY), x: CX + wob(3) * (1 - t), w: base + (tip - base) * t };
  });
  const left = pts.map((p) => `${(p.x - p.w / 2).toFixed(1)} ${p.y.toFixed(1)}`);
  const right = pts.map((p) => `${(p.x + p.w / 2).toFixed(1)} ${p.y.toFixed(1)}`).reverse();
  const trunk = `M${left[0]}L${left.slice(1).join("L")}Q${CX} ${topY - 10} ${right[0]}L${right.slice(1).join("L")}Z`;

  const arms: { d: string; w: number }[] = [];
  const spurs: Spur[] = [];
  let order = 0;
  tierY.forEach((y, ti) => {
    const reach = 170 - ti * 6;
    const w = 5.2 - ti * 0.6;
    for (const side of [-1, 1] as const) {
      const sx = CX + side * 2;
      const sy = y + 22;
      const bendX = CX + side * 34;
      const endX = CX + side * reach;
      const sag = wob(4);
      arms.push({
        d: `M${sx} ${sy}C${sx} ${y + 4} ${bendX - side * 10} ${y} ${bendX} ${y}S${CX + side * reach * 0.7} ${y + sag} ${endX} ${y - 3 + wob(3)}`,
        w,
      });
      const count = tiers[ti];
      for (let k = 0; k < count; k++) {
        const t = (k + 0.6) / (count + 0.2);
        const x = bendX + side * (reach - 34) * t;
        const dir: 1 | -1 = k % 2 === 0 ? -1 : 1;
        spurs.push({
          x,
          y: y + (dir === 1 ? 1.5 : -1.5),
          dir,
          len: 14 + r() * 9,
          lean: side * (0.25 + r() * 0.35),
          tier: ti,
          order: order++,
        });
      }
    }
  });

  const hatch = Array.from({ length: 26 }, (_, i) => {
    const x = 24 + i * 14 + wob(6);
    return `M${x} ${GROUND + 8}l${6 + r() * 6} ${-3 - r() * 3}`;
  });

  return { trunk, arms, spurs, tierY, hatch };
}
