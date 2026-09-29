"use client";

import Link from "next/link";
import Icon from "../Icon";

interface AuthSuccessProps {
  title: string;
  message: string;
  ctaLabel: string;
}

export default function AuthSuccess({
  title,
  message,
  ctaLabel,
}: AuthSuccessProps) {
  return (
    <div className="auth-success pt-1.5 text-center" role="status">
      <div className="auth-success-icon w-[54px] h-[54px] mx-auto mb-[18px] grid place-items-center border border-[#cfe0cf] dark:border-[#35502f] rounded-2xl text-[#5d8a56] dark:text-[#9dc493] bg-[#eef5ec] dark:bg-[#1e2a1c]">
        <Icon name="check" size={26} />
      </div>
      <h2 className="m-0 mb-2 text-[#26231f] dark:text-[#eee9e4] font-manrope text-[26px] font-bold tracking-[-0.04em]">
        {title}
      </h2>
      <p className="m-0 mb-[22px] text-[#6f6862] dark:text-[#a29a93] text-[14px] leading-[1.6]">
        {message}
      </p>
      <Link
        className="auth-submit w-full h-12 flex items-center justify-center gap-[9px] border-0 rounded-[10px] text-white bg-[#b8806f] hover:bg-[#a86d5d] text-[14px] font-semibold tracking-[-0.01em] no-underline shadow-[0_8px_20px_rgba(141,87,70,0.18)] hover:shadow-[0_10px_24px_rgba(141,87,70,0.24)] hover:-translate-y-px transition-[background-color,box-shadow,transform] duration-[180ms] ease-out"
        href="/"
      >
        {ctaLabel}
        <Icon name="arrowRight" size={16} />
      </Link>
    </div>
  );
}
