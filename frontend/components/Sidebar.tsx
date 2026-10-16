"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import BrandMark from "./BrandMark";
import Icon from "./Icon";
import type { Conversation, UserProfile } from "@/app/_types";
import api from "@/app/_utils/axios";
import { getUser } from "@/app/_utils/getUser";
import { formatSidebarTime } from "@/app/_utils/formatTime";

const CONV_LIMIT = 3;

function ConvItem({
  conv,
  isActive,
}: {
  conv: Conversation;
  isActive: boolean;
}) {
  return (
    <Link
      href={`/c/${conv.id}`}
      className={`block w-full pt-2 px-2.5 pb-1.75 rounded-[7px] no-underline transition-[color,background-color] duration-180 ease-out ${
        isActive
          ? "text-[#2d2926] bg-[#eae6e0] dark:text-[#eee9e4] dark:bg-[#34312e]"
          : "text-[#56504b] dark:text-[#b1aaa3] hover:bg-[#ece9e4] dark:hover:bg-[#302e2b]"
      }`}
    >
      <span className="block overflow-hidden text-ellipsis whitespace-nowrap text-[12.5px] font-medium leading-normal">
        {conv.title}
      </span>
      <span className="flex items-center justify-between mt-0.5 text-[10.5px] text-[#6f6862] dark:text-[#8e8881]">
        <span className="overflow-hidden text-ellipsis whitespace-nowrap mr-2">
          {conv.preview || "No messages yet"}
        </span>
        <time className="shrink-0">
          {formatSidebarTime(conv.updatedAt || conv.createdAt || conv.time)}
        </time>
      </span>
    </Link>
  );
}

function UserAvatarButton({ user }: { user: UserProfile | null }) {
  const initials = user?.initials || (user?.name ? user.name.slice(0, 2).toUpperCase() : "U");
  const name = user?.name || "My Account";

  return (
    <Link
      href="/profile"
      className="flex items-center gap-2.25 py-2 px-2.25 mb-1 rounded-lg hover:bg-[#ece9e4] dark:hover:bg-[#302e2b] transition-[background-color] duration-180 no-underline group"
      title="View profile"
    >
      <span className="avatar shrink-0 w-6.5 h-6.5 grid place-items-center rounded-full bg-[#ba806e] text-white text-[9px] font-semibold">
        {initials}
      </span>
      <span className="text-[12px] font-medium text-[#393531] dark:text-[#eee9e4] leading-normal">
        {name}
      </span>
    </Link>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [user, setUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadSidebarData() {
      // 1. Fetch user info
      try {
        const currentUser = await getUser();
        if (isMounted && currentUser) {
          setUser({
            id: currentUser.id,
            name: currentUser.name,
            initials: currentUser.name.slice(0, 2).toUpperCase(),
            email: currentUser.email,
          });
        }
      } catch (e) {
        console.warn("Could not load user profile:", e);
      }

      // 2. Fetch conversations
      try {
        const { data } = await api.get<Conversation[]>("/conversations");
        if (isMounted) {
          setConversations(data || []);
        }
      } catch (error) {
        console.warn("Could not load conversations from backend:", error);
      }
    }

    loadSidebarData();
    return () => {
      isMounted = false;
    };
  }, [pathname]);

  const handleSignOut = async () => {
    try {
      await api.post("/user/logout");
    } catch {
      // ignore
    }
    localStorage.removeItem("access_token");
    router.push("/login");
  };

  return (
    <aside
      className="sidebar w-71.5 h-svh flex-[0_0_286px] min-h-0 self-start sticky top-0 pt-7 px-4 pb-4.5 flex flex-col overflow-hidden border-r border-[#e8e5df] dark:border-[#302e2c] bg-[#f4f2ee] dark:bg-[#222120] transition-[width,flex-basis,padding,border-color,opacity] duration-240 ease-out"
      aria-label="Navigation sidebar"
    >
      <BrandMark />

      {/* Feature 1: New conversation button */}
      <Link
        href="/"
        className="new-chat-button w-full h-10.75 mt-8.5 px-3 flex items-center gap-2.25 border border-[#ba806e] dark:border-[#a86e5f] rounded-lg text-white bg-[#ba806e] dark:bg-[#a86e5f] text-[13px] font-medium shadow-[0_1px_3px_rgba(184,128,110,0.25)] dark:shadow-none transition-[background-color,border-color] duration-180 ease-out hover:bg-[#a86e5f] dark:hover:bg-[#96604f] hover:border-[#a86e5f] no-underline"
      >
        <Icon name="plus" size={16} />
        <span>New conversation</span>
        <kbd className="ml-auto text-white/60 text-[11px] font-inherit">⌘ K</kbd>
      </Link>

      {/* Feature 2: Latest 3 conversations from backend */}
      <div className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1 scrollbar-none [&::-webkit-scrollbar]:hidden flex flex-col mt-4">
        <div className="mt-2 mx-0 mb-1.5 px-2 py-0.5 text-[#6f6862] dark:text-[#8e8881]">
          <span className="text-[11px] font-semibold tracking-[0.07em] uppercase">
            Recent Conversations
          </span>
        </div>

        <nav className="flex flex-col gap-0.5" aria-label="Conversations">
          {conversations.length === 0 ? (
            <p className="mt-2 mx-2 text-[11px] text-[#6f6862] dark:text-[#77716b] leading-normal">
              No conversations yet.
            </p>
          ) : (
            <>
              {conversations.slice(0, CONV_LIMIT).map((conv) => (
                <ConvItem
                  key={conv.id}
                  conv={conv}
                  isActive={pathname === `/c/${conv.id}`}
                />
              ))}
              {conversations.length > CONV_LIMIT && (
                <Link
                  href="/conversations"
                  className="flex items-center gap-1 mt-0.5 px-2.5 py-1 w-full text-[10px] text-[#a29a93] dark:text-[#6f6862] font-medium hover:text-[#6f6862] dark:hover:text-[#a29a93] no-underline transition-colors duration-160 rounded-[7px] hover:bg-[#ece9e4] dark:hover:bg-[#2e2c2a]"
                >
                  See all ({conversations.length})
                  <Icon name="chevronRight" size={10} />
                </Link>
              )}
            </>
          )}
        </nav>
      </div>

      {/* Feature 3: Profile + Settings link */}
      <div className="sidebar-bottom mt-auto pt-2">
        <UserAvatarButton user={user} />

        <nav className="flex flex-col gap-0.5 px-2.25" aria-label="App links">
          <Link
            href="/settings"
            className="flex items-center gap-1.75 py-1.5 text-[#6f6862] dark:text-[#8e8881] text-[11px] font-medium no-underline transition-colors duration-180 ease-out hover:text-[#9d6252] dark:hover:text-[#e1a18e]"
          >
            <Icon name="settings" size={13} />
            Settings
          </Link>
          <button
            type="button"
            onClick={handleSignOut}
            className="w-full text-left flex items-center gap-1.75 py-1.5 text-[#6f6862] dark:text-[#8e8881] text-[11px] font-medium no-underline transition-colors duration-180 ease-out hover:text-[#9d6252] dark:hover:text-[#e1a18e] bg-transparent border-0 p-0 cursor-pointer"
          >
            <Icon name="arrowRight" size={13} />
            Sign out
          </button>
        </nav>
      </div>
    </aside>
  );
}
