// "/", where the app opens, and where trellis://auth steps back to. It's the one route that
// exists in every mode, outside the guards in _layout.tsx, and it only sends the student on.
//
// Why it lives here and not inside (app): found on the emulator (21 Nov 2026). With "/"
// only inside the signed-in group, a signed-out start asked the router for a screen that
// was guarded off, and it redirected forever ("Maximum update depth exceeded").
// test/routes.test.tsx pins it.

import { Redirect } from "expo-router";
import { useStore } from "@/store/store";

export default function Gate() {
  const { mode, goalIds } = useStore();
  if (mode === "signed-out") return <Redirect href="/login" />;
  if (mode === "offline") return <Redirect href="/offline" />;
  if (mode === "live") return <Redirect href={Object.keys(goalIds).length ? "/map" : "/start"} />;
  return null; // loading: the splash screen is still up
}
