// The root of the app: every screen renders inside this (Expo Router's root layout, like
// Next's app/layout.tsx). Outermost first:
//   - GestureHandlerRootView: swipes (the sort's cards, swipe-to-delete) need it at the top;
//   - SafeAreaProvider: the app draws edge to edge (under the status and navigation bars,
//     as Android 15+ expects), and screens ask it how far to keep clear of them;
//   - ThemeProvider: light or dark tokens; StoreProvider: who's signed in, and the record.
//
// Which screens EXIST depends on the store's mode, with Expo Router's protected routes
// (Stack.Protected): signed out, only Log in and Sign up; offline, only "Can't reach
// Trellis"; signed in, the app. A screen whose guard turns false is removed and the router
// moves to one that's allowed, so signing out from Settings lands on Log in by itself, and
// no screen has to check "am I signed in?".

import { SplashScreen, Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StoreProvider, useStore } from "@/store/store";
import { ThemeProvider, useTheme } from "@/theme/theme";
import { Toast } from "@/ui/Toast";

// Keep the splash screen (the mark on the frame colour) up until we know who's signed in,
// instead of flashing Log in at a student who is.
SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <StoreProvider>
            <Screens />
            <Toast />
          </StoreProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function Screens() {
  const { c, scheme } = useTheme();
  const { mode } = useStore();

  useEffect(() => {
    if (mode !== "loading") SplashScreen.hideAsync().catch(() => undefined);
  }, [mode]);

  if (mode === "loading") return null; // the splash is still showing

  return (
    <>
      {/* Dark icons on the light frame, light icons on the dark one. */}
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.ground }, animation: "slide_from_right" }}>
        {/* "/" exists in every mode and sends the student on (index.tsx). */}
        <Stack.Screen name="index" />
        <Stack.Protected guard={mode === "live"}>
          <Stack.Screen name="(app)" />
        </Stack.Protected>
        <Stack.Protected guard={mode === "signed-out"}>
          <Stack.Screen name="login" />
          <Stack.Screen name="signup" options={{ animation: "fade" }} />
        </Stack.Protected>
        <Stack.Protected guard={mode === "offline"}>
          <Stack.Screen name="offline" />
        </Stack.Protected>
        {/* trellis://auth?code=… also reaches the router; the sign-in itself is finished by
            openAuthSessionAsync (src/lib/google.ts), so this screen only steps aside. */}
        <Stack.Screen name="auth" />
      </Stack>
    </>
  );
}
