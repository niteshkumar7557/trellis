"use client";

// AppShell — wraps utility pages (settings, notifications, profile).
// Renders a sidebar identical in structure and width to the chat sidebar.
// The list area shows "← Back to chat" in place of the dynamic conversation/goal lists.

import { type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "@/lib/useTheme";
import BrandMark from "./BrandMark";
import Icon from "./Icon";

function StaticSidebar() {
  const { darkMode, toggleTheme } = useTheme();
  const pathname = usePathname();
  const themeLabel = darkMode ? "Switch to light mode" : "Switch to dark mode";

  return (
    <aside
      className="sidebar w-[286px] flex-[0_0_286px] h-svh sticky top-0 pt-7 px-4 pb-[18px] flex flex-col border-r border-[#e8e5df] dark:border-[#302e2c] bg-[#f4f2ee] dark:bg-[#222120]"
      aria-label="Navigation"
    >
      <BrandMark />

      {/* New conversation — links to chat home */}
      <Link
        href="/"
        className="w-full h-[43px] mt-[34px] px-3 flex items-center gap-[9px] border border-[#ba806e] dark:border-[#a86e5f] rounded-lg text-white bg-[#ba806e] dark:bg-[#a86e5f] text-[13px] font-medium shadow-[0_1px_3px_rgba(184,128,110,0.25)] transition-[background-color,border-color] duration-[180ms] hover:bg-[#a86e5f] dark:hover:bg-[#96604f] no-underline"
      >
        <Icon name="plus" size={16} />
        <span>New conversation</span>
      </Link>

      {/* Section heading — Conversations */}
      <div className="mt-[22px] mx-2 mb-1.5 flex items-center text-[#6f6862] dark:text-[#8e8881] text-[11px] font-semibold tracking-[0.07em] uppercase">
        Conversations
      </div>

      {/* Section heading — Goals */}
      <div className="mt-4 mx-2 mb-1.5 flex items-center text-[#6f6862] dark:text-[#8e8881] text-[11px] font-semibold tracking-[0.07em] uppercase">
        Goals
      </div>

      {/* Back to chat — sits where the lists would be */}
      <Link
        href="/"
        className="flex items-center gap-2 px-2.5 py-2 rounded-[7px] text-[#6f6862] dark:text-[#8e8881] text-[12px] no-underline hover:bg-[#ece9e4] dark:hover:bg-[#302e2b] hover:text-[#34302c] dark:hover:text-[#eee9e4] transition-[color,background-color] duration-[180ms]"
      >
        <Icon name="arrowLeft" size={13} />
        Back to chat
      </Link>

      {/* Current page indicator */}
      {[
        { href: "/settings", label: "Settings" },
        { href: "/settings/notifications", label: "Notifications" },
        { href: "/profile", label: "Profile" },
      ].map(({ href, label }) => {
        const isActive = pathname === href || pathname.startsWith(href + "/");
        if (!isActive) return null;
        return (
          <div
            key={href}
            className="flex items-center gap-2 mt-1 px-2.5 py-2 rounded-[7px] text-[#34302c] dark:text-[#eee9e4] bg-[#eae6e0] dark:bg-[#34312e] text-[13px] font-medium"
          >
            <Icon name={href === "/profile" ? "user" : "settings"} size={14} />
            {label}
          </div>
        );
      })}

      {/* Bottom — identical to main sidebar bottom */}
      <div className="sidebar-bottom mt-auto">
        <Link
          href="/profile"
          className="flex items-center gap-[9px] py-2 px-[9px] mb-1 rounded-lg hover:bg-[#ece9e4] dark:hover:bg-[#302e2b] transition-[background-color] duration-[180ms] no-underline group"
          title="View profile"
        >
          {/* TODO: replace with real user from auth context */}
          <span className="avatar shrink-0 w-[26px] h-[26px] grid place-items-center rounded-full bg-[#ba806e] text-white text-[9px] font-semibold">
            NK
          </span>
          <span className="text-[12px] font-medium text-[#393531] dark:text-[#eee9e4] leading-normal">
            Nitesh
          </span>
          {/* Theme toggle */}
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); toggleTheme(); }}
            title={themeLabel}
            aria-label={themeLabel}
            className="ml-auto w-[26px] h-[26px] p-0 inline-grid place-items-center border border-[#ded9d1] dark:border-[#45413d] rounded-full text-[#8f8881] dark:text-[#aaa29a] bg-[#faf9f7] dark:bg-[#292826] hover:border-[#cdbdb5] hover:text-[#9d6252] hover:-rotate-[10deg] dark:hover:border-[#896055] dark:hover:text-[#e1a18e] transition-[color,border-color,transform] duration-[180ms] cursor-pointer"
          >
            <Icon name={darkMode ? "sun" : "moon"} size={12} />
          </button>
        </Link>

        <nav className="flex flex-col gap-0.5 px-[9px]" aria-label="App links">
          <Link
            href="/settings"
            className={`flex items-center gap-[7px] py-1.5 text-[11px] font-medium no-underline transition-colors duration-[180ms] ${
              pathname.startsWith("/settings")
                ? "text-[#9d6252] dark:text-[#db9c88]"
                : "text-[#6f6862] dark:text-[#8e8881] hover:text-[#9d6252] dark:hover:text-[#e1a18e]"
            }`}
          >
            <Icon name="settings" size={13} />
            Settings
          </Link>
          <Link
            href="/login"
            className="flex items-center gap-[7px] py-1.5 text-[#6f6862] dark:text-[#8e8881] text-[11px] font-medium no-underline hover:text-[#9d6252] dark:hover:text-[#e1a18e] transition-colors duration-[180ms]"
          >
            <Icon name="arrowRight" size={13} />
            Sign out
          </Link>
        </nav>
      </div>
    </aside>
  );
}

export default function AppShell({ children }: { children: ReactNode }) {
  const { darkMode } = useTheme();

  return (
    <div
      className={`app-shell flex h-svh min-h-svh overflow-hidden text-[#252321] dark:text-[#e8e3de] bg-[#fbfaf8] dark:bg-[#1b1a19] ${
        darkMode ? "dark-mode" : ""
      }`}
    >
      <StaticSidebar />
      <main className="flex-1 min-w-0 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
