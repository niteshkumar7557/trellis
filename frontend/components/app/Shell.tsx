"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Logo } from "@/components/brand/Logo";
import ui from "@/components/ui/ui.module.css";
import { goalById, subjects } from "@shared/data";
import { summarise } from "@shared/graph";
import { useStore } from "@/lib/store";
import { useResolvedTheme, useTheme } from "@/lib/theme";
import { NEARLY, backAt, tighterWindow } from "@/lib/usage";
import type { SubjectId } from "@shared/types";
import { Search } from "./Search";
import styles from "./shell.module.css";

const NAV: { href: string; label: string; icon: IconName }[] = [
  { href: "/map", label: "Map", icon: "map" },
  { href: "/check-ins", label: "Check-ins", icon: "journal" },
  { href: "/settings", label: "Settings", icon: "settings" },
];

export function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { mode } = useStore();
  // The menu belongs to the page it was opened on, so navigating closes it.
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const menuOpen = menuFor === pathname;

  const current = NAV.find((n) => pathname.startsWith(n.href))?.label ?? "Trellis";

  return (
    <div className={styles.frame} data-menu={menuOpen ? "open" : "closed"}>
      <aside className={styles.sidebar} aria-label="Trellis">
        <Link href="/map" className={styles.brand}>
          <Logo size={20} />
        </Link>
        <SidebarBody />
      </aside>

      <header className={styles.topbar}>
        <button
          type="button"
          className={`${ui.iconBtn} ${styles.menuBtn}`}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          onClick={() => setMenuFor(menuOpen ? null : pathname)}
        >
          <Icon name={menuOpen ? "close" : "menu"} />
        </button>
        <span className={styles.mobileTitle}>{current}</span>
        <Search />
        <ThemeButton />
      </header>

      <main className={styles.sheet}>
        <StatusBars />
        {/* While the store finds out who is here, show nothing rather than the sample
            student flashing up before a signed-in student's own map. */}
        {mode === "loading" ? <div className={styles.loading} aria-busy="true" aria-label="Loading your map" /> : children}
      </main>
    </div>
  );
}

function SidebarBody() {
  const pathname = usePathname();
  const router = useRouter();
  const { subjectId, goalIds, statuses, student, mode, dispatch } = useStore();

  // "Active" means a goal is picked: that's when a subject has a route to show progress on.
  const active = subjects.filter((s) => goalIds[s.id]);

  const open = (id: SubjectId) => {
    dispatch({ type: "subject", subjectId: id });
    router.push(goalIds[id] ? "/map" : "/start");
  };

  return (
    <>
      <nav className={styles.nav} aria-label="Main">
        {NAV.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className={styles.navItem}
            aria-current={pathname.startsWith(n.href) ? "page" : undefined}
          >
            <Icon name={n.icon} />
            {n.label}
          </Link>
        ))}
      </nav>

      <div className={styles.group}>
        {active.length > 0 && <p className={styles.groupLabel}>Your subjects</p>}
        {active.map((s) => {
          const sum = summarise(goalById.get(goalIds[s.id]!)!, statuses);
          return (
            <button
              key={s.id}
              type="button"
              className={styles.subject}
              aria-current={s.id === subjectId && pathname.startsWith("/map") ? "true" : undefined}
              onClick={() => open(s.id)}
            >
              <span className={styles.subjectName}>{s.shortName}</span>
              <span className={`${styles.subjectFig} num`}>
                {sum.done}
                <span className={styles.of}>/{sum.route.length}</span>
              </span>
              <span className={styles.track} aria-hidden="true">
                <span style={{ width: `${(sum.done / sum.route.length) * 100}%` }} />
              </span>
            </button>
          );
        })}

        {/* Subjects not started yet aren't listed here; "New subject" goes to /start,
            which shows only those (and the request form for anything else). */}
        <Link href="/start" className={styles.newSubject}>
          <Icon name="plus" size={14} />
          New subject
        </Link>
      </div>

      {/* The foot sits at the bottom of the sidebar: the AI meter, then who is signed in. */}
      <div className={styles.foot}>
        <UsageMeter />
        <div className={styles.user}>
          <span className={styles.avatar} aria-hidden="true">
            {student.name.charAt(0)}
          </span>
          <span className={styles.userText}>
            <span className={styles.userName}>{student.name}</span>
            <span className={styles.userMail}>{mode === "demo" ? "Sample student" : student.email}</span>
          </span>
        </div>
      </div>
    </>
  );
}

/**
 * The account's AI allowance, as one small meter (backend-design.md §5 "Cost limits").
 *
 * It shows a percentage and never an amount: the server sends nothing else. Of the two
 * windows (today, this week) it shows the one that is closer to its limit; Settings shows
 * both. At a limit the helper keeps working in basic mode, and the meter says until when.
 *
 * Not shown in demo mode (the sample's helper runs in the browser and calls no AI), nor
 * on a server that runs without the AI.
 */
function UsageMeter() {
  const { usage, act } = useStore();
  const dayResetsAt = usage?.day.resetsAt;

  // A tab left open past the reset still shows yesterday's number. Ask again when the
  // reset time arrives, and when the student comes back to the tab after it (a sleeping
  // laptop runs no timers). Nothing is polled in between: every helper reply already
  // carries fresh numbers.
  useEffect(() => {
    if (!dayResetsAt) return;
    const resetsAt = Date.parse(dayResetsAt);
    // A few seconds late on purpose, so the server's clock has certainly passed it too.
    const timer = setTimeout(() => void act.refreshUsage(), Math.max(0, resetsAt - Date.now()) + 5000);
    const onVisible = () => {
      if (document.visibilityState === "visible" && Date.now() >= resetsAt) void act.refreshUsage();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [dayResetsAt, act]);

  if (!usage?.on) return null;

  const which = tighterWindow(usage);
  const pct = usage[which].usedPct;
  const label = `AI usage ${which === "day" ? "today" : "this week"}`;
  const note = usage.basic ? `Basic mode until ${backAt(usage)}` : null;

  return (
    <Link
      href="/settings#ai-usage"
      className={styles.usage}
      data-tone={pct >= NEARLY ? "near" : undefined}
      // One sentence for a screen reader, instead of a label, a number and a bar.
      aria-label={`${label}: ${pct}% used.${note ? ` ${note}.` : ""} Open settings.`}
    >
      <span className={styles.usageLabel}>{label}</span>
      <span className={`${styles.usageFig} num`}>{pct}%</span>
      <span className={styles.track} aria-hidden="true">
        <span style={{ width: `${pct}%` }} />
      </span>
      {note && <span className={styles.usageNote}>{note}</span>}
    </Link>
  );
}

/**
 * Above the page: the last request that failed, and in demo mode a reminder that this is
 * the sample student, so nobody thinks their changes are being kept on a server.
 */
function StatusBars() {
  const { mode, error, clearError } = useStore();
  return (
    <>
      {error && (
        <div className={styles.bar} data-tone="error" role="alert">
          <span>{error}</span>
          <button type="button" onClick={clearError}>
            Dismiss
          </button>
        </div>
      )}
      {mode === "demo" && (
        <div className={styles.bar}>
          <span>You&rsquo;re looking at a sample student. Changes stay in this browser.</span>
          <Link href="/signup">Start your own map</Link>
        </div>
      )}
    </>
  );
}

function ThemeButton() {
  const { setPref } = useTheme();
  const dark = useResolvedTheme() === "dark";
  return (
    <button
      type="button"
      className={`${ui.iconBtn} ${styles.themeBtn}`}
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
      title={dark ? "Light theme" : "Dark theme"}
      onClick={() => setPref(dark ? "light" : "dark")}
    >
      <Icon name={dark ? "sun" : "moon"} />
    </button>
  );
}
