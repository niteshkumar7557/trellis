"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import ui from "@/components/ui/ui.module.css";
import styles from "./auth.module.css";

/** Dummy auth: no backend yet. Signing up goes to setup; logging in goes to the map. */
export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const signup = mode === "signup";
  const go = () => {
    setBusy(true);
    setTimeout(() => router.push(signup ? "/start" : "/map"), 350);
  };

  return (
    <>
      <h1 className={styles.h1}>{signup ? "Start your map" : "Welcome back"}</h1>
      <p className={styles.lede}>
        {signup ? "Two minutes to set up. No streaks, no reminders, no one watching." : "Your map is where you left it."}
      </p>

      <button type="button" className={`${ui.btn} ${styles.google}`} onClick={go}>
        <Icon name="google" />
        Continue with Google
      </button>

      <p className={styles.or}>or with email</p>

      <form
        className={styles.fields}
        onSubmit={(e) => {
          e.preventDefault();
          go();
        }}
      >
        {signup && (
          <label className={styles.field}>
            <span>Name</span>
            <input name="name" autoComplete="name" required />
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
            minLength={8}
            required
            aria-describedby={signup ? "pw-rule" : undefined}
          />
          {signup && (
            <span id="pw-rule" className={styles.rule}>
              At least 8 characters.
            </span>
          )}
        </label>
        <button type="submit" className={`${ui.primary} ${styles.submit}`} disabled={busy}>
          {busy ? "One moment…" : signup ? "Create account" : "Log in"}
        </button>
      </form>

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
