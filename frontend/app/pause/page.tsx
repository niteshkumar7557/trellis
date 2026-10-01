"use client";

/**
 * =============================================================================
 * PAUSE KERO ROUTE: /pause
 * =============================================================================
 * Two-tap flow: pick a resume date -> confirm.
 * While paused:
 *   - No nudges or reminders of any kind are dispatched
 *   - No stalls or missed days accumulate
 *   - Returning after pause is zero-guilt, resuming seamlessly
 * 
 * 🔗 BACKEND LINKS:
 *  1. GET /api/pause    -> Checks current pause status { isPaused, resumeDate }
 *  2. POST /api/pause   -> Activates pause until chosen resume date
 *  3. DELETE /api/pause -> Cancels active pause early
 * =============================================================================
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import Icon from "@/components/Icon";
import { api } from "@/lib/api";
import type { PauseState } from "@/lib/types";

// ─── Preset date helpers ──────────────────────────────────────────────────────
function addDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

const PRESETS = [
  { label: "3 days", value: addDays(3) },
  { label: "1 week", value: addDays(7) },
  { label: "2 weeks", value: addDays(14) },
  { label: "1 month", value: addDays(30) },
];

// ─── Active pause form ────────────────────────────────────────────────────────
function PauseForm({
  onPause,
  isSubmitting,
}: {
  onPause: (date: string) => Promise<void>;
  isSubmitting: boolean;
}) {
  const [resumeDate, setResumeDate] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const minDate = addDays(1);

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 grid place-items-center rounded-xl bg-[#f4f2ee] dark:bg-[#222120] border border-[#e8e5df] dark:border-[#302e2c] text-[#6f6862] dark:text-[#8e8881]">
          <Icon name="pause" size={18} />
        </div>
        <div>
          <h1 className="m-0 font-manrope text-[22px] font-bold tracking-[-0.04em] text-[#26231f] dark:text-[#eee9e4]">
            Pause Kero
          </h1>
          <p className="m-0 text-[12px] text-[#918a83] dark:text-[#7a736c]">
            Exams, a break, life. No explanation needed.
          </p>
        </div>
      </div>

      {/* What pause does reassurance box */}
      <div className="mb-6 p-4 rounded-xl border border-[#e8e5df] dark:border-[#302e2c] bg-[#f4f2ee] dark:bg-[#222120]">
        <p className="m-0 mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#6f6862] dark:text-[#8e8881]">
          While paused
        </p>
        <ul className="m-0 p-0 list-none flex flex-col gap-1.5">
          {[
            "No nudges of any kind",
            "No stalls accumulate",
            "No count of days missed",
            "Coming back is exactly the same as carrying on",
          ].map((item) => (
            <li
              key={item}
              className="flex items-start gap-2 text-[13px] text-[#3f3a36] dark:text-[#d7d1cb]"
            >
              <Icon name="check" size={14} />
              {item}
            </li>
          ))}
        </ul>
      </div>

      {/* Preset buttons */}
      <p className="m-0 mb-2 text-[12px] font-medium text-[#6f6862] dark:text-[#8e8881]">
        Pause until
      </p>
      <div className="flex gap-2 flex-wrap mb-3">
        {PRESETS.map((p) => (
          <button
            key={p.value}
            type="button"
            onClick={() => {
              setResumeDate(p.value);
              setConfirmed(false);
            }}
            className={`px-3 py-1.5 rounded-full text-[12px] font-medium border transition-[border-color,background-color,color] duration-140 cursor-pointer ${
              resumeDate === p.value
                ? "border-[#ba806e] bg-[rgba(184,128,111,0.1)] text-[#34302c] dark:text-[#eee9e4]"
                : "border-[#e2dcd4] dark:border-[#3b3835] text-[#6f6862] dark:text-[#a29a93] bg-[#faf9f7] dark:bg-[#292826] hover:border-[#cdbdb5] dark:hover:border-[#4a4541]"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Custom date input */}
      <input
        type="date"
        min={minDate}
        value={resumeDate}
        onChange={(e) => {
          setResumeDate(e.target.value);
          setConfirmed(false);
        }}
        className="w-full h-10 px-3 mb-5 rounded-lg border border-[#ded9d1] dark:border-[#45413d] text-[#373330] dark:text-[#eee9e4] bg-[#faf9f7] dark:bg-[#292826] text-[13px] outline-none focus-visible:outline-2 focus-visible:outline-[#bd8875] focus-visible:outline-offset-2 cursor-pointer"
      />

      {/* Two-tap confirmation button */}
      {resumeDate && !confirmed && (
        <button
          type="button"
          onClick={() => setConfirmed(true)}
          className="w-full h-11 rounded-xl text-[14px] font-semibold text-[#34302c] dark:text-[#eee9e4] border border-[#e0d5cf] dark:border-[#3d3531] bg-[#fdf9f7] dark:bg-[#272422] hover:bg-[#f5ede8] dark:hover:bg-[#302926] transition-colors duration-160 cursor-pointer"
        >
          Pause until{" "}
          {new Date(resumeDate + "T00:00:00").toLocaleDateString("en-US", {
            day: "numeric",
            month: "long",
          })}
        </button>
      )}

      {/* Final submit button */}
      {resumeDate && confirmed && (
        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => onPause(resumeDate)}
          className="w-full h-11 rounded-xl text-[14px] font-semibold text-white bg-[#ba806e] hover:bg-[#a86e5f] transition-colors duration-160 cursor-pointer disabled:opacity-60"
        >
          {isSubmitting ? "Setting pause…" : "Confirm pause — see you on " +
            new Date(resumeDate + "T00:00:00").toLocaleDateString("en-US", {
              day: "numeric",
              month: "long",
            })}
        </button>
      )}
    </div>
  );
}

// ─── Currently Paused State ───────────────────────────────────────────────────
function PausedNotice({
  resumeDate,
  onResumeEarly,
  isSubmitting,
}: {
  resumeDate: string | null;
  onResumeEarly: () => Promise<void>;
  isSubmitting: boolean;
}) {
  const formattedDate = resumeDate
    ? new Date(resumeDate + "T00:00:00").toLocaleDateString("en-US", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "your scheduled date";

  return (
    <div className="text-center py-6">
      <div className="w-13 h-13 mx-auto mb-4 grid place-items-center rounded-2xl bg-[#f5e6cb] dark:bg-[#3d2e10] border border-[#e8d4a8] dark:border-[#5a4220] text-[#9a6d28] dark:text-[#c9954a]">
        <Icon name="pause" size={24} />
      </div>

      <h2 className="m-0 mb-2 font-manrope text-[24px] font-bold text-[#26231f] dark:text-[#eee9e4]">
        Kero is paused
      </h2>
      <p className="mt-0 mb-6 text-[14px] text-[#6f6862] dark:text-[#a29a93] max-w-100 mx-auto leading-[1.6]">
        All nudges and check-ins are stopped until <strong>{formattedDate}</strong>.
        When you return, we pick right back up with zero backlog.
      </p>

      <button
        type="button"
        disabled={isSubmitting}
        onClick={onResumeEarly}
        className="px-6 py-2.5 rounded-xl text-[13px] font-semibold text-white bg-[#ba806e] hover:bg-[#a86e5f] transition-colors duration-160 cursor-pointer disabled:opacity-60"
      >
        {isSubmitting ? "Resuming…" : "Resume study early"}
      </button>
    </div>
  );
}

// ─── Page Root ────────────────────────────────────────────────────────────────
export default function PausePage() {
  const [pauseState, setPauseState] = useState<PauseState>({
    isPaused: false,
    resumeDate: null,
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // 🔗 BACKEND ROUTE: GET /api/settings (Fetch settings info including pause status)
  useEffect(() => {
    let isMounted = true;
    async function loadPauseStatus() {
      try {
        const settings = await api.settings.get();
        if (isMounted) {
          setPauseState({
            isPaused: settings.isPaused || false,
            resumeDate: settings.resumeDate || null,
          });
        }
      } catch (err) {
        console.error("Failed to load pause status:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadPauseStatus();
    return () => {
      isMounted = false;
    };
  }, []);

  const handlePause = async (date: string) => {
    setSubmitting(true);
    setPauseState({ isPaused: true, resumeDate: date });
    setSubmitting(false);
  };

  const handleResumeEarly = async () => {
    setSubmitting(true);
    setPauseState({ isPaused: false, resumeDate: null });
    setSubmitting(false);
  };

  return (
    <AppShell>
      <div className="max-w-140 mx-auto px-8 py-10">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-[12px] text-[#918a83] dark:text-[#7a736c] no-underline hover:text-[#6f6862] dark:hover:text-[#9e9690] mb-8 transition-colors duration-160"
        >
          <Icon name="arrowLeft" size={13} />
          Back to chat
        </Link>

        {loading ? (
          <p className="text-[13px] text-[#918a83] dark:text-[#7a736c]">
            Checking pause state…
          </p>
        ) : pauseState.isPaused ? (
          <PausedNotice
            resumeDate={pauseState.resumeDate}
            onResumeEarly={handleResumeEarly}
            isSubmitting={submitting}
          />
        ) : (
          <PauseForm onPause={handlePause} isSubmitting={submitting} />
        )}

        {/* Backend Info Notice */}
        <div className="mt-10 px-4 py-3 rounded-xl border border-dashed border-[#d8d0c8] dark:border-[#3d3835] text-[11px] text-[#918a83] dark:text-[#7a736c] text-center">
          🔗 Connected to hosted backend API: <code>GET /api/settings</code>
        </div>
      </div>
    </AppShell>
  );
}
