// The error toast: a failed request's message, at the top over any screen, gone after a few
// seconds or on a tap. The web shows the same message in an error bar (Shell.tsx).

import { useEffect } from "react";
import { Pressable, StyleSheet } from "react-native";
import Animated, { FadeInUp, FadeOutUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useStore } from "@/store/store";
import { useTheme } from "@/theme/theme";
import { T } from "./Text";

export function Toast() {
  const { error, clearError } = useStore();
  const { c } = useTheme();
  const inset = useSafeAreaInsets();

  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(clearError, 5000);
    return () => clearTimeout(timer);
  }, [error, clearError]);

  if (!error) return null;
  return (
    // Reanimated's entering/exiting animations run on the UI thread; it skips them when the
    // phone's "Remove animations" setting is on.
    <Animated.View entering={FadeInUp} exiting={FadeOutUp} style={[styles.wrap, { top: inset.top + 8 }]} pointerEvents="box-none">
      <Pressable accessibilityRole="alert" onPress={clearError} style={[styles.toast, { backgroundColor: c.stuckBg, borderColor: c.stuck }]}>
        <T tone="stuckInk">{error}</T>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", left: 16, right: 16, zIndex: 10 },
  toast: { padding: 12, borderRadius: 8, borderWidth: 1 },
});
