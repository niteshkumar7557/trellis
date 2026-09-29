"use client";

import { useState, type InputHTMLAttributes } from "react";
import Icon, { type IconName } from "../Icon";

interface AuthFieldProps
  extends Omit<
    InputHTMLAttributes<HTMLInputElement>,
    "id" | "value" | "onChange" | "type"
  > {
  id: string;
  label: string;
  type?: "text" | "email" | "password";
  value: string;
  onValueChange: (value: string) => void;
  error?: string;
  hint?: string;
  icon?: IconName;
}

export default function AuthField({
  id,
  label,
  type = "text",
  value,
  onValueChange,
  error,
  hint,
  icon,
  ...inputProps
}: AuthFieldProps) {
  const [revealed, setRevealed] = useState(false);
  const isPassword = type === "password";
  const resolvedType = isPassword && revealed ? "text" : type;

  const describedBy =
    [error ? `${id}-error` : null, hint ? `${id}-hint` : null]
      .filter(Boolean)
      .join(" ") || undefined;

  return (
    <div className={`auth-field flex flex-col gap-[7px] ${error ? "has-error" : ""}`}>
      <label htmlFor={id} className="text-[#4b4540] dark:text-[#cbc4bd] text-[12.5px] font-semibold tracking-[-0.005em]">
        {label}
      </label>
      <div
        className={`auth-input-wrap relative flex items-center rounded-[10px] bg-white dark:bg-[#252422] transition-[border-color,box-shadow] duration-[180ms] ease-out ${
          error
            ? "border border-[#cf9d92] dark:border-[#8a5244] shadow-[0_0_0_3px_rgba(178,90,72,0.1)] dark:shadow-[0_0_0_3px_rgba(178,90,72,0.16)]"
            : "border border-[#dfdad4] dark:border-[#45413d] focus-within:border-[#c6a196] focus-within:shadow-[0_0_0_3px_rgba(184,128,111,0.13)] dark:focus-within:border-[#9c6b5d] dark:focus-within:shadow-[0_0_0_3px_rgba(184,128,111,0.16)]"
        }`}
      >
        {icon && (
          <span className="auth-input-icon grid place-items-center pl-[13px] text-[#a29a93] dark:text-[#8d857e]" aria-hidden="true">
            <Icon name={icon} size={17} />
          </span>
        )}
        <input
          {...inputProps}
          id={id}
          type={resolvedType}
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={`w-full h-[46px] pr-3.5 ${
            icon ? "pl-2.5" : "pl-3.5"
          } border-0 outline-none text-[#332f2c] dark:text-[#eee9e4] bg-transparent text-[14px] placeholder-[#a29a93] dark:placeholder-[#77716b]`}
        />
        {isPassword && (
          <button
            className="auth-reveal w-10 h-[46px] grid place-items-center border-0 rounded-r-[10px] text-[#9a938c] dark:text-[#8d857e] bg-transparent hover:text-[#5b544e] dark:hover:text-[#e6dfd9] transition-colors duration-[180ms] ease-out cursor-pointer"
            type="button"
            onClick={() => setRevealed((current) => !current)}
            aria-label={revealed ? "Hide password" : "Show password"}
            aria-pressed={revealed}
          >
            <Icon name={revealed ? "eyeOff" : "eye"} size={17} />
          </button>
        )}
      </div>
      {error ? (
        <p className="auth-error m-0 flex items-center gap-[5px] text-[#a1543f] dark:text-[#e09580] text-[12px]" id={`${id}-error`} role="alert">
          <Icon name="alert" size={13} />
          <span>{error}</span>
        </p>
      ) : hint ? (
        <p className="auth-hint m-0 text-[#6f6862] dark:text-[#8e8881] text-[12px]" id={`${id}-hint`}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}
