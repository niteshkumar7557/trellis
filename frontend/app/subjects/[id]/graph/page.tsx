"use client";

/**
 * =============================================================================
 * TOPIC DEPENDENCY GRAPH ROUTE: /subjects/[id]/graph
 * =============================================================================
 * Fullscreen topic dependency graph visualization.
 * Shows prerequisites, dependents, and what can be skipped.
 * 
 * 🔗 BACKEND LINK:
 *  GET /api/subjects/:id/graph -> Fetches graph nodes, dependency edges,
 *                                and user mastery estimates.
 * =============================================================================
 */

import { use, useState } from "react";
import Link from "next/link";
import { useTheme } from "@/lib/useTheme";
import Icon from "@/components/Icon";
import type { Topic, TopicGraph } from "@/lib/types";

const DEFAULT_GRAPH: TopicGraph = {
  nodes: [
    {
      id: "osi-model",
      name: "OSI Model",
      state: "solid",
      prerequisites: [],
      dependents: ["TCP/IP Stack"],
    },
    {
      id: "tcp-ip-stack",
      name: "TCP/IP Stack",
      state: "solid",
      prerequisites: ["OSI Model"],
      dependents: ["IP Addressing & Subnetting", "DNS"],
    },
    {
      id: "dns",
      name: "DNS Resolver Flow",
      state: "solid",
      prerequisites: ["TCP/IP Stack"],
      dependents: ["HTTP & HTTPS"],
    },
    {
      id: "tcp-connection",
      name: "TCP — Connection & Teardown",
      state: "shaky",
      prerequisites: ["TCP/IP Stack"],
      dependents: ["Congestion Control"],
    },
    {
      id: "congestion-control",
      name: "Congestion Control",
      state: "unseen",
      isNext: true,
      prerequisites: ["TCP — Connection & Teardown", "Sliding Window Protocol"],
      dependents: ["QoS", "Traffic Shaping"],
    },
  ],
  edges: [
    { source: "osi-model", target: "tcp-ip-stack" },
    { source: "tcp-ip-stack", target: "dns" },
    { source: "tcp-ip-stack", target: "tcp-connection" },
    { source: "tcp-connection", target: "congestion-control" },
  ],
};

// ─── Graph Legend Dot ─────────────────────────────────────────────────────────
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

// ─── Topic Detail Drawer ──────────────────────────────────────────────────────
function TopicDrawer({
  topic,
  onClose,
}: {
  topic: Topic;
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

        {/* Next step flag */}
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

// ─── Graph Page Root ──────────────────────────────────────────────────────────
interface PageProps {
  params: Promise<{ id: string }>;
}

export default function SubjectGraphPage({ params }: PageProps) {
  const { id } = use(params);
  const { darkMode } = useTheme();

  const [graphData] = useState<TopicGraph>(DEFAULT_GRAPH);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(DEFAULT_GRAPH.nodes[4]);

  return (
    <div
      className={`relative h-svh w-screen overflow-hidden flex flex-col bg-[#f7f6f3] dark:bg-[#1b1a19] text-[#252321] dark:text-[#e8e3de] ${
        darkMode ? "dark-mode" : ""
      }`}
    >
      {/* Top Navbar */}
      <header className="h-[52px] px-5 flex items-center justify-between border-b border-[#e8e5df] dark:border-[#302e2c] bg-[#faf9f7] dark:bg-[#232120] shrink-0 z-10">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-[12px] text-[#918a83] dark:text-[#7a736c] no-underline hover:text-[#34302c] dark:hover:text-[#eee9e4] transition-colors duration-[160ms]"
          >
            <Icon name="arrowLeft" size={13} />
            Back to chat
          </Link>
          <span className="text-[#d8d3cc] dark:text-[#3d3835]">/</span>
          <span className="font-manrope text-[13px] font-semibold capitalize text-[#26231f] dark:text-[#eee9e4]">
            {id} Topic Graph
          </span>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 hidden sm:flex">
          <Dot color="bg-[#82a57b]" label="Solid" />
          <Dot color="bg-[#d09a4e]" label="Shaky" />
          <Dot color="bg-[#c8c1ba] dark:bg-[#524c47]" label="Never seen" />
          <Dot color="bg-[#ba806e]" label="Next step" />
          <Dot color="bg-[#918a83]" label="Skippable" faded />
        </div>
      </header>

      {/* Main Canvas Area */}
      <div className="relative flex-1 overflow-hidden">
        <div className="h-full w-full flex items-center justify-center p-8">
          {/* Visual topic nodes preview */}
          <div className="flex flex-col gap-6 items-center">
            {graphData.nodes.map((topic) => (
              <button
                key={topic.id}
                type="button"
                onClick={() => setSelectedTopic(topic)}
                className={`p-4 rounded-xl border text-left min-w-[240px] transition-all cursor-pointer ${
                  selectedTopic?.id === topic.id
                    ? "border-[#ba806e] shadow-md bg-white dark:bg-[#252422]"
                    : "border-[#e8e5df] dark:border-[#302e2c] bg-[#faf9f7] dark:bg-[#232120]"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[13px] font-semibold text-[#26231f] dark:text-[#eee9e4]">
                    {topic.name}
                  </span>
                  {topic.isNext && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#ba806e] text-white font-medium">
                      Next
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-[#918a83] dark:text-[#7a736c] capitalize">
                  {topic.state} · {topic.prerequisites.length} prerequisites
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Selected Topic Detail Drawer */}
        {selectedTopic && (
          <TopicDrawer
            topic={selectedTopic}
            onClose={() => setSelectedTopic(null)}
          />
        )}
      </div>
    </div>
  );
}
