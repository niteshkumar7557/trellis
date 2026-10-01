"use client";

/**
 * =============================================================================
 * ALL CONVERSATIONS ROUTE: /conversations
 * =============================================================================
 * Displays the complete archive of user conversations with Kero.
 * 
 * 🔗 BACKEND LINK:
 *  GET /api/conversations -> Fetches all conversation threads for authenticated user
 * =============================================================================
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTheme } from "@/lib/useTheme";
import Sidebar from "@/components/Sidebar";
import Icon from "@/components/Icon";
import { api } from "@/lib/api";
import type { Conversation } from "@/lib/types";

export default function ConversationsPage() {
  const { darkMode } = useTheme();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    // 🔗 BACKEND LINK: GET /api/conversations
    async function fetchConversations() {
      try {
        const data = await api.conversations.list();
        if (isMounted) setConversations(data);
      } catch (err) {
        console.error("Failed to load conversations:", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    fetchConversations();
    return () => {
      isMounted = false;
    };
  }, []);

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
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="m-0 font-manrope text-[24px] font-bold tracking-[-0.04em] text-[#26231f] dark:text-[#eee9e4]">
                Conversations
              </h1>
              <p className="m-0 mt-1 text-[13px] text-[#918a83] dark:text-[#7a736c]">
                {conversations.length} conversation{conversations.length !== 1 ? "s" : ""} with Kero
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

          {/* List of Conversations */}
          {isLoading ? (
            <p className="text-[13px] text-[#918a83] dark:text-[#7a736c]">
              Loading conversations…
            </p>
          ) : conversations.length === 0 ? (
            <p className="text-[13px] text-[#918a83] dark:text-[#7a736c]">
              No conversations found. Start a new one above.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {conversations.map((conv) => (
                <Link
                  key={conv.id}
                  href={`/c/${conv.id}`}
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
          )}

          {/* Backend Info Notice */}
          <div className="mt-10 px-4 py-3 rounded-xl border border-dashed border-[#d8d0c8] dark:border-[#3d3835] text-[11px] text-[#918a83] dark:text-[#7a736c] text-center">
            🔗 Connected to hosted backend API: <code>GET /api/conversations</code>
          </div>
        </div>
      </main>
    </div>
  );
}
