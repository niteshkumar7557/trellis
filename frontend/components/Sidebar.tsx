"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import BrandMark from "./BrandMark";
import Icon from "./Icon";
import type { DummyConversation, DummyGoal } from "@/lib/dummy-data";
import { DUMMY_CONVERSATIONS, DUMMY_GOALS } from "@/lib/dummy-data";

// ─── Constants ────────────────────────────────────────────────────────────────

const CONV_DEFAULT = 4;
const GOAL_DEFAULT = 3;

// ─── Collapsible section header ───────────────────────────────────────────────

function SectionHeading({
  label,
  collapsed,
  onToggle,
}: {
  label: string;
  collapsed: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="group mt-[22px] mx-0 mb-1.5 w-full flex items-center justify-between px-2 py-0.5 rounded-md text-[#6f6862] dark:text-[#8e8881] hover:text-[#48423d] dark:hover:text-[#c8c0b8] hover:bg-[#ece9e4] dark:hover:bg-[#2e2c2a] transition-[color,background-color] duration-[160ms] cursor-pointer"
      aria-expanded={!collapsed}
      aria-label={`${collapsed ? "Expand" : "Collapse"} ${label}`}
    >
      <span className="text-[11px] font-semibold tracking-[0.07em] uppercase">
        {label}
      </span>
      <span
        className={`transition-transform duration-[200ms] ease-out ${
          collapsed ? "-rotate-90" : "rotate-0"
        }`}
      >
        <Icon name="chevronDown" size={13} />
      </span>
    </button>
  );
}

// ─── "See all" link ───────────────────────────────────────────────────────────

function SeeAllLink({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-1 mt-0.5 px-2.5 py-1 w-full text-[10px] text-[#a29a93] dark:text-[#6f6862] font-medium hover:text-[#6f6862] dark:hover:text-[#a29a93] no-underline transition-colors duration-[160ms] rounded-[7px] hover:bg-[#ece9e4] dark:hover:bg-[#2e2c2a]"
    >
      See all
      <Icon name="chevronRight" size={10} />
    </Link>
  );
}

// ─── Conversation item ─────────────────────────────────────────────────────────

function ConvItem({
  conv,
  isActive,
}: {
  conv: DummyConversation;
  isActive: boolean;
}) {
  return (
    <Link
      href={`/c/${conv.uid}`}
      className={`block w-full pt-2 px-2.5 pb-[7px] rounded-[7px] no-underline transition-[color,background-color] duration-[180ms] ease-out ${
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
          {conv.preview}
        </span>
        <time className="shrink-0">{conv.time}</time>
      </span>
    </Link>
  );
}

// ─── Goal item ─────────────────────────────────────────────────────────────────

const STATUS_DOT: Record<DummyGoal["status"], string> = {
  active: "bg-[#82a57b]",
  completed: "bg-[#7b9fa8]",
  paused: "bg-[#c0a87a]",
};

function GoalItem({
  goal,
  isActive,
}: {
  goal: DummyGoal;
  isActive: boolean;
}) {
  return (
    <Link
      href={`/goal/${goal.uid}`}
      className={`block w-full pt-2 px-2.5 pb-[7px] rounded-[7px] no-underline transition-[color,background-color] duration-[180ms] ease-out ${
        isActive
          ? "text-[#2d2926] bg-[#eae6e0] dark:text-[#eee9e4] dark:bg-[#34312e]"
          : "text-[#56504b] dark:text-[#b1aaa3] hover:bg-[#ece9e4] dark:hover:bg-[#302e2b]"
      }`}
    >
      <div className="flex items-center gap-1.5">
        <span
          className={`shrink-0 w-[6px] h-[6px] rounded-full ${STATUS_DOT[goal.status]}`}
        />
        <span className="overflow-hidden text-ellipsis whitespace-nowrap text-[12.5px] font-medium leading-normal flex-1">
          {goal.title}
        </span>
      </div>
      {/* Progress bar */}
      <div className="mt-1.5 h-[3px] rounded-full bg-[#e2dcd4] dark:bg-[#3b3835] overflow-hidden">
        <div
          className="h-full rounded-full bg-[#ba806e] dark:bg-[#c48e7a] transition-[width] duration-[300ms]"
          style={{ width: `${goal.progress}%` }}
        />
      </div>
      <span className="block mt-0.5 text-[10.5px] text-[#6f6862] dark:text-[#8e8881]">
        {goal.progress}% · {goal.updatedAt}
      </span>
    </Link>
  );
}

// ─── User avatar button (links to /profile) ────────────────────────────────────

function UserAvatarButton() {
  return (
    <Link
      href="/profile"
      className="flex items-center gap-[9px] py-2 px-[9px] mb-1 rounded-lg hover:bg-[#ece9e4] dark:hover:bg-[#302e2b] transition-[background-color] duration-[180ms] no-underline group"
      title="View profile"
    >
      <span className="avatar shrink-0 w-[26px] h-[26px] grid place-items-center rounded-full bg-[#ba806e] text-white text-[9px] font-semibold">
        NK
      </span>
      <span className="text-[12px] font-medium text-[#393531] dark:text-[#eee9e4] leading-normal">
        Nitesh
      </span>
    </Link>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

export default function Sidebar() {
  const pathname = usePathname();

  // Collapse state per section
  const [convsCollapsed, setConvsCollapsed] = useState(false);
  const [goalsCollapsed, setGoalsCollapsed] = useState(false);

  return (
    <aside
      className="sidebar w-[286px] h-svh flex-[0_0_286px] min-h-0 self-start sticky top-0 pt-7 px-4 pb-[18px] flex flex-col overflow-hidden border-r border-[#e8e5df] dark:border-[#302e2c] bg-[#f4f2ee] dark:bg-[#222120] transition-[width,flex-basis,padding,border-color,opacity] duration-[240ms] ease-out"
      aria-label="Navigation sidebar"
    >
      <BrandMark />

      {/* New conversation — always navigates to "/" which is the fresh-chat home */}
      <Link
        href="/"
        className="new-chat-button w-full h-[43px] mt-[34px] px-3 flex items-center gap-[9px] border border-[#ba806e] dark:border-[#a86e5f] rounded-lg text-white bg-[#ba806e] dark:bg-[#a86e5f] text-[13px] font-medium shadow-[0_1px_3px_rgba(184,128,110,0.25)] dark:shadow-none transition-[background-color,border-color] duration-[180ms] ease-out hover:bg-[#a86e5f] dark:hover:bg-[#96604f] hover:border-[#a86e5f] no-underline"
      >
        <Icon name="plus" size={16} />
        <span>New conversation</span>
        <kbd className="ml-auto text-white/60 text-[11px] font-inherit">⌘ K</kbd>
      </Link>

      {/* Scrollable list area */}
      <div className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden flex flex-col">

        {/* ── Conversations ───────────────────────────────────────────── */}
        <SectionHeading
          label="Conversations"
          collapsed={convsCollapsed}
          onToggle={() => setConvsCollapsed((v) => !v)}
        />

        {/* Animated collapse wrapper */}
        <div
          className={`overflow-hidden transition-all duration-[220ms] ease-out ${
            convsCollapsed ? "max-h-0 opacity-0" : "max-h-[1000px] opacity-100"
          }`}
        >
          <nav className="flex flex-col gap-[2px]" aria-label="Conversations">
            {DUMMY_CONVERSATIONS.length === 0 ? (
              <p className="mt-2 mx-2 text-[11px] text-[#6f6862] dark:text-[#77716b] leading-[1.5]">
                No conversations yet.
              </p>
            ) : (
              <>
                {DUMMY_CONVERSATIONS.slice(0, CONV_DEFAULT).map((conv) => (
                  <ConvItem
                    key={conv.uid}
                    conv={conv}
                    isActive={pathname === `/c/${conv.uid}`}
                  />
                ))}
                {DUMMY_CONVERSATIONS.length > CONV_DEFAULT && (
                  <SeeAllLink href="/conversations" />
                )}
              </>
            )}
          </nav>
        </div>

        {/* ── Goals ───────────────────────────────────────────────────── */}
        <SectionHeading
          label="Goals"
          collapsed={goalsCollapsed}
          onToggle={() => setGoalsCollapsed((v) => !v)}
        />

        <div
          className={`overflow-hidden transition-all duration-[220ms] ease-out ${
            goalsCollapsed ? "max-h-0 opacity-0" : "max-h-[1000px] opacity-100"
          }`}
        >
          <nav className="flex flex-col gap-[2px]" aria-label="Goals">
            {DUMMY_GOALS.length === 0 ? (
              <p className="mt-2 mx-2 text-[11px] text-[#6f6862] dark:text-[#77716b] leading-[1.5]">
                Tell Kero what you want to learn to create a goal.
              </p>
            ) : (
              <>
                {DUMMY_GOALS.slice(0, GOAL_DEFAULT).map((goal) => (
                  <GoalItem
                    key={goal.uid}
                    goal={goal}
                    isActive={pathname === `/goal/${goal.uid}`}
                  />
                ))}
                {DUMMY_GOALS.length > GOAL_DEFAULT && (
                  <SeeAllLink href="/goals" />
                )}
              </>
            )}
          </nav>
        </div>
      </div>

      {/* Bottom — profile + settings + sign out */}
      <div className="sidebar-bottom mt-auto pt-2">
        <UserAvatarButton />

        <nav className="flex flex-col gap-0.5 px-[9px]" aria-label="App links">
          <Link
            href="/settings"
            className="flex items-center gap-[7px] py-1.5 text-[#6f6862] dark:text-[#8e8881] text-[11px] font-medium no-underline transition-colors duration-[180ms] ease-out hover:text-[#9d6252] dark:hover:text-[#e1a18e]"
          >
            <Icon name="settings" size={13} />
            Settings
          </Link>
          {/* TODO: POST /auth/signout → clear tokens → redirect /login */}
          <Link
            href="/login"
            className="flex items-center gap-[7px] py-1.5 text-[#6f6862] dark:text-[#8e8881] text-[11px] font-medium no-underline transition-colors duration-[180ms] ease-out hover:text-[#9d6252] dark:hover:text-[#e1a18e]"
          >
            <Icon name="arrowRight" size={13} />
            Sign out
          </Link>
        </nav>
      </div>
    </aside>
  );
}
