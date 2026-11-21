"use client";

// Where Google sign-in lands when the DESKTOP app started it (docs/desktop.md §5).
//
// The student signed in to Google in their own browser, but it's the app that must end up
// signed in. /api/auth/google/callback gave this browser no session; it sent it here with
// a one-time code. This page opens trellis://auth?code=…, macOS hands that link to the
// Trellis app, and the app swaps the code (plus a secret only it holds) for its session.
//
// It lives in the (auth) group for the sign-in pages' frame; the folder is auth/desktop so
// the address matches the callback's redirect, /auth/desktop.
//
// The link is worked out while rendering, from the query; the effect only does the one
// real side effect, opening it. useSearchParams needs a Suspense boundary to build, as on
// the login page.

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import ui from "@/components/ui/ui.module.css";
import styles from "../../auth.module.css";

/** The callback's code is newRandomToken(): 64 hex characters. Anything else isn't ours. */
const CODE = /^[0-9a-f]{64}$/;

export default function DesktopHandoffPage() {
  return (
    <Suspense>
      <DesktopHandoff />
    </Suspense>
  );
}

function DesktopHandoff() {
  const code = useSearchParams().get("code") ?? "";
  const link = CODE.test(code) ? `trellis://auth?code=${code}` : null;

  useEffect(() => {
    // The browser asks "Open Trellis?" the first time; the button below is the way back
    // if the student dismissed that.
    if (link) window.location.href = link;
  }, [link]);

  if (!link) {
    return (
      <>
        <h1 className={styles.h1}>This link isn&apos;t complete</h1>
        <p className={styles.lede}>Go back to the Trellis app and choose Continue with Google again.</p>
      </>
    );
  }

  return (
    <>
      <h1 className={styles.h1}>Opening Trellis…</h1>
      <p className={styles.lede}>
        You&apos;re signed in with Google. If your browser asks, allow it to open Trellis. You can close this tab
        afterwards.
      </p>
      <a href={link} className={`${ui.primary} ${styles.submit}`}>
        Open Trellis
      </a>
    </>
  );
}
