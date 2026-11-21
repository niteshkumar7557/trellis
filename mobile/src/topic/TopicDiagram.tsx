// A small drawing of where a topic sits (docs/mobile.md §5): what it needs below, the topic
// in the middle, what it unlocks above. The phone's stand-in for the web's big map, drawn by
// the map's own rules (CLAUDE.md "Map look"): learning goes UP, so every line leaves a box's
// top, enters the next one's bottom, and ends in a straight 8px stem under an upward head.
// Up to three boxes a row; "+2 more" when there are more.

import { topicById } from "@shared/data";
import { statusOf } from "@shared/graph";
import type { Status } from "@shared/types";
import { useState } from "react";
import { View } from "react-native";
import Svg, { Path, Rect, Text as SvgText } from "react-native-svg";
import { useTheme } from "@/theme/theme";
import { font } from "@/theme/type";

interface Props {
  topicId: string;
  needs: string[];
  unlocks: string[];
  statuses: Map<string, Status>;
}

const BOX_H = 36;
const ROW_GAP = 34;
const MAX = 3;

export function TopicDiagram({ topicId, needs, unlocks, statuses }: Props) {
  const { c } = useTheme();
  const [width, setWidth] = useState(0);
  const rows = [unlocks.slice(0, MAX), [topicId], needs.slice(0, MAX)].filter((r, i) => i === 1 || r.length > 0);
  const hasUp = unlocks.length > 0;
  const height = rows.length * BOX_H + (rows.length - 1) * ROW_GAP + 4;

  /** Where each box in a row goes: equal widths with 8px gaps. */
  const boxes = (ids: string[], y: number) => {
    const gap = 8;
    const w = Math.min(160, (width - gap * (ids.length - 1)) / ids.length);
    const total = w * ids.length + gap * (ids.length - 1);
    const x0 = (width - total) / 2;
    return ids.map((id, i) => ({ id, x: x0 + i * (w + gap), y, w }));
  };

  const ys = rows.map((_, i) => 2 + i * (BOX_H + ROW_GAP));
  const centreRow = hasUp ? 1 : 0;
  const placed = rows.map((ids, i) => boxes(ids, ys[i]!));
  const me = placed[centreRow]![0]!;

  /** A line from the top of `from` up to the bottom of `to`, as one smooth S, with its head. */
  const link = (from: { x: number; y: number; w: number }, to: { x: number; y: number; w: number }) => {
    const x1 = from.x + from.w / 2;
    const y1 = from.y;
    const x2 = to.x + to.w / 2;
    const y2 = to.y + BOX_H + 8; // the 8px straight stem ends here, under the head
    const mid = (y1 + y2) / 2;
    return `M${x1} ${y1}C${x1} ${mid} ${x2} ${mid} ${x2} ${y2}L${x2} ${y2 - 8}`;
  };
  const head = (to: { x: number; y: number; w: number }) => {
    const x = to.x + to.w / 2;
    const y = to.y + BOX_H;
    return `M${x - 4} ${y + 5}L${x} ${y + 1}L${x + 4} ${y + 5}`;
  };

  const fill = (id: string, mine: boolean) => {
    if (mine) return { bg: c.primary, ink: c.onPrimary, line: c.primary };
    const s = statusOf(statuses, id);
    if (s === "done") return { bg: c.doneBg, ink: c.doneInk, line: c.done };
    if (s === "stuck") return { bg: c.stuckBg, ink: c.stuckInk, line: c.stuck };
    if (s === "learning") return { bg: c.learningBg, ink: c.learningInk, line: c.learning };
    if (s === "shaky") return { bg: c.shakyBg, ink: c.shakyInk, line: c.shaky };
    return { bg: c.surface, ink: c.text, line: c.control };
  };

  /** Names are cut to fit their box (Plex at 12px is about 6.6px a character). */
  const fit = (name: string, w: number) => {
    const n = Math.floor((w - 16) / 6.6);
    return name.length > n ? `${name.slice(0, Math.max(1, n - 1))}…` : name;
  };

  const more = (count: number) => (count > MAX ? ` +${count - MAX} more` : "");

  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      accessibilityLabel={`Needs ${needs.map((id) => topicById.get(id)!.name).join(", ") || "nothing"}. Unlocks ${unlocks.map((id) => topicById.get(id)!.name).join(", ") || "nothing"}.`}
    >
      {width > 0 && (
        <Svg width={width} height={height}>
          {hasUp && placed[0]!.map((b) => <Path key={`l${b.id}`} d={link(me, b)} stroke={c.edge} strokeWidth={1.5} fill="none" />)}
          {hasUp && placed[0]!.map((b) => <Path key={`h${b.id}`} d={head(b)} stroke={c.edge} strokeWidth={1.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />)}
          {placed[centreRow + 1]?.map((b) => <Path key={`l${b.id}`} d={link(b, me)} stroke={c.edge} strokeWidth={1.5} fill="none" />)}
          {placed[centreRow + 1] && <Path d={head(me)} stroke={c.edge} strokeWidth={1.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />}
          {placed.flat().map((b) => {
            const mine = b.id === topicId;
            const f = fill(b.id, mine);
            return (
              <Rect key={`b${b.id}`} x={b.x} y={b.y} width={b.w} height={BOX_H} rx={8} fill={f.bg} stroke={f.line} strokeWidth={1} />
            );
          })}
          {placed.flat().map((b) => {
            const mine = b.id === topicId;
            return (
              <SvgText
                key={`t${b.id}`}
                x={b.x + b.w / 2}
                y={b.y + BOX_H / 2 + 4}
                textAnchor="middle"
                fontSize={12}
                fontFamily={font[mine ? 600 : 500]}
                fill={fill(b.id, mine).ink}
              >
                {fit(topicById.get(b.id)!.name, b.w)}
              </SvgText>
            );
          })}
          {hasUp && unlocks.length > MAX && (
            <SvgText x={width - 2} y={ys[0]! - 2 + BOX_H + 14} textAnchor="end" fontSize={11} fontFamily={font[400]} fill={c.muted}>
              {more(unlocks.length).trim()}
            </SvgText>
          )}
          {needs.length > MAX && (
            <SvgText x={width - 2} y={height - 1} textAnchor="end" fontSize={11} fontFamily={font[400]} fill={c.muted}>
              {more(needs.length).trim()}
            </SvgText>
          )}
        </Svg>
      )}
    </View>
  );
}
