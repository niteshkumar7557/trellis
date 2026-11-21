// The root of the app: every screen renders inside this (Expo Router's root layout, like
// Next's app/layout.tsx). It sets up, outermost first:
//   - GestureHandlerRootView: swipe gestures (swipe-to-delete, the sheet's drag) need it at
//     the top of the tree;
//   - SafeAreaProvider: the app draws edge to edge (under the status and navigation bars,
//     as Android 15+ expects), and screens ask it how far to stay clear of them;
//   - ThemeProvider: light or dark tokens for every screen;
//   - the Stack: screens slide in over each other, with the system back gesture.

import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ThemeProvider, useTheme } from "@/theme/theme";

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <Screens />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function Screens() {
  const { c, scheme } = useTheme();
  return (
    <>
      {/* Dark icons on the light frame, light icons on the dark one. */}
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.ground } }} />
    </>
  );
}
