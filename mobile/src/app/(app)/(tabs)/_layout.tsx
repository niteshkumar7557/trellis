// The bottom tab bar: the web's sidebar (Map, Check-ins, Settings) as a phone shows it, plus
// the helper, which on the web sits beside the map and on a phone needs its own room
// (docs/mobile.md §5). Colours from the tokens: the frame's ground, ink for the current tab.

import { Tabs } from "expo-router";
import { Icon, type IconName } from "@/ui/Icon";
import { useTheme } from "@/theme/theme";
import { font } from "@/theme/type";

const icon = (name: IconName) =>
  function TabIcon({ focused }: { focused: boolean }) {
    return <Icon name={name} size={20} tone={focused ? "text" : "faint"} />;
  };

export default function TabsLayout() {
  const { c } = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.text,
        tabBarInactiveTintColor: c.faint,
        tabBarStyle: { backgroundColor: c.ground, borderTopColor: c.border },
        tabBarLabelStyle: { fontFamily: font[500], fontSize: 12 },
        sceneStyle: { backgroundColor: c.ground },
      }}
    >
      <Tabs.Screen name="map" options={{ title: "Map", tabBarIcon: icon("map") }} />
      <Tabs.Screen name="helper" options={{ title: "Helper", tabBarIcon: icon("chat") }} />
      <Tabs.Screen name="check-ins" options={{ title: "Check-ins", tabBarIcon: icon("journal") }} />
      <Tabs.Screen name="settings" options={{ title: "Settings", tabBarIcon: icon("settings") }} />
    </Tabs>
  );
}
