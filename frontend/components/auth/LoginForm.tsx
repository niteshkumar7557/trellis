"use client";

/**
 * =============================================================================
 * LOGIN FORM COMPONENT
 * =============================================================================
 * Handles email/password authentication and Google OAuth entry.
 * 
 * 🔗 BACKEND LINK:
 *  POST /api/auth -> { email, password, name? } -> returns session token + profile
 *                     (Backend checks if user exists: logs in or registers)
 * =============================================================================
 */

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { validateLogin, type FieldErrors } from "@/lib/validation";
import { api } from "@/lib/api";
import Icon from "../Icon";
import AuthField from "./AuthField";
import AuthSuccess from "./AuthSuccess";
import GoogleIcon from "./GoogleIcon";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [forgotNotice, setForgotNotice] = useState(false);
  const [status, setStatus] = useState<"idle" | "submitting" | "done">("idle");
  const [serverError, setServerError] = useState("");

  const clearError = (key: string) =>
    setErrors((previous) => {
      if (!previous[key]) return previous;
      const next = { ...previous };
      delete next[key];
      return next;
    });

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setServerError("");

    const nextErrors = validateLogin({ email, password });
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setStatus("submitting");

    // 🔗 BACKEND LINK: POST /api/auth (Unified Register & Login route)
    try {
      await api.auth.authenticate({ email, password });
      setStatus("done");
    } catch (err) {
      setServerError(
        err instanceof Error ? err.message : "Invalid email or password."
      );
      setStatus("idle");
    }
  };

  if (status === "done") {
    return (
      <AuthSuccess
        title="Welcome back"
        message="You are signed in to Kero. Pick up where you left off."
        ctaLabel="Continue to Kero"
        href="/"
      />
    );
  }

  return (
    <div>
      <div className="auth-card-head">
        <h2 className="m-0 mb-2 text-[#26231f] dark:text-[#eee9e4] font-manrope text-[30px] max-[520px]:text-[26px] font-bold tracking-[-0.04em]">
          Welcome back
        </h2>
        <p className="m-0 mb-[26px] text-[#6f6862] dark:text-[#a29a93] text-[14px] leading-[1.55]">
          Pick up the thread exactly where you left it.
        </p>
      </div>

      <button
        className="auth-oauth w-full h-[46px] flex items-center justify-center gap-2.5 border border-[#ded9d1] dark:border-[#45413d] rounded-[10px] text-[#373330] dark:text-[#e6dfd9] bg-white dark:bg-[#252422] text-[14px] font-medium transition-[border-color,background-color,box-shadow] duration-[180ms] ease-out hover:border-[#cdbdb5] dark:hover:border-[#5a544e] hover:bg-[#fffdfc] dark:hover:bg-[#2b2927] hover:shadow-[0_4px_14px_rgba(50,43,37,0.05)] dark:hover:shadow-none cursor-pointer"
        type="button"
      >
        <GoogleIcon />
        Continue with Google
      </button>

      <div className="auth-divider my-5 flex items-center gap-3.5 text-[#8f8881] text-[11px] tracking-[0.08em] uppercase before:content-[''] before:h-px before:flex-1 before:bg-[#e7e2dc] dark:before:bg-[#3b3835] after:content-[''] after:h-px after:flex-1 after:bg-[#e7e2dc] dark:after:bg-[#3b3835]">
        <span>or</span>
      </div>

      {serverError && (
        <div className="mb-4 p-3 rounded-lg bg-[#fdf3f0] dark:bg-[#2a1e1b] border border-[#f5c2b8] dark:border-[#5a3028] text-[#a25e50] dark:text-[#d89180] text-[12px]">
          {serverError}
        </div>
      )}

      <form className="auth-form flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
        <AuthField
          id="login-email"
          label="Email"
          type="email"
          icon="mail"
          value={email}
          onValueChange={(value) => {
            setEmail(value);
            clearError("email");
          }}
          error={errors.email}
          placeholder="you@example.com"
          autoComplete="email"
          required
        />

        <AuthField
          id="login-password"
          label="Password"
          type="password"
          icon="lock"
          value={password}
          onValueChange={(value) => {
            setPassword(value);
            clearError("password");
          }}
          error={errors.password}
          placeholder="Enter your password"
          autoComplete="current-password"
          required
        />

        <div className="auth-row -mt-0.5 flex items-center justify-between gap-3">
          <label className="auth-check inline-flex items-center gap-[9px] text-[#5b544e] dark:text-[#b1aaa3] text-[13px] cursor-pointer">
            <input
              type="checkbox"
              checked={remember}
              onChange={(event) => setRemember(event.target.checked)}
              className="w-4 h-4 m-0 accent-[#b8806f]"
            />
            Remember me
          </label>
          <button
            className="auth-link auth-link-button p-0 border-0 bg-transparent text-[#9d6252] dark:text-[#db9c88] text-[13px] font-medium no-underline hover:text-[#814b3e] dark:hover:text-[#efb19d] hover:underline hover:underline-offset-2 cursor-pointer"
            type="button"
            onClick={() => setForgotNotice(true)}
          >
            Forgot password?
          </button>
        </div>

        {forgotNotice && (
          <p className="auth-hint m-0 text-[#6f6862] dark:text-[#8e8881] text-[12px]" role="status">
            Password reset will be sent via email once connected.
          </p>
        )}

        <button
          className="auth-submit w-full h-12 flex items-center justify-center gap-[9px] border-0 rounded-[10px] text-white bg-[#b8806f] hover:not-disabled:bg-[#a86d5d] text-[14px] font-semibold tracking-[-0.01em] no-underline shadow-[0_8px_20px_rgba(141,87,70,0.18)] hover:not-disabled:shadow-[0_10px_24px_rgba(141,87,70,0.24)] hover:not-disabled:-translate-y-px transition-[background-color,box-shadow,transform] duration-[180ms] ease-out disabled:cursor-default disabled:opacity-60 cursor-pointer"
          type="submit"
          disabled={status === "submitting"}
        >
          {status === "submitting" ? (
            "Signing in…"
          ) : (
            <>
              Sign in
              <Icon name="arrowRight" size={16} />
            </>
          )}
        </button>
      </form>

      <p className="auth-switch mt-[22px] text-[#6f6862] dark:text-[#8e8881] text-[13px] text-center">
        New to Kero?{" "}
        <Link className="auth-link text-[#9d6252] dark:text-[#db9c88] text-[13px] font-medium no-underline hover:text-[#814b3e] dark:hover:text-[#efb19d] hover:underline hover:underline-offset-2" href="/register">
          Create an account
        </Link>
      </p>

      {/* Backend Info Notice */}
      <div className="mt-6 px-3 py-2 rounded-lg border border-dashed border-[#d8d0c8] dark:border-[#3d3835] text-[10.5px] text-[#918a83] dark:text-[#7a736c] text-center">
        🔗 Connected to hosted backend API: <code>POST /api/auth</code> (Unified Register &amp; Login)
      </div>
    </div>
  );
}
