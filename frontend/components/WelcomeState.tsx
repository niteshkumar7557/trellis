"use client";

// WelcomeState — shown when the user starts a new goal thread with Kero.
//
// The chat IS the product. There are no separate check-in forms, session pages,
// or structured flows. The user tells Kero everything in plain language:
//   - "I want to master just the UDP protocol"
//   - "I studied DNS today, it finally made sense"
//   - "I tried congestion control, didn't get it at all"
//   - "What should I do next?"
//
// The backend LLM categorises each message and acts accordingly.
// This welcome screen makes that clear — so new users know exactly what to do.

import type { Dispatch, FormEvent, KeyboardEvent, SetStateAction } from "react";
import Composer from "./Composer";

interface WelcomeStateProps {
  draft: string;
  setDraft: Dispatch<SetStateAction<string>>;
  sendMessage: (
    event: FormEvent<HTMLFormElement> | KeyboardEvent<HTMLTextAreaElement>,
  ) => void;
  isLoading: boolean;
}

// Prompt chips — examples of what you can say to Kero.
// Clicking one fills the composer so the user can send it directly or edit it.
const EXAMPLE_PROMPTS = [
  "I want to master just the UDP protocol",
  "What should I study today?",
  "I read about DNS today — it clicked",
  "Tried congestion control, didn't get it at all",
];

export default function WelcomeState({
  draft,
  setDraft,
  sendMessage,
  isLoading,
}: WelcomeStateProps) {
  return (
    <div className="welcome-state w-[min(560px,100%)] text-center -translate-y-2.5">
      {/* Brand orb — larger version of the sidebar orb */}
      <div className="brand-orb w-[46px] h-[46px] mx-auto mb-[22px] rounded-[50%_50%_47%_53%] bg-[#ba806e] dark:bg-[#c78d78] shadow-[inset_-4px_-4px_0_#a86e5f] dark:shadow-[inset_-4px_-4px_0_#a97060] -rotate-[25deg]" />

      <h1 className="m-0 mb-[9px] text-[#34302c] dark:text-[#eee9e4] font-manrope text-[25px] font-semibold tracking-[-0.04em]">
        What are you working on?
      </h1>

      <p className="m-0 mb-[22px] text-[#7a736c] dark:text-[#817a73] text-[13px] leading-[1.6] max-w-[400px] mx-auto">
        Tell Kero what you want to learn, what you studied, or what you&apos;re
        stuck on. No forms. Just talk.
      </p>

      {/* Example prompt chips */}
      <div className="flex flex-wrap justify-center gap-2 mb-[26px]">
        {EXAMPLE_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => setDraft(prompt)}
            className="px-3 py-1.5 rounded-full text-[12px] font-medium border border-[#e2dcd4] dark:border-[#3b3835] text-[#6f6862] dark:text-[#a29a93] bg-[#faf9f7] dark:bg-[#292826] hover:border-[#cdbdb5] dark:hover:border-[#4a4541] hover:text-[#34302c] dark:hover:text-[#eee9e4] transition-[border-color,color] duration-[160ms] cursor-pointer"
          >
            {prompt}
          </button>
        ))}
      </div>

      {isLoading && (
        <div
          className="chat-thinking-banner mb-2 mx-auto w-fit flex items-center gap-2 px-3 py-1 rounded-full text-[11.5px] font-medium text-[#ba806e] dark:text-[#c48e7a] bg-[#ba806e]/10 dark:bg-[#c48e7a]/15 border border-[#ba806e]/20 dark:border-[#c48e7a]/25 shadow-sm transition-all animate-pulse"
          role="status"
          aria-live="polite"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#ba806e] dark:bg-[#c48e7a] animate-ping" />
          <span>Kero is thinking…</span>
        </div>
      )}

      <Composer
        draft={draft}
        setDraft={setDraft}
        sendMessage={sendMessage}
        isLoading={isLoading}
        welcome
      />

      <p className="mt-[14px] text-[#a29a93] dark:text-[#7a736c] text-[11px] leading-[1.5]">
        Your goals, your words, your pace.
        <br />
        Kero figures out the rest.
      </p>
    </div>
  );
}
