// /goal/[uid] — Individual goal detail page.
// Shows goal metadata, progress, and a brief activity feed.
// Dummy data used; real data will come from the backend/DB.

"use client";

import { notFound } from "next/navigation";
import { use } from "react";
import Link from "next/link";
import { useTheme } from "@/lib/useTheme";
import Sidebar from "@/components/Sidebar";
import Icon from "@/components/Icon";
import { DUMMY_GOALS } from "@/lib/dummy-data";

// ─── Dummy activity feed ───────────────────────────────────────────────────────

const DUMMY_ACTIVITY = [
  { id: 1, date: "Today", note: "Studied DNS resolver flow — it finally clicked." },
  { id: 2, date: "Yesterday", note: "Tried TCP congestion control. Slow-start still fuzzy." },
  { id: 3, date: "2 days ago", note: "Read UDP vs TCP overview. Good conceptual base." },
  { id: 4, date: "4 days ago", note: "Started OSI model revision." },
];

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  active: { label: "Active", dot: "bg-[#82a57b]", text: "text-[#4a7545]" },
  completed: { label: "Completed", dot: "bg-[#7b9fa8]", text: "text-[#2f6873]" },
  paused: { label: "Paused", dot: "bg-[#c0a87a]", text: "text-[#8a6b2a]" },
} as const;

// ─── Page ─────────────────────────────────────────────────────────────────────

interface PageProps {
  params: Promise<{ uid: string }>;
}

export default function GoalPage({ params }: PageProps) {
  const { uid } = use(params);
  const { darkMode } = useTheme();
  const goal = DUMMY_GOALS.find((g) => g.uid === uid);

  if (!goal) {
    notFound();
  }

  const status = STATUS_CONFIG[goal.status];

  return (
    <div
      className={`app-shell flex h-svh min-h-svh overflow-hidden text-[#252321] dark:text-[#e8e3de] bg-[#fbfaf8] dark:bg-[#1b1a19] ${
        darkMode ? "dark-mode" : ""
      }`}
    >
      {/* Sidebar — dummy new chat does nothing on goal pages */}
      <Sidebar />

      {/* Main content */}
      <main className="flex-1 min-w-0 overflow-y-auto">
        <div className="max-w-170 mx-auto px-8 py-10">

          {/* Back link */}
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-[12px] text-[#918a83] dark:text-[#7a736c] no-underline hover:text-[#6f6862] dark:hover:text-[#9e9690] mb-8 transition-colors duration-160"
          >
            <Icon name="arrowLeft" size={13} />
            Back to chat
          </Link>

          {/* Header */}
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={`w-1.75 h-1.75 rounded-full ${status.dot} shrink-0`} />
                <span className={`text-[11px] font-semibold uppercase tracking-wide ${status.text}`}>
                  {status.label}
                </span>
              </div>
              <h1 className="m-0 font-manrope text-[26px] font-bold tracking-[-0.04em] text-[#26231f] dark:text-[#eee9e4] leading-[1.2]">
                {goal.title}
              </h1>
              <p className="mt-1 text-[13px] text-[#918a83] dark:text-[#7a736c]">
                {goal.subject} · Last updated {goal.updatedAt}
              </p>
            </div>

            {/* Talk to Kero about this goal */}
            <Link
              href="/"
              className="shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold text-white bg-[#ba806e] hover:bg-[#a86e5f] no-underline transition-colors duration-160"
            >
              <Icon name="sparkle" size={14} />
              Talk to Kero
            </Link>
          </div>

          {/* Description */}
          <p className="mb-8 text-[14px] text-[#3f3a36] dark:text-[#c8c0b8] leading-[1.7]">
            {goal.description}
          </p>

          {/* Progress */}
          <div className="mb-8 p-5 rounded-2xl border border-[#e8e5df] dark:border-[#302e2c] bg-[#f4f2ee] dark:bg-[#222120]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[12px] font-semibold text-[#6f6862] dark:text-[#8e8881] uppercase tracking-wide">
                Progress
              </span>
              <span className="text-[22px] font-bold font-manrope text-[#34302c] dark:text-[#eee9e4] tracking-[-0.03em]">
                {goal.progress}%
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-[#e2dcd4] dark:bg-[#3b3835] overflow-hidden">
              <div
                className="h-full rounded-full bg-[#ba806e] dark:bg-[#c48e7a] transition-[width] duration-400"
                style={{ width: `${goal.progress}%` }}
              />
            </div>
          </div>

          {/* Activity feed */}
          <div>
            <h2 className="m-0 mb-4 text-[13px] font-semibold uppercase tracking-wide text-[#6f6862] dark:text-[#8e8881]">
              Recent activity
            </h2>

            {DUMMY_ACTIVITY.length === 0 ? (
              <p className="text-[13px] text-[#918a83] dark:text-[#7a736c]">
                No activity yet. Tell Kero what you studied.
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {DUMMY_ACTIVITY.map((item) => (
                  <div
                    key={item.id}
                    className="flex gap-4 p-4 rounded-xl border border-[#eeeae5] dark:border-[#2e2c2a] bg-[#fbfaf8] dark:bg-[#1d1c1b]"
                  >
                    <div className="flex flex-col items-center gap-1 shrink-0 pt-0.5">
                      <div className="w-1.75 h-1.75 rounded-full bg-[#ba806e] dark:bg-[#c48e7a]" />
                      <div className="flex-1 w-px bg-[#e8e5df] dark:bg-[#302e2c]" />
                    </div>
                    <div className="min-w-0 pb-1">
                      <time className="block text-[11px] text-[#918a83] dark:text-[#7a736c] mb-0.5">
                        {item.date}
                      </time>
                      <p className="m-0 text-[13px] text-[#3f3a36] dark:text-[#c8c0b8] leading-[1.6]">
                        {item.note}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* TODO badge */}
          <div className="mt-10 px-4 py-3 rounded-xl border border-dashed border-[#d8d0c8] dark:border-[#3d3835] text-[11px] text-[#918a83] dark:text-[#7a736c] text-center">
            Real goal data will be loaded from the backend. This is dummy content.
          </div>
        </div>
      </main>
    </div>
  );
}
