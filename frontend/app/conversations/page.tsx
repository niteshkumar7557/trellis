// /conversations — all conversations with Kero.
// Dummy data; real data will come from the backend.

"use client";

import Link from "next/link";
import { useTheme } from "@/lib/useTheme";
import Sidebar from "@/components/Sidebar";
import Icon from "@/components/Icon";
import { DUMMY_CONVERSATIONS } from "@/lib/dummy-data";

export default function ConversationsPage() {
  const { darkMode } = useTheme();

  return (
    <div
      className={`app-shell flex h-svh min-h-svh overflow-hidden text-[#252321] dark:text-[#e8e3de] bg-[#fbfaf8] dark:bg-[#1b1a19] ${
        darkMode ? "dark-mode" : ""
      }`}
    >
      <Sidebar />

      <main className="flex-1 min-w-0 overflow-y-auto">
        <div className="max-w-170 mx-auto px-8 py-10">

          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="m-0 font-manrope text-[24px] font-bold tracking-[-0.04em] text-[#26231f] dark:text-[#eee9e4]">
                Conversations
              </h1>
              <p className="m-0 mt-1 text-[13px] text-[#918a83] dark:text-[#7a736c]">
                {DUMMY_CONVERSATIONS.length} conversation{DUMMY_CONVERSATIONS.length !== 1 ? "s" : ""} with Kero
              </p>
            </div>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold text-white bg-[#ba806e] hover:bg-[#a86e5f] no-underline transition-colors duration-160"
            >
              <Icon name="plus" size={14} />
              New conversation
            </Link>
          </div>

          {/* List */}
          <div className="flex flex-col gap-2">
            {DUMMY_CONVERSATIONS.map((conv) => (
              <Link
                key={conv.uid}
                href={`/c/${conv.uid}`}
                className="flex items-start gap-4 p-4 rounded-xl border border-[#eeeae5] dark:border-[#2e2c2a] bg-[#fbfaf8] dark:bg-[#1d1c1b] no-underline hover:border-[#ddd8d0] dark:hover:border-[#3d3a37] hover:bg-[#f4f2ee] dark:hover:bg-[#222120] transition-[border-color,background-color] duration-160 group"
              >
                {/* Icon */}
                <div className="shrink-0 w-9 h-9 grid place-items-center rounded-lg bg-[#f4f2ee] dark:bg-[#2a2826] border border-[#e8e5df] dark:border-[#302e2c] text-[#918a83] dark:text-[#77716b]">
                  <Icon name="sparkle" size={16} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <span className="block text-[13px] font-semibold text-[#2d2926] dark:text-[#eee9e4] leading-normal group-hover:text-[#ba806e] dark:group-hover:text-[#c48e7a] transition-colors duration-160">
                      {conv.title}
                    </span>
                    <time className="shrink-0 text-[11px] text-[#a29a93] dark:text-[#6f6862] mt-0.5">
                      {conv.time}
                    </time>
                  </div>
                  <p className="m-0 mt-0.5 text-[12px] text-[#6f6862] dark:text-[#8e8881] leading-normal overflow-hidden text-ellipsis whitespace-nowrap">
                    {conv.preview}
                  </p>
                </div>
              </Link>
            ))}
          </div>

          {/* TODO badge */}
          <div className="mt-10 px-4 py-3 rounded-xl border border-dashed border-[#d8d0c8] dark:border-[#3d3835] text-[11px] text-[#918a83] dark:text-[#7a736c] text-center">
            Real conversations will be loaded from the backend. This is dummy content.
          </div>
        </div>
      </main>
    </div>
  );
}
