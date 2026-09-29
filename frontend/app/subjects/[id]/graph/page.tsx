"use client";

// /subjects/[id]/graph — Full-screen topic dependency graph.
// Standalone layout — no AppShell, to use the full viewport.
//
// Cytoscape.js integration TODO:
//   1. npm install cytoscape cytoscape-dagre
//   2. GET /goals/:id/graph → { nodes, edges }
//      node: { id, label, masteryState, isNext, isSkippable }
//      edge: { source, target }
//   3. useEffect: mount cytoscape into graphRef.current
//      layout: { name: 'dagre', rankDir: 'TB', nodeSep: 60, rankSep: 80 }
//   4. cy.on('tap', 'node', evt => setSelected(evt.target.data()))
//   5. Style nodes by masteryState:
//      solid → #82a57b, shaky → #d09a4e, unseen → #c8c1ba,
//      next → #ba806e with glow, skippable → dashed border, faded

import { useRef, useState } from "react";
import Link from "next/link";
import { useTheme } from "@/lib/useTheme";
import Icon from "@/components/Icon";

// ─── Mock selected topic (for drawer preview) ─────────────────────────────────

const MOCK_TOPIC = {
  id: "congestion-control",
  name: "Congestion Control",
  state: "unseen" as "solid" | "shaky" | "unseen",
  isNext: true,
  prerequisites: ["Sliding Window Protocol", "Retransmission Timeouts"],
  dependents: ["QoS", "Traffic Shaping"],
};

// ─── Legend dot ───────────────────────────────────────────────────────────────

function Dot({ color, label, faded }: { color: string; label: string; faded?: boolean }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${color} ${faded ? "opacity-40" : ""}`} />
      <span className={`text-[11px] ${faded ? "text-[#a29a93] dark:text-[#6f6862]" : "text-[#6f6862] dark:text-[#8e8881]"}`}>
        {label}
      </span>
    </span>
  );
}

// ─── Topic drawer ─────────────────────────────────────────────────────────────

function TopicDrawer({
  topic,
  onClose,
}: {
  topic: typeof MOCK_TOPIC;
  onClose: () => void;
}) {
  const stateChip: Record<string, string> = {
    solid: "text-[#4a7a42] dark:text-[#82a57b] bg-[#edf5eb] dark:bg-[#1e2e1c]",
    shaky: "text-[#9a6d28] dark:text-[#c9954a] bg-[#f5e6cb] dark:bg-[#3d2e10]",
    unseen: "text-[#6f6862] dark:text-[#8e8881] bg-[#f4f2ee] dark:bg-[#222120]",
  };

  return (
    <aside className="absolute right-0 top-0 bottom-0 w-[280px] flex flex-col border-l border-[#e8e5df] dark:border-[#302e2c] bg-[#faf9f7] dark:bg-[#232120] shadow-[-6px_0_20px_rgba(51,42,35,0.06)]">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#e8e5df] dark:border-[#302e2c]">
        <h3 className="m-0 font-manrope text-[14px] font-semibold text-[#26231f] dark:text-[#eee9e4] truncate pr-2">
          {topic.name}
        </h3>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="w-[26px] h-[26px] shrink-0 p-0 inline-grid place-items-center border-0 rounded-md text-[#918a83] dark:text-[#7a736c] bg-transparent hover:bg-[#ebe8e3] dark:hover:bg-[#302e2b] hover:text-[#34302c] dark:hover:text-[#eee9e4] cursor-pointer transition-colors duration-[140ms]"
        >
          <Icon name="arrowRight" size={14} />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-5">
        {/* State */}
        <div>
          <p className="m-0 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-[#a29a93] dark:text-[#6f6862]">
            Mastery
          </p>
          <span className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-semibold capitalize ${stateChip[topic.state]}`}>
            {topic.state}
          </span>
        </div>

        {/* Prerequisites */}
        {topic.prerequisites.length > 0 && (
          <div>
            <p className="m-0 mb-2 text-[10px] font-semibold uppercase tracking-widest text-[#a29a93] dark:text-[#6f6862]">
              Needs first
            </p>
            <div className="flex flex-col gap-1.5">
              {topic.prerequisites.map((p) => (
                <span key={p} className="flex items-center gap-1.5 text-[12px] text-[#3f3a36] dark:text-[#d7d1cb]">
                  <Icon name="arrowRight" size={11} />
                  {p}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Dependents */}
        {topic.dependents.length > 0 && (
          <div>
            <p className="m-0 mb-2 text-[10px] font-semibold uppercase tracking-widest text-[#a29a93] dark:text-[#6f6862]">
              Unlocks
            </p>
            <div className="flex flex-col gap-1.5">
              {topic.dependents.map((d) => (
                <span key={d} className="flex items-center gap-1.5 text-[12px] text-[#3f3a36] dark:text-[#d7d1cb]">
                  <Icon name="chevronRight" size={11} />
                  {d}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Next flag */}
        {topic.isNext && (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-[#e0d5cf] dark:border-[#3d3531] bg-[#fdf9f7] dark:bg-[#272422]">
            <Icon name="zap" size={13} />
            <p className="m-0 text-[12px] text-[#3f3a36] dark:text-[#d7d1cb]">
              This is your next step
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-[#e8e5df] dark:border-[#302e2c] flex flex-col gap-2">
        <Link
          href="/"
          className="block text-center px-4 py-2.5 rounded-lg text-[13px] font-semibold text-white bg-[#ba806e] hover:bg-[#a86e5f] no-underline transition-colors duration-[160ms]"
        >
          Tell Kero to work on this
        </Link>
        <p className="m-0 text-[10px] text-[#a29a93] dark:text-[#6f6862] text-center leading-snug">
          Kero will decide the best approach.
        </p>
      </div>
    </aside>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SubjectGraphPage() {
  const { darkMode, toggleTheme } = useTheme();
  const graphRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<typeof MOCK_TOPIC | null>(null);

  return (
    <div className={`flex flex-col h-svh overflow-hidden bg-[#fbfaf8] dark:bg-[#1b1a19] text-[#252321] dark:text-[#e8e3de] ${darkMode ? "dark-mode" : ""}`}>

      {/* Top bar */}
      <header className="flex items-center gap-3 px-5 h-[54px] shrink-0 border-b border-[#e8e5df] dark:border-[#302e2c] bg-[#faf9f7] dark:bg-[#232120]">
        {/* Back */}
        <Link
          href="/"
          className="flex items-center gap-1.5 text-[12px] font-medium text-[#6f6862] dark:text-[#8e8881] no-underline hover:text-[#34302c] dark:hover:text-[#eee9e4] transition-colors duration-[160ms] shrink-0"
        >
          <Icon name="arrowLeft" size={13} />
          Back to chat
        </Link>

        <span className="w-px h-4 bg-[#e0dbd5] dark:bg-[#403b36] shrink-0" />

        <span className="text-[12px] font-semibold text-[#34302c] dark:text-[#eee9e4]">
          {/* TODO: show goal name from params.id */}
          Topic graph
        </span>

        {/* Legend */}
        <div className="ml-auto flex items-center gap-4 mr-2">
          <Dot color="bg-[#82a57b]" label="Solid" />
          <Dot color="bg-[#d09a4e]" label="Shaky" />
          <Dot color="bg-[#c8c1ba]" label="Unseen" />
          <Dot color="bg-[#ba806e]" label="Next" />
          <Dot color="bg-[#c8c1ba]" label="Skip" faded />
        </div>

        {/* Theme toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          title={darkMode ? "Light mode" : "Dark mode"}
          className="w-[30px] h-[30px] p-0 inline-grid place-items-center border border-[#ded9d1] dark:border-[#45413d] rounded-full text-[#8f8881] dark:text-[#aaa29a] bg-[#faf9f7] dark:bg-[#292826] hover:border-[#cdbdb5] hover:text-[#9d6252] hover:-rotate-[10deg] dark:hover:border-[#896055] dark:hover:text-[#e1a18e] transition-[color,border-color,transform] duration-[180ms] cursor-pointer"
        >
          <Icon name={darkMode ? "sun" : "moon"} size={14} />
        </button>
      </header>

      {/* Graph area + optional drawer */}
      <div className="flex-1 relative overflow-hidden bg-[#f5f3f0] dark:bg-[#1a1918]">

        {/* Cytoscape canvas mounts here */}
        <div
          ref={graphRef}
          className="absolute inset-0"
          aria-label="Topic dependency graph"
        />

        {/* Placeholder until Cytoscape is wired */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 select-none pointer-events-none">
          <div className="w-[48px] h-[48px] grid place-items-center rounded-2xl border border-[#e0dbd5] dark:border-[#302e2c] bg-[#f4f2ee] dark:bg-[#222120] text-[#a29a93] dark:text-[#6f6862]">
            <Icon name="graph" size={22} />
          </div>
          <p className="m-0 text-[13px] font-semibold text-[#6f6862] dark:text-[#8e8881]">
            Graph renders here
          </p>
          <p className="m-0 text-[11px] text-[#a29a93] dark:text-[#6f6862] text-center max-w-[260px] leading-[1.6]">
            Wire Cytoscape.js — see TODO comments at the top of this file.
          </p>
          {/* Preview drawer */}
          <button
            type="button"
            className="pointer-events-auto mt-1 px-3 py-1.5 rounded-lg text-[11px] font-medium text-[#9d6252] dark:text-[#db9c88] border border-[#e0d5cf] dark:border-[#3d3531] bg-transparent hover:bg-[#fdf9f7] dark:hover:bg-[#272422] transition-colors duration-[160ms] cursor-pointer"
            onClick={() => setSelected(MOCK_TOPIC)}
          >
            Preview topic drawer
          </button>
        </div>

        {/* Topic drawer */}
        {selected && (
          <TopicDrawer
            topic={selected}
            onClose={() => setSelected(null)}
          />
        )}
      </div>
    </div>
  );
}
