"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Mark } from "@/components/ui/Mark";
import ui from "@/components/ui/ui.module.css";
import { goalById, subjects } from "@/lib/data";
import { student } from "@/lib/data/student";
import { summarise } from "@/lib/graph";
import { useStore } from "@/lib/store";
import { useResolvedTheme, useTheme } from "@/lib/theme";
import type { SubjectId } from "@/lib/types";
import { Search } from "./Search";
import styles from "./shell.module.css";

const NAV: { href: string; label: string; icon: IconName }[] = [
  { href: "/map", label: "Map", icon: "map" },
  { href: "/check-ins", label: "Check-ins", icon: "journal" },
  { href: "/settings", label: "Settings", icon: "settings" },
];

export function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  // The menu belongs to the page it was opened on, so navigating closes it.
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const menuOpen = menuFor === pathname;

  const current = NAV.find((n) => pathname.startsWith(n.href))?.label ?? "Trellis";

  return (
    <div className={styles.frame} data-menu={menuOpen ? "open" : "closed"}>
      <aside className={styles.sidebar} aria-label="Trellis">
        <Link href="/map" className={styles.brand}>
          <Mark size={20} />
          <span>Trellis</span>
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

      <main className={styles.sheet}>{children}</main>
    </div>
  );
}

function SidebarBody() {
  const pathname = usePathname();
  const router = useRouter();
  const { subjectId, goalIds, statuses, dispatch } = useStore();

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
        <p className={styles.groupLabel}>Subjects</p>
        {subjects.map((s) => {
          const goal = goalIds[s.id] ? goalById.get(goalIds[s.id]!) : null;
          const sum = goal ? summarise(goal, statuses) : null;
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
                {sum ? (
                  <>
                    {sum.done}
                    <span className={styles.of}>/{sum.route.length}</span>
                  </>
                ) : (
                  <span className={styles.of}>Start</span>
                )}
              </span>
              {sum && (
                <span className={styles.track} aria-hidden="true">
                  <span style={{ width: `${(sum.done / sum.route.length) * 100}%` }} />
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className={styles.user}>
        <span className={styles.avatar} aria-hidden="true">
          {student.name.charAt(0)}
        </span>
        <span className={styles.userText}>
          <span className={styles.userName}>{student.name}</span>
          <span className={styles.userMail}>{student.email}</span>
        </span>
      </div>
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
