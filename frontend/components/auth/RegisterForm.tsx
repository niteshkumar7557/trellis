"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import {
  getPasswordStrength,
  validateRegister,
  type FieldErrors,
} from "@/lib/validation";
import Icon from "../Icon";
import AuthField from "./AuthField";
import AuthSuccess from "./AuthSuccess";
import GoogleIcon from "./GoogleIcon";

export default function RegisterForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [terms, setTerms] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<"idle" | "submitting" | "done">("idle");

  const strength = getPasswordStrength(password);

  const clearError = (key: string) =>
    setErrors((previous) => {
      if (!previous[key]) return previous;
      const next = { ...previous };
      delete next[key];
      return next;
    });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validateRegister({ name, email, password, terms });
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    // UI preview: simulate the round-trip, then show the success panel.
    setStatus("submitting");
    window.setTimeout(() => setStatus("done"), 650);
  };

  if (status === "done") {
    return (
      <AuthSuccess
        title="Account preview ready"
        message="This is a UI preview — no account was created and nothing was saved. Wire your backend to complete signup."
        ctaLabel="Continue to Trellis"
      />
    );
  }

  return (
    <div>
      <div className="auth-card-head">
        <h2 className="m-0 mb-2 text-[#26231f] dark:text-[#eee9e4] font-manrope text-[30px] max-[520px]:text-[26px] font-bold tracking-[-0.04em]">
          Create your account
        </h2>
        <p className="m-0 mb-[26px] text-[#6f6862] dark:text-[#a29a93] text-[14px] leading-[1.55]">
          Two minutes now, then one line a day.
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

      <form className="auth-form flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
        <AuthField
          id="register-name"
          label="Name"
          icon="user"
          value={name}
          onValueChange={(value) => {
            setName(value);
            clearError("name");
          }}
          error={errors.name}
          placeholder="How should we address you?"
          autoComplete="name"
          required
        />

        <AuthField
          id="register-email"
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

        <div>
          <AuthField
            id="register-password"
            label="Password"
            type="password"
            icon="lock"
            value={password}
            onValueChange={(value) => {
              setPassword(value);
              clearError("password");
            }}
            error={errors.password}
            placeholder="At least 8 characters"
            autoComplete="new-password"
            required
          />
          {password && (
            <div
              className="auth-strength mt-[9px] flex items-center gap-2.5"
              data-score={strength.score}
              aria-hidden="true"
            >
              <div className="auth-strength-bars flex flex-1 gap-1">
                <span className="h-1 flex-1 rounded-full bg-[#e7e2dc] dark:bg-[#3b3835] transition-colors duration-200" />
                <span className="h-1 flex-1 rounded-full bg-[#e7e2dc] dark:bg-[#3b3835] transition-colors duration-200" />
                <span className="h-1 flex-1 rounded-full bg-[#e7e2dc] dark:bg-[#3b3835] transition-colors duration-200" />
                <span className="h-1 flex-1 rounded-full bg-[#e7e2dc] dark:bg-[#3b3835] transition-colors duration-200" />
              </div>
              <span className="auth-strength-label min-w-[52px] text-[#6f6862] dark:text-[#8e8881] text-[11px] text-right">
                {strength.label}
              </span>
            </div>
          )}
        </div>

        <div className={`auth-terms flex flex-col gap-[7px] ${errors.terms ? "has-error" : ""}`}>
          <label className="auth-check inline-flex items-center gap-[9px] text-[#5b544e] dark:text-[#b1aaa3] text-[13px] cursor-pointer">
            <input
              type="checkbox"
              checked={terms}
              onChange={(event) => {
                setTerms(event.target.checked);
                clearError("terms");
              }}
              className="w-4 h-4 m-0 accent-[#b8806f]"
            />
            <span>
              I agree to the{" "}
              <Link className="auth-link text-[#9d6252] dark:text-[#db9c88] text-[13px] font-medium no-underline hover:text-[#814b3e] dark:hover:text-[#efb19d] hover:underline hover:underline-offset-2" href="/terms">
                Terms and Privacy Policy.
              </Link>
            </span>
          </label>
          {errors.terms && (
            <p className="auth-error m-0 flex items-center gap-[5px] text-[#a1543f] dark:text-[#e09580] text-[12px]" role="alert">
              <Icon name="alert" size={13} />
              <span>{errors.terms}</span>
            </p>
          )}
        </div>

        <button
          className="auth-submit w-full h-12 flex items-center justify-center gap-[9px] border-0 rounded-[10px] text-white bg-[#b8806f] hover:not-disabled:bg-[#a86d5d] text-[14px] font-semibold tracking-[-0.01em] no-underline shadow-[0_8px_20px_rgba(141,87,70,0.18)] hover:not-disabled:shadow-[0_10px_24px_rgba(141,87,70,0.24)] hover:not-disabled:-translate-y-px transition-[background-color,box-shadow,transform] duration-[180ms] ease-out disabled:cursor-default disabled:opacity-60 cursor-pointer"
          type="submit"
          disabled={status === "submitting"}
        >
          {status === "submitting" ? (
            "Creating account…"
          ) : (
            <>
              Create account
              <Icon name="arrowRight" size={16} />
            </>
          )}
        </button>
      </form>

      <p className="auth-switch mt-[22px] text-[#6f6862] dark:text-[#8e8881] text-[13px] text-center">
        Already have an account?{" "}
        <Link className="auth-link text-[#9d6252] dark:text-[#db9c88] text-[13px] font-medium no-underline hover:text-[#814b3e] dark:hover:text-[#efb19d] hover:underline hover:underline-offset-2" href="/login">
          Sign in
        </Link>
      </p>
    </div>
  );
}
