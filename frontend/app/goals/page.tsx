"use client";

/**
 * =============================================================================
 * ALL GOALS ROUTE: /goals
 * =============================================================================
 * Displays all study goals, separated into Active and Completed/Paused.
 * 
 * 🔗 BACKEND LINK:
 *  GET /api/goals -> Fetches all user goals with progress percentages and status
 * =============================================================================
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTheme } from "@/lib/useTheme";
import Sidebar from "@/components/Sidebar";
import { api } from "@/lib/api";
import type { Goal } from "@/lib/types";

// ─── Status Badge Styling ─────────────────────────────────────────────────────
const STATUS_CONFIG: Record<
  Goal["status"],
  { label: string; dot: string; badge: string }
> = {
  active: {
    label: "Active",
    dot: "bg-[#82a57b]",
    badge: "text-[#4a7545] bg-[#eaf3e7] dark:text-[#7ec478] dark:bg-[#1e2e1c]",
  },
  completed: {
    label: "Completed",
    dot: "bg-[#7b9fa8]",
    badge: "text-[#2f6873] bg-[#e5f2f5] dark:text-[#6bb8c6] dark:bg-[#152226]",
  },
  paused: {
    label: "Paused",
    dot: "bg-[#c0a87a]",
    badge: "text-[#8a6b2a] bg-[#fdf5e4] dark:text-[#c9a84c] dark:bg-[#2a2010]",
  },
};

export default function GoalsPage() {
  const { darkMode } = useTheme();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    // 🔗 BACKEND LINK: GET /api/goals
    async function fetchGoals() {
      try {
        const data = await api.goals.list();
        if (isMounted) setGoals(data);
      } catch (err) {
        console.error("Failed to load goals from backend:", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    fetchGoals();
    return () => {
      isMounted = false;
    };
  }, []);

  const active = goals.filter((g) => g.status === "active");
  const others = goals.filter((g) => g.status !== "active");

  return (
    <div
      className={`app-shell flex h-svh min-h-svh overflow-hidden text-[#252321] dark:text-[#e8e3de] bg-[#fbfaf8] dark:bg-[#1b1a19] ${
        darkMode ? "dark-mode" : ""
      }`}
    >
      <Sidebar />

      <main className="flex-1 min-w-0 overflow-y-auto">
        <div className="max-w-[680px] mx-auto px-8 py-10">

          {/* Header */}
          <div className="mb-8">
            <h1 className="m-0 font-manrope text-[24px] font-bold tracking-[-0.04em] text-[#26231f] dark:text-[#eee9e4]">
              Goals
            </h1>
            <p className="m-0 mt-1 text-[13px] text-[#918a83] dark:text-[#7a736c]">
              {active.length} active · {others.length} others
            </p>
          </div>

          {isLoading ? (
            <p className="text-[13px] text-[#918a83] dark:text-[#7a736c]">
              Loading goals…
            </p>
          ) : (
            <>
              {/* Active goals section */}
              {active.length > 0 && (
                <section className="mb-8">
                  <h2 className="m-0 mb-3 text-[11px] font-semibold uppercase tracking-wide text-[#6f6862] dark:text-[#8e8881]">
                    Active
                  </h2>
                  <div className="flex flex-col gap-3">
                    {active.map((goal) => (
                      <GoalCard key={goal.id} goal={goal} />
                    ))}
                  </div>
                </section>
              )}

              {/* Other goals section */}
              {others.length > 0 && (
                <section>
                  <h2 className="m-0 mb-3 text-[11px] font-semibold uppercase tracking-wide text-[#6f6862] dark:text-[#8e8881]">
                    Other
                  </h2>
                  <div className="flex flex-col gap-3">
                    {others.map((goal) => (
                      <GoalCard key={goal.id} goal={goal} />
                    ))}
                  </div>
                </section>
              )}
            </>
          )}

          {/* Backend Info Notice */}
          <div className="mt-10 px-4 py-3 rounded-xl border border-dashed border-[#d8d0c8] dark:border-[#3d3835] text-[11px] text-[#918a83] dark:text-[#7a736c] text-center">
            🔗 Connected to hosted backend API: <code>GET /api/goals</code>
          </div>
        </div>
      </main>
    </div>
  );
}

// ─── Goal Card Component ───────────────────────────────────────────────────────
function GoalCard({ goal }: { goal: Goal }) {
  const status = STATUS_CONFIG[goal.status] || STATUS_CONFIG.active;

  return (
    <Link
      href={`/goal/${goal.id}`}
      className="block p-4 rounded-xl border border-[#eeeae5] dark:border-[#2e2c2a] bg-[#fbfaf8] dark:bg-[#1d1c1b] no-underline hover:border-[#ddd8d0] dark:hover:border-[#3d3a37] hover:bg-[#f4f2ee] dark:hover:bg-[#222120] transition-[border-color,background-color] duration-160 group"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <span className="block text-[13px] font-semibold text-[#2d2926] dark:text-[#eee9e4] group-hover:text-[#ba806e] dark:group-hover:text-[#c48e7a] transition-colors duration-160 leading-normal">
            {goal.title}
          </span>
          <span className="block mt-0.5 text-[11px] text-[#918a83] dark:text-[#7a736c]">
            {goal.subject} · {goal.updatedAt}
          </span>
        </div>
        <span
          className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold ${status.badge}`}
        >
          {status.label}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="flex items-center gap-2.5">
        <div className="flex-1 h-1 rounded-full bg-[#e2dcd4] dark:bg-[#3b3835] overflow-hidden">
          <div
            className="h-full rounded-full bg-[#ba806e] dark:bg-[#c48e7a]"
            style={{ width: `${goal.progress}%` }}
          />
        </div>
        <span className="text-[11px] font-medium text-[#6f6862] dark:text-[#8e8881] tabular-nums shrink-0">
          {goal.progress}%
        </span>
      </div>
    </Link>
  );
}
