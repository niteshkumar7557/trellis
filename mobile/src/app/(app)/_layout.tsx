// The signed-in app: the tabs, Start and the sort, and the topic sheet.
//
// The topic opens as a "form sheet" (docs/mobile.md §7): it slides up over the map, stops at
// 60% or full height, and drags down to close, the phone's version of the web's sheet over
// the map. react-native-screens draws it as a native Android bottom sheet.

import { Stack } from "expo-router";
import { useTheme } from "@/theme/theme";

export default function AppLayout() {
  const { c } = useTheme();
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.ground }, animation: "slide_from_right" }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="start/index" />
      <Stack.Screen name="start/sort" />
      <Stack.Screen name="search" options={{ animation: "fade_from_bottom" }} />
      <Stack.Screen
        name="switch"
        options={{ presentation: "formSheet", sheetAllowedDetents: "fitToContents", sheetGrabberVisible: true, sheetCornerRadius: 16, contentStyle: { backgroundColor: c.surface } }}
      />
      <Stack.Screen
        name="topic/[id]"
        options={{
          presentation: "formSheet",
          sheetAllowedDetents: [0.6, 1],
          sheetGrabberVisible: true,
          sheetCornerRadius: 16,
          contentStyle: { backgroundColor: c.surface },
        }}
      />
    </Stack>
  );
}
