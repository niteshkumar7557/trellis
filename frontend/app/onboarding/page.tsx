"use client";

/**
 * =============================================================================
 * ONBOARDING WIZARD ROUTE: /onboarding
 * =============================================================================
 * First-time setup wizard for new learners.
 * 
 * Steps:
 *   1. Pick a subject    (search & choose from available curated subjects)
 *   2. Set a goal        (define what you are working towards)
 *   3. Sort topics       (sort into: know it / shaky / never seen for calibration)
 *   4. Done              (confirmation -> proceed to study thread)
 * 
 * 🔗 BACKEND LINKS:
 *  1. GET /api/subjects         -> Fetches list of all curated subjects
 *  2. POST /api/subjects/enroll -> Enrolls the user with a goal
 *  3. POST /api/topics/sort     -> Saves initial mastery calibration in PostgreSQL
 * =============================================================================
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import BrandMark from "@/components/BrandMark";
import Icon from "@/components/Icon";
import { DUMMY_AVAILABLE_SUBJECTS, DUMMY_TOPICS } from "@/lib/dummy-data";
import type { Subject } from "@/lib/types";

type SortState = "solid" | "shaky" | "unseen" | null;

// ─── Step progress bar indicator ─────────────────────────────────────────────
function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5 mb-10">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={`h-0.75 flex-1 rounded-full transition-colors duration-300 ${
            i <= current
              ? "bg-[#ba806e]"
              : "bg-[#e8e3dc] dark:bg-[#302e2c]"
          }`}
        />
      ))}
    </div>
  );
}

// ─── Step 1: Pick a Subject ──────────────────────────────────────────────────
function StepSubject({
  subjects,
  onSelect,
}: {
  subjects: Subject[];
  onSelect: (id: string, name: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  const filtered = subjects.filter((s) =>
    s.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div>
      <p className="m-0 mb-1 text-[11px] font-semibold tracking-widest uppercase text-[#9d6252] dark:text-[#db9c88]">
        Step 1 of 3
      </p>
      <h2 className="mt-0 mb-2 font-manrope text-[26px] font-bold tracking-[-0.04em] text-[#26231f] dark:text-[#eee9e4]">
        What are you studying?
      </h2>
      <p className="mt-0 mb-6 text-[14px] text-[#6f6862] dark:text-[#a29a93]">
        Pick one subject to start. You can add more later.
      </p>

      {/* Search */}
      <input
        type="text"
        placeholder="Search subjects…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full h-10 mb-3 px-3 rounded-lg border border-[#ded9d1] dark:border-[#45413d] text-[#373330] dark:text-[#eee9e4] bg-[#faf9f7] dark:bg-[#292826] text-[13px] placeholder-[#8f8881] dark:placeholder-[#77716b] outline-none focus-visible:outline-2 focus-visible:outline-[#bd8875] focus-visible:outline-offset-2"
      />

      {/* Subject list */}
      <div className="flex flex-col gap-1.5 max-h-75 overflow-y-auto">
        {filtered.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setSelected(s.id)}
            className={`w-full text-left flex items-center justify-between px-4 py-3 rounded-xl border text-[13px] transition-[border-color,background-color] duration-160 cursor-pointer ${
              selected === s.id
                ? "border-[#ba806e] bg-[rgba(184,128,111,0.08)] text-[#34302c] dark:text-[#eee9e4]"
                : "border-[#e8e5df] dark:border-[#302e2c] bg-[#faf9f7] dark:bg-[#232120] text-[#3f3a36] dark:text-[#d7d1cb] hover:border-[#cdbdb5] dark:hover:border-[#4a4541]"
            }`}
          >
            <span className="font-medium">{s.name}</span>
            <span className="text-[11px] text-[#918a83] dark:text-[#7a736c]">
              {s.topicCount} topics
            </span>
          </button>
        ))}
      </div>

      <button
        type="button"
        disabled={!selected}
        onClick={() => {
          const subj = subjects.find((s) => s.id === selected);
          if (subj) onSelect(subj.id, subj.name);
        }}
        className="mt-6 w-full h-11 rounded-xl text-[14px] font-semibold text-white bg-[#ba806e] hover:bg-[#a86e5f] disabled:opacity-40 disabled:cursor-not-allowed transition-[background-color,opacity] duration-160 cursor-pointer"
      >
        Continue
      </button>
    </div>
  );
}

// ─── Step 2: Set a Goal ──────────────────────────────────────────────────────
function StepGoal({
  subjectName,
  onContinue,
}: {
  subjectName: string;
  onContinue: (goal: string) => void;
}) {
  const [goal, setGoal] = useState("");

  return (
    <div>
      <p className="m-0 mb-1 text-[11px] font-semibold tracking-widest uppercase text-[#9d6252] dark:text-[#db9c88]">
        Step 2 of 3
      </p>
      <h2 className="mt-0 mb-2 font-manrope text-[26px] font-bold tracking-[-0.04em] text-[#26231f] dark:text-[#eee9e4]">
        What are you working towards?
      </h2>
      <p className="mt-0 mb-6 text-[14px] text-[#6f6862] dark:text-[#a29a93]">
        Your goal for{" "}
        <span className="font-semibold text-[#34302c] dark:text-[#eee9e4]">
          {subjectName}
        </span>
        . This is how Kero decides what&apos;s skippable and what isn&apos;t.
      </p>

      {/* Goal suggestions */}
      <div className="flex flex-wrap gap-2 mb-4">
        {[
          "Pass the GATE CS exam",
          "Build a project with it",
          "Get confident enough to work with it daily",
          "Prepare for job interviews",
        ].map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => setGoal(suggestion)}
            className={`px-3 py-1.5 rounded-full text-[12px] font-medium border transition-[border-color,background-color] duration-160 cursor-pointer ${
              goal === suggestion
                ? "border-[#ba806e] bg-[rgba(184,128,111,0.1)] text-[#34302c] dark:text-[#eee9e4]"
                : "border-[#e2dcd4] dark:border-[#3b3835] text-[#6f6862] dark:text-[#a29a93] bg-[#faf9f7] dark:bg-[#292826] hover:border-[#cdbdb5] dark:hover:border-[#4a4541]"
            }`}
          >
            {suggestion}
          </button>
        ))}
      </div>

      <textarea
        rows={3}
        placeholder="Or describe your own goal…"
        value={goal}
        onChange={(e) => setGoal(e.target.value)}
        className="w-full p-3 rounded-xl border border-[#ded9d1] dark:border-[#45413d] text-[#373330] dark:text-[#eee9e4] bg-[#faf9f7] dark:bg-[#292826] text-[13px] placeholder-[#8f8881] dark:placeholder-[#77716b] outline-none focus-visible:outline-2 focus-visible:outline-[#bd8875] focus-visible:outline-offset-2 resize-none leading-[1.6]"
      />

      <button
        type="button"
        disabled={!goal.trim()}
        onClick={() => onContinue(goal.trim())}
        className="mt-4 w-full h-11 rounded-xl text-[14px] font-semibold text-white bg-[#ba806e] hover:bg-[#a86e5f] disabled:opacity-40 disabled:cursor-not-allowed transition-[background-color,opacity] duration-160 cursor-pointer"
      >
        Continue
      </button>
    </div>
  );
}

// ─── Step 3: Sort Topics ──────────────────────────────────────────────────────
function StepSortTopics({
  topics,
  onComplete,
}: {
  topics: string[];
  onComplete: (sorts: Record<string, SortState>) => void;
}) {
  const [sorts, setSorts] = useState<Record<string, SortState>>(() =>
    Object.fromEntries(topics.map((t) => [t, null]))
  );

  const buckets: { key: SortState; label: string; color: string; bg: string }[] =
    [
      {
        key: "solid",
        label: "Know it",
        color: "text-[#4a7a42] dark:text-[#82a57b]",
        bg: "bg-[#edf5eb] dark:bg-[#1e2e1c] border-[#b8d4b3] dark:border-[#3a5a37]",
      },
      {
        key: "shaky",
        label: "Shaky",
        color: "text-[#9a6d28] dark:text-[#c9954a]",
        bg: "bg-[#f5e6cb] dark:bg-[#3d2e10] border-[#e8d4a8] dark:border-[#5a4220]",
      },
      {
        key: "unseen",
        label: "Never seen",
        color: "text-[#6f6862] dark:text-[#8e8881]",
        bg: "bg-[#f4f2ee] dark:bg-[#222120] border-[#e8e5df] dark:border-[#302e2c]",
      },
    ];

  const sorted = Object.values(sorts).filter(Boolean).length;

  return (
    <div>
      <p className="m-0 mb-1 text-[11px] font-semibold tracking-widest uppercase text-[#9d6252] dark:text-[#db9c88]">
        Step 3 of 3
      </p>
      <h2 className="mt-0 mb-2 font-manrope text-[26px] font-bold tracking-[-0.04em] text-[#26231f] dark:text-[#eee9e4]">
        Sort the topics
      </h2>
      <p className="mt-0 mb-1 text-[14px] text-[#6f6862] dark:text-[#a29a93]">
        Two minutes. Be honest — this is how Kero calibrates your starting
        point. &ldquo;Know it&rdquo; just means you&apos;ll get a quick check
        later, not that it&apos;s skipped forever.
      </p>
      <p className="mt-0 mb-5 text-[12px] text-[#a29a93] dark:text-[#7a736c]">
        {sorted}/{topics.length} sorted
      </p>

      {/* Topics as a scrollable list */}
      <div className="flex flex-col gap-2 max-h-85 overflow-y-auto pr-1">
        {topics.map((topic) => {
          const state = sorts[topic];
          return (
            <div key={topic} className="flex items-center gap-3">
              <span className="flex-1 text-[13px] text-[#3f3a36] dark:text-[#d7d1cb]">
                {topic}
              </span>
              {/* Three-way toggle buttons */}
              <div className="flex gap-1">
                {buckets.map((b) => (
                  <button
                    key={b.key}
                    type="button"
                    onClick={() =>
                      setSorts((prev) => ({
                        ...prev,
                        [topic]: prev[topic] === b.key ? null : b.key,
                      }))
                    }
                    className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all duration-140 cursor-pointer ${
                      state === b.key
                        ? `${b.bg} ${b.color}`
                        : "border-[#e8e5df] dark:border-[#302e2c] text-[#a29a93] dark:text-[#7a736c] bg-transparent hover:border-[#cdbdb5] dark:hover:border-[#4a4541]"
                    }`}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        disabled={sorted < topics.length}
        onClick={() => onComplete(sorts)}
        className="mt-6 w-full h-11 rounded-xl text-[14px] font-semibold text-white bg-[#ba806e] hover:bg-[#a86e5f] disabled:opacity-40 disabled:cursor-not-allowed transition-[background-color,opacity] duration-160 cursor-pointer"
      >
        Done — show me my plan
      </button>

      {/* Skip option */}
      <button
        type="button"
        onClick={() => {
          const filled = Object.fromEntries(
            topics.map((t) => [t, sorts[t] ?? "unseen"])
          ) as Record<string, SortState>;
          onComplete(filled);
        }}
        className="mt-2 w-full text-[12px] text-[#918a83] dark:text-[#7a736c] hover:text-[#6f6862] dark:hover:text-[#9e9690] bg-transparent border-0 cursor-pointer transition-colors duration-160 py-1"
      >
        Skip — mark everything I haven&apos;t touched as &ldquo;never seen&rdquo;
      </button>
    </div>
  );
}

// ─── Step 4: Done ────────────────────────────────────────────────────────────
function StepDone({ onFinish }: { onFinish: () => void }) {
  return (
    <div className="text-center">
      <div className="w-13 h-13 mx-auto mb-5 grid place-items-center rounded-2xl bg-[#edf5eb] dark:bg-[#1e2e1c] border border-[#b8d4b3] dark:border-[#3a5a37] text-[#4a7a42] dark:text-[#82a57b]">
        <Icon name="check" size={24} />
      </div>
      <h2 className="mt-0 mb-3 font-manrope text-[26px] font-bold tracking-[-0.04em] text-[#26231f] dark:text-[#eee9e4]">
        You&apos;re set.
      </h2>
      <p className="mt-0 mb-8 text-[14px] text-[#6f6862] dark:text-[#a29a93] leading-[1.65]">
        Kero has your plan. One thing at a time — no backlog, no guilt, no
        noise. Check in each evening, and Kero keeps the thread.
      </p>
      <button
        type="button"
        onClick={onFinish}
        className="w-full h-11 rounded-xl text-[14px] font-semibold text-white bg-[#ba806e] hover:bg-[#a86e5f] transition-colors duration-160 cursor-pointer"
      >
        Go to my chat
      </button>
    </div>
  );
}

// ─── Onboarding Page Root ────────────────────────────────────────────────────
export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Form states
  const [subjects] = useState<Subject[]>(DUMMY_AVAILABLE_SUBJECTS);
  const [, setSubjectId] = useState("");
  const [subjectName, setSubjectName] = useState("");
  const [, setGoal] = useState("");

  return (
    <div className="min-h-svh flex flex-col items-center justify-center bg-[#f7f6f3] dark:bg-[#1b1a19] px-6 py-12">
      <div className="w-full max-w-120">
        <div className="mb-10 flex justify-center">
          <BrandMark />
        </div>

        {step < 4 && <StepIndicator current={step - 1} total={3} />}

        {step === 1 && (
          <StepSubject
            subjects={subjects}
            onSelect={(id, name) => {
              setSubjectId(id);
              setSubjectName(name);
              setStep(2);
            }}
          />
        )}

        {step === 2 && (
          <StepGoal
            subjectName={subjectName}
            onContinue={(userGoal) => {
              setGoal(userGoal);
              setStep(3);
            }}
          />
        )}

        {step === 3 && (
          <StepSortTopics
            topics={DUMMY_TOPICS}
            onComplete={() => {
              setStep(4);
            }}
          />
        )}

        {step === 4 && (
          <StepDone onFinish={() => router.push("/")} />
        )}
      </div>
    </div>
  );
}
