"use client";

import { useCallback, useSyncExternalStore } from "react";

const THEME_STORAGE_KEY = "kero-theme";

const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function getSnapshot(): boolean {
  return window.localStorage.getItem(THEME_STORAGE_KEY) === "dark";
}

function getServerSnapshot(): boolean {
  return false;
}

export function useTheme() {
  const darkMode = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const toggleTheme = useCallback(() => {
    const next =
      window.localStorage.getItem(THEME_STORAGE_KEY) !== "dark";
    window.localStorage.setItem(THEME_STORAGE_KEY, next ? "dark" : "light");
    emit();
  }, []);

  return { darkMode, toggleTheme };
}
