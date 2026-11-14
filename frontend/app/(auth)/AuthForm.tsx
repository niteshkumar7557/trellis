"use client";

// Sign-up and login with email and password (backend-design.md §4). On success the API
// sets the refresh cookie and returns an access token; the store then loads the record
// (live mode) and the student goes to /start (no goal yet) or /map.
//
// "Continue with Google" is a plain link to /api/auth/google: a full page navigation,
// because the server redirects to Google and Google redirects back (backend-design.md §4).
// It shows only when NEXT_PUBLIC_GOOGLE_SIGNIN is "on", i.e. when the backend has its
// Google client id and secret; a button that leads to a 404 is worse than none.

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import ui from "@/components/ui/ui.module.css";
import { ApiError, api, setAccessToken } from "@/lib/api";
import { useStore } from "@/lib/store";
import type { Student } from "@shared/types";
import styles from "./auth.module.css";

// Where "Forgot your password?" sends the email. Set in frontend/.env; without it the
// line still explains what to do, just without a mail link. Kept out of the code so the
// admin's address isn't published in the repository.
const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
const GOOGLE = process.env.NEXT_PUBLIC_GOOGLE_SIGNIN === "on";

// The reasons /api/auth/google/callback can send someone back here with.
const GOOGLE_ERRORS: Record<string, string> = {
  google: "Google sign-in didn't finish. Try again.",
  google_unverified: "Google hasn't verified that email address, so it can't be used to sign in.",
};

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const { act } = useStore();
  const [busy, setBusy] = useState(false);
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(GOOGLE_ERRORS[params.get("error") ?? ""] ?? null);
  const signup = mode === "signup";

  const submit = async (form: HTMLFormElement) => {
    const data = Object.fromEntries(new FormData(form)) as Record<string, string>;
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ accessToken: string; student: Student }>(signup ? "/auth/register" : "/auth/login", {
        method: "POST",
        body: signup ? { name: data.name, email: data.email, password: data.password } : { email: data.email, password: data.password },
      });
      setAccessToken(res.accessToken);
      await act.goLive();
      router.push(res.student.goals.length ? "/map" : "/start");
    } catch (err) {
      // The API's messages are written for people ("That email and password don't
      // match."), so they are shown as they are.
      setError(err instanceof ApiError ? err.message : "Something went wrong. Try again.");
      setBusy(false);
    }
  };

  return (
    <>
      <h1 className={styles.h1}>{signup ? "Start your map" : "Welcome back"}</h1>
      <p className={styles.lede}>
        {signup ? "Two minutes to set up. No streaks, no reminders, no one watching." : "Your map is where you left it."}
      </p>
      {signup && (
        <p className={styles.rule}>
          What you type to the helper is read by an AI model to work out the topic. Nothing is saved until you confirm.
        </p>
      )}

      {GOOGLE && (
        <>
          <a href="/api/auth/google" className={`${ui.btn} ${styles.google}`}>
            <Icon name="google" />
            Continue with Google
          </a>
          <p className={styles.or}>or with email</p>
        </>
      )}

      <form
        className={styles.fields}
        onSubmit={(e) => {
          e.preventDefault();
          void submit(e.currentTarget);
        }}
      >
        {signup && (
          <label className={styles.field}>
            <span>Name</span>
            <input name="name" autoComplete="name" maxLength={60} required />
          </label>
        )}
        <label className={styles.field}>
          <span>Email</span>
          <input name="email" type="email" autoComplete="email" required />
        </label>
        <label className={styles.field}>
          <span>Password</span>
          <input
            name="password"
            type="password"
            autoComplete={signup ? "new-password" : "current-password"}
            minLength={signup ? 8 : undefined}
            maxLength={72}
            required
            aria-describedby={signup ? "pw-rule" : undefined}
          />
          {signup && (
            <span id="pw-rule" className={styles.rule}>
              At least 8 characters.
            </span>
          )}
        </label>
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
        <button type="submit" className={`${ui.primary} ${styles.submit}`} disabled={busy}>
          {busy ? "One moment…" : signup ? "Create account" : "Log in"}
        </button>
      </form>

      {!signup && (
        <p className={styles.rule}>
          Forgot your password? {ADMIN_EMAIL ? <a href={`mailto:${ADMIN_EMAIL}?subject=Trellis%20password%20reset`}>Email the admin</a> : "Email the admin"}{" "}
          from the address you signed up with, and you&rsquo;ll get a link to set a new one.
        </p>
      )}

      <p className={styles.switch}>
        {signup ? (
          <>
            Already have a map? <Link href="/login">Log in</Link>
          </>
        ) : (
          <>
            New here? <Link href="/signup">Start your map</Link>
          </>
        )}
      </p>
    </>
  );
}
