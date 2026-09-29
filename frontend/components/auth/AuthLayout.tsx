"use client";

import type { ReactNode } from "react";
import { useTheme } from "@/lib/useTheme";
import BrandMark from "../BrandMark";
import Icon from "../Icon";

const COVERAGE = [
  "Computer networking",
  "React",
  "Backend · Express",
  "DBMS · PostgreSQL",
];

export default function AuthLayout({ children }: { children: ReactNode }) {
  const { darkMode, toggleTheme } = useTheme();
  const themeLabel = darkMode ? "Switch to light mode" : "Switch to dark mode";

  return (
    <div
      className={`auth-page min-h-svh grid grid-cols-[minmax(360px,0.94fr)_1.06fr] max-[940px]:grid-cols-1 text-[#252321] dark:text-[#e8e3de] bg-[#f7f6f3] dark:bg-[#1b1a19] ${
        darkMode ? "dark-mode" : ""
      }`}
    >
      <aside
        className="auth-aside relative overflow-hidden pt-[38px] px-11 pb-[34px] flex flex-col gap-[30px] border-r border-[#e8e5df] dark:border-[#302e2c] bg-[#f4f2ee] dark:bg-[#222120] max-[940px]:hidden [&>*]:relative [&>*]:z-[1]"
        aria-hidden="true"
      >
        <div className="auth-aside-brand flex items-center [&_.brand-mark]:p-0">
          <BrandMark />
        </div>

        <div className="auth-aside-copy max-w-[440px] my-auto">
          <p className="auth-eyebrow m-0 text-[#9d6252] dark:text-[#db9c88] text-[11px] font-semibold tracking-[0.12em] uppercase">
            Adaptive study direction
          </p>
          <h1 className="mt-4 mb-3.5 text-[#26231f] dark:text-[#eee9e4] font-manrope text-[clamp(28px,3vw,40px)] font-bold leading-[1.08] tracking-[-0.045em]">
            You didn&apos;t quit because it was hard.
          </h1>
          <p className="m-0 text-[#6f6862] dark:text-[#a29a93] text-[15px] leading-[1.65]">
            You lost the thread and never found it again. Kero keeps it — one
            line a day, one thing to do, and a prompt for the AI you already
            use.
          </p>
        </div>

        <div className="auth-aside-foot flex flex-col gap-3.5">
          <div className="auth-chips flex flex-wrap gap-2">
            {COVERAGE.map((item) => (
              <span
                className="auth-chip py-1.5 px-3 border border-[#e2dcd4] dark:border-[#3b3835] rounded-full text-[#6f6862] dark:text-[#a29a93] bg-[#faf9f7] dark:bg-[#292826] text-[12px] font-medium"
                key={item}
              >
                {item}
              </span>
            ))}
          </div>
          <p className="auth-aside-note m-0 max-w-[380px] text-[#6f6862] dark:text-[#8e8881] text-[12px] leading-[1.55]">
            Kero never explains a concept. It tells you exactly what to study
            next, and it never punishes a gap.
          </p>
        </div>
      </aside>

      <main className="auth-main relative flex flex-col items-center justify-center max-[940px]:justify-start pt-[88px] max-[940px]:pt-[104px] max-[520px]:pt-[92px] px-7 max-[520px]:px-[18px] pb-14 max-[520px]:pb-11 bg-[radial-gradient(120%_80%_at_100%_0%,#fdf7f4_0%,#f7f6f3_55%)] dark:bg-[radial-gradient(120%_80%_at_100%_0%,#282119_0%,#1b1a19_58%)]">
        <div className="auth-topbar absolute top-[22px] right-[26px] left-[26px] flex items-center justify-end max-[940px]:justify-between">
          <span className="auth-mobile-brand hidden max-[940px]:flex [&_.brand-mark]:p-0">
            <BrandMark />
          </span>
          <button
            className="auth-theme-toggle w-[34px] h-[34px] p-0 inline-grid place-items-center border border-[#ded9d1] dark:border-[#45413d] rounded-full text-[#8f8881] dark:text-[#aaa29a] bg-[#faf9f7] dark:bg-[#292826] transition-[color,border-color,background-color,transform] duration-[180ms] ease-out hover:border-[#cdbdb5] dark:hover:border-[#896055] hover:text-[#9d6252] dark:hover:text-[#e1a18e] hover:bg-white dark:hover:bg-[#35302d] hover:-rotate-[10deg] cursor-pointer"
            type="button"
            onClick={toggleTheme}
            aria-label={themeLabel}
            title={themeLabel}
          >
            <Icon name={darkMode ? "sun" : "moon"} size={16} />
          </button>
        </div>

        <div className="auth-card w-[min(430px,100%)]">{children}</div>
      </main>
    </div>
  );
}
