// The sort's card, which a finger can throw (docs/mobile.md §7): left = I know it,
// right = New to me, up = Shaky. The same directions the web's card flies off in when a
// button is pressed (start/sort/page.tsx), so the two feel like one product.
//
// How it works: a Pan gesture (react-native-gesture-handler) moves the card, and Reanimated
// runs that movement on the UI thread, so the card follows the finger at the screen's
// frame rate even while JavaScript is busy. Let go past the threshold and the card flies
// off, then `onChoose` runs back on the JavaScript thread (scheduleOnRN). Short of the
// threshold it springs back. The buttons below the card do the same without a gesture.

import type { ClaimKind } from "@shared/types";
import * as Haptics from "expo-haptics";
import { forwardRef, useEffect, useImperativeHandle, type ReactNode } from "react";
import { StyleSheet, useWindowDimensions } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { interpolate, ReduceMotion, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { useTheme } from "@/theme/theme";
import { radius } from "@/theme/type";

export interface SwipeCardHandle {
  /** Throw the card as if swiped (the buttons call this). */
  fling: (kind: ClaimKind) => void;
}

interface Props {
  children: ReactNode;
  onChoose: (kind: ClaimKind) => void;
}

/** How far a drag must go before letting go counts as a choice. */
const THRESHOLD = 110;

export const SwipeCard = forwardRef<SwipeCardHandle, Props>(function SwipeCard({ children, onChoose }, ref) {
  const { c } = useTheme();
  const { width } = useWindowDimensions();
  const reduce = useReducedMotion();
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const shown = useSharedValue(0);

  // Each new card settles in from below (the web's 28px rise), unless motion is reduced.
  useEffect(() => {
    x.value = 0;
    y.value = reduce ? 0 : 28;
    shown.value = reduce ? 1 : 0;
    y.value = withTiming(0, { duration: 380, reduceMotion: ReduceMotion.System });
    shown.value = withTiming(1, { duration: 380, reduceMotion: ReduceMotion.System });
  }, [children, reduce, shown, x, y]);

  const choose = (kind: ClaimKind) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    onChoose(kind);
  };

  const fling = (kind: ClaimKind) => {
    "worklet";
    const toX = kind === "know" ? -width : kind === "new" ? width : 0;
    const toY = kind === "shaky" ? -600 : -40;
    x.value = withTiming(toX, { duration: 240, reduceMotion: ReduceMotion.System });
    y.value = withTiming(toY, { duration: 240, reduceMotion: ReduceMotion.System }, (finished) => {
      if (finished) scheduleOnRN(choose, kind);
    });
  };

  useImperativeHandle(ref, () => ({ fling: (kind) => (reduce ? choose(kind) : fling(kind)) }));

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      x.value = e.translationX;
      y.value = Math.min(e.translationY, 40); // it can go up a long way, down only a little
    })
    .onEnd((e) => {
      if (e.translationX < -THRESHOLD) fling("know");
      else if (e.translationX > THRESHOLD) fling("new");
      else if (e.translationY < -THRESHOLD) fling("shaky");
      else {
        x.value = withSpring(0);
        y.value = withSpring(0);
      }
    });

  const style = useAnimatedStyle(() => ({
    opacity: shown.value,
    transform: [{ translateX: x.value }, { translateY: y.value }, { rotate: `${interpolate(x.value, [-width, width], [-12, 12])}deg` }],
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }, style]}>{children}</Animated.View>
    </GestureDetector>
  );
});

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: radius.sheet, padding: 22, gap: 10, minHeight: 240 },
});
