// Light and dark (docs/mobile.md §6). The phone's setting decides, unless the student chose
// Light or Dark in Settings; that choice is kept on the phone (AsyncStorage: it's not a
// secret, so it doesn't need the Keystore).
//
// Screens call useTheme() and read colours from `c`, never hex. The web does the same with
// CSS variables; React Native has none, so the current scheme's tokens are passed down
// through React context instead.

import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useColorScheme } from "react-native";
import { tokens, type Tokens } from "./tokens";

export type ThemePref = "system" | "light" | "dark";
type Scheme = "light" | "dark";

interface Theme {
  c: Tokens;
  scheme: Scheme;
  pref: ThemePref;
  setPref: (pref: ThemePref) => void;
}

const KEY = "trellis.theme";
const ThemeContext = createContext<Theme | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [pref, setPrefState] = useState<ThemePref>("system");

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((saved) => {
        if (saved === "light" || saved === "dark" || saved === "system") setPrefState(saved);
      })
      .catch(() => undefined); // no saved choice: follow the phone
  }, []);

  const value = useMemo<Theme>(() => {
    const scheme: Scheme = pref === "system" ? (system === "dark" ? "dark" : "light") : pref;
    return {
      c: tokens[scheme],
      scheme,
      pref,
      setPref: (next) => {
        setPrefState(next);
        AsyncStorage.setItem(KEY, next).catch(() => undefined);
      },
    };
  }, [pref, system]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const theme = useContext(ThemeContext);
  if (!theme) throw new Error("useTheme needs <ThemeProvider> above it (src/app/_layout.tsx)");
  return theme;
}
