"use client";

import { useEffect, useSyncExternalStore, type ReactNode } from "react";

export type ThemePref = "system" | "light" | "dark";
const KEY = "trellis-theme";

/** Runs before first paint (inlined in the root layout) so a dark visitor never sees a flash. */
export const themeScript = `(function(){try{var p=localStorage.getItem("${KEY}")||"system";var d=p==="dark"||(p==="system"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.dataset.theme=d?"dark":"light";}catch(e){document.documentElement.dataset.theme="light";}})();`;

// The saved preference lives in localStorage; this small store lets components follow it.
const listeners = new Set<() => void>();

function readPref(): ThemePref {
  try {
    return (localStorage.getItem(KEY) as ThemePref) || "system";
  } catch {
    return "system";
  }
}

function subscribePref(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

function apply(pref: ThemePref) {
  const dark = pref === "dark" || (pref === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
}

/** Keeps the page in step with the system while the preference is "system". */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const pref = useSyncExternalStore(subscribePref, readPref, () => "system" as ThemePref);
  useEffect(() => {
    apply(pref);
    if (pref !== "system") return;
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => apply("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [pref]);
  return children;
}

export function useTheme() {
  const pref = useSyncExternalStore(subscribePref, readPref, () => "system" as ThemePref);
  const setPref = (p: ThemePref) => {
    try {
      localStorage.setItem(KEY, p);
    } catch {}
    apply(p);
    listeners.forEach((l) => l());
  };
  return { pref, setPref };
}

function subscribeResolved(onChange: () => void) {
  const mo = new MutationObserver(onChange);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => mo.disconnect();
}

/** The theme actually on screen, light or dark. */
export function useResolvedTheme(): "light" | "dark" {
  return useSyncExternalStore(
    subscribeResolved,
    () => (document.documentElement.dataset.theme === "dark" ? "dark" : "light"),
    () => "light",
  );
}
