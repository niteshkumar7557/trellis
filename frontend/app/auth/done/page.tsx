"use client";

// Where Google sign-in lands (/api/auth/google/callback redirects here with the refresh
// cookie set). The store's start-up refresh turns that cookie into an access token and
// loads the record; this page only waits for it and sends the student on.

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useStore } from "@/lib/store";

export default function AuthDone() {
  const router = useRouter();
  const { mode, goalIds } = useStore();

  useEffect(() => {
    if (mode === "loading") return;
    if (mode === "demo") router.replace("/login?error=google");
    else router.replace(Object.keys(goalIds).length ? "/map" : "/start");
  }, [mode, goalIds, router]);

  return <main aria-busy="true" aria-label="Signing you in" />;
}
