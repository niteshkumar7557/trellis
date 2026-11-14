"use client";

// Sets a new password with the admin's one-time link. It signs out every device and does
// not sign this one in: the student logs in with the new password, which also proves it
// works.

import Link from "next/link";
import { useState } from "react";
import ui from "@/components/ui/ui.module.css";
import { ApiError, api } from "@/lib/api";
import styles from "../auth.module.css";

export function ResetForm({ token }: { token: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (!token) {
    return (
      <>
        <h1 className={styles.h1}>This link is incomplete</h1>
        <p className={styles.lede}>Open the whole link from the admin&rsquo;s email, or ask for a new one.</p>
      </>
    );
  }

  if (done) {
    return (
      <>
        <h1 className={styles.h1}>Password changed</h1>
        <p className={styles.lede}>Every device was signed out. Log in with your new password.</p>
        <Link href="/login" className={`${ui.primary} ${styles.submit}`}>
          Log in
        </Link>
      </>
    );
  }

  return (
    <>
      <h1 className={styles.h1}>Set a new password</h1>
      <p className={styles.lede}>This link works once, for an hour.</p>
      <form
        className={styles.fields}
        onSubmit={async (e) => {
          e.preventDefault();
          const password = String(new FormData(e.currentTarget).get("password"));
          setBusy(true);
          setError(null);
          try {
            await api("/auth/reset-password", { method: "POST", body: { token, password } });
            setDone(true);
          } catch (err) {
            setError(err instanceof ApiError ? err.message : "Something went wrong. Try again.");
            setBusy(false);
          }
        }}
      >
        <label className={styles.field}>
          <span>New password</span>
          <input name="password" type="password" autoComplete="new-password" minLength={8} maxLength={72} required />
          <span className={styles.rule}>At least 8 characters.</span>
        </label>
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
        <button type="submit" className={`${ui.primary} ${styles.submit}`} disabled={busy}>
          {busy ? "One moment…" : "Set the password"}
        </button>
      </form>
    </>
  );
}
