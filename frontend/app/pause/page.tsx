"use client";

// /pause — Pause Kero.
//
// Two-tap flow: pick a resume date → confirm.
// While paused: no nudges of any kind, no stalls accumulate, no guilt on return.
//
// Coming back after a pause is handled exactly like a normal return:
//   - One thing to do, no backlog, no comment on the gap.
//   - This screen is the reason that works.
//
// States:
//   - "active" → user is not currently paused → show the pause form
//   - "paused" → user has an active pause → show the current pause + early resume option
//
// TODO (backend):
//   - GET /pause → { isPaused: boolean, resumeDate: string | null }
//   - POST /pause → { resumeDate: string } → activates pause until that date
//   - DELETE /pause → cancels an active pause (early resume)
//   - Pause should also suppress all notification channels
//     (WhatsApp, Telegram, email etc.) — handled server-side

import { useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import Icon from "@/components/Icon";

// ─── Mock state — replace with API response ───────────────────────────────────

// Toggle this to preview both states
const MOCK_PAUSE_STATE: { isPaused: boolean; resumeDate: string | null } = {
  isPaused: false,
  resumeDate: null,
  // isPaused: true,
  // resumeDate: "2026-10-10",
};

// ─── Date presets ─────────────────────────────────────────────────────────────

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

// ─── Not paused — show the pause form ────────────────────────────────────────

function PauseForm({ onPause }: { onPause: (date: string) => void }) {
  const [resumeDate, setResumeDate] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  const minDate = addDays(1);

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-[40px] h-[40px] grid place-items-center rounded-xl bg-[#f4f2ee] dark:bg-[#222120] border border-[#e8e5df] dark:border-[#302e2c] text-[#6f6862] dark:text-[#8e8881]">
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

      {/* What pause does — clear, reassuring */}
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
            <li key={item} className="flex items-start gap-2 text-[13px] text-[#3f3a36] dark:text-[#d7d1cb]">
              <Icon name="check" size={14} />
              {item}
            </li>
          ))}
        </ul>
      </div>

      {/* Preset date buttons */}
      <p className="m-0 mb-2 text-[12px] font-medium text-[#6f6862] dark:text-[#8e8881]">
        Pause until
      </p>
      <div className="flex gap-2 flex-wrap mb-3">
        {PRESETS.map((p) => (
          <button
            key={p.value}
            type="button"
            onClick={() => { setResumeDate(p.value); setConfirmed(false); }}
            className={`px-3 py-1.5 rounded-full text-[12px] font-medium border transition-[border-color,background-color,color] duration-[140ms] cursor-pointer ${
              resumeDate === p.value
                ? "border-[#ba806e] bg-[rgba(184,128,111,0.1)] text-[#34302c] dark:text-[#eee9e4]"
                : "border-[#e2dcd4] dark:border-[#3b3835] text-[#6f6862] dark:text-[#a29a93] bg-[#faf9f7] dark:bg-[#292826] hover:border-[#cdbdb5] dark:hover:border-[#4a4541]"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Custom date picker */}
      <input
        type="date"
        min={minDate}
        value={resumeDate}
        onChange={(e) => { setResumeDate(e.target.value); setConfirmed(false); }}
        className="w-full h-[40px] px-3 mb-5 rounded-lg border border-[#ded9d1] dark:border-[#45413d] text-[#373330] dark:text-[#eee9e4] bg-[#faf9f7] dark:bg-[#292826] text-[13px] outline-none focus-visible:outline-2 focus-visible:outline-[#bd8875] focus-visible:outline-offset-2 cursor-pointer"
      />

      {/* Two-tap confirmation */}
      {resumeDate && !confirmed && (
        <button
          type="button"
          onClick={() => setConfirmed(true)}
          className="w-full h-[44px] rounded-xl text-[14px] font-semibold text-[#34302c] dark:text-[#eee9e4] border border-[#e0d5cf] dark:border-[#3d3531] bg-[#fdf9f7] dark:bg-[#272422] hover:bg-[#f5ede8] dark:hover:bg-[#302926] transition-colors duration-[160ms] cursor-pointer"
        >
          Pause until{" "}
          {new Date(resumeDate + "T00:00:00").toLocaleDateString("en-IN", {
            day: "numeric",
            month: "long",
          })}
        </button>
      )}

      {/* Second tap — actual confirmation */}
      {resumeDate && confirmed && (
        <button
          type="button"
          onClick={() => onPause(resumeDate)}
          className="w-full h-[44px] rounded-xl text-[14px] font-semibold text-white bg-[#ba806e] hover:bg-[#a86e5f] transition-colors duration-[160ms] cursor-pointer"
        >
          Confirm pause — see you on{" "}
          {new Date(resumeDate + "T00:00:00").toLocaleDateString("en-IN", {
            day: "numeric",
            month: "long",
          })}
        </button>
      )}
    </div>
  );
}

// ─── Already paused — show status + early resume ─────────────────────────────

function PausedState({
  resumeDate,
  onResume,
}: {
  resumeDate: string;
  onResume: () => void;
}) {
  const formatted = new Date(resumeDate + "T00:00:00").toLocaleDateString(
    "en-IN",
    { weekday: "long", day: "numeric", month: "long" }
  );

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-[40px] h-[40px] grid place-items-center rounded-xl bg-[#f5e6cb] dark:bg-[#3d2e10] border border-[#e8d4a8] dark:border-[#5a4220] text-[#9a6d28] dark:text-[#c9954a]">
          <Icon name="pause" size={18} />
        </div>
        <div>
          <h1 className="m-0 font-manrope text-[22px] font-bold tracking-[-0.04em] text-[#26231f] dark:text-[#eee9e4]">
            Kero is paused
          </h1>
          <p className="m-0 text-[12px] text-[#918a83] dark:text-[#7a736c]">
            Resumes automatically on {formatted}
          </p>
        </div>
      </div>

      <div className="mb-6 p-4 rounded-xl border border-[#e8d4a8] dark:border-[#5a4220] bg-[#fdf8ef] dark:bg-[#2a2010]">
        <p className="m-0 text-[13px] text-[#6f4f20] dark:text-[#c9954a] leading-[1.6]">
          No nudges, no stalls, no count of days. When you come back on{" "}
          {formatted}, Kero picks up as though the conversation paused
          mid-sentence.
        </p>
      </div>

      {/* Early resume */}
      <button
        type="button"
        onClick={onResume}
        className="w-full h-[44px] rounded-xl text-[14px] font-semibold text-[#34302c] dark:text-[#eee9e4] border border-[#e0d5cf] dark:border-[#3d3531] bg-transparent hover:bg-[#f5ede8] dark:hover:bg-[#302926] transition-colors duration-[160ms] cursor-pointer"
      >
        Resume early
      </button>
      <p className="mt-2 text-[11px] text-[#a29a93] dark:text-[#6f6862] text-center">
        Kero will give you one thing to do right away.
      </p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PausePage() {
  const [pauseState, setPauseState] = useState(MOCK_PAUSE_STATE);
  const [done, setDone] = useState(false);

  return (
    <AppShell>
      <div className="max-w-[480px] mx-auto px-8 py-10">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-[12px] text-[#918a83] dark:text-[#7a736c] no-underline hover:text-[#6f6862] dark:hover:text-[#9e9690] mb-8 transition-colors duration-[160ms]"
        >
          <Icon name="arrowLeft" size={13} />
          Dashboard
        </Link>

        {done ? (
          // Post-action confirmation — brief, no fanfare
          <div className="text-center">
            <div className="w-[48px] h-[48px] mx-auto mb-5 grid place-items-center rounded-2xl bg-[#f5e6cb] dark:bg-[#3d2e10] border border-[#e8d4a8] dark:border-[#5a4220] text-[#9a6d28] dark:text-[#c9954a]">
              <Icon name="pause" size={22} />
            </div>
            <h2 className="mt-0 mb-2 font-manrope text-[22px] font-bold tracking-[-0.04em] text-[#26231f] dark:text-[#eee9e4]">
              {pauseState.isPaused ? "Paused." : "Welcome back."}
            </h2>
            <p className="mt-0 mb-6 text-[14px] text-[#6f6862] dark:text-[#a29a93] leading-[1.65]">
              {pauseState.isPaused
                ? "Kero will be here when you're ready."
                : "Your next step is waiting on the dashboard."}
            </p>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold text-white bg-[#ba806e] hover:bg-[#a86e5f] no-underline transition-colors duration-[160ms]"
            >
              {pauseState.isPaused ? "Go to dashboard" : "See my next step"}
            </Link>
          </div>
        ) : pauseState.isPaused ? (
          <PausedState
            resumeDate={pauseState.resumeDate!}
            onResume={() => {
              // TODO: DELETE /pause
              setPauseState({ isPaused: false, resumeDate: null });
              setDone(true);
            }}
          />
        ) : (
          <PauseForm
            onPause={(date) => {
              // TODO: POST /pause { resumeDate: date }
              setPauseState({ isPaused: true, resumeDate: date });
              setDone(true);
            }}
          />
        )}
      </div>
    </AppShell>
  );
}
