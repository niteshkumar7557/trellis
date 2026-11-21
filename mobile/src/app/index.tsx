// TEMPORARY (Task 2): the design system's pieces on one screen, to check the first build on
// the phone. Replaced by the start-up gate in Task 4.

import { goalById, subjects } from "@shared/data";
import { deriveStatuses, nextTopic } from "@shared/graph";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "@/ui/Button";
import { DifficultyTag } from "@/ui/Difficulty";
import { Mark } from "@/ui/Mark";
import { Segmented } from "@/ui/Segmented";
import { StatusMark, StatusPill } from "@/ui/Status";
import { T } from "@/ui/Text";
import { useTheme } from "@/theme/theme";

export default function DesignCheck() {
  const { c, pref, setPref } = useTheme();
  const inset = useSafeAreaInsets();
  const goal = [...goalById.values()][0]!;
  const next = nextTopic(goal, deriveStatuses([], []));
  return (
    <ScrollView style={{ backgroundColor: c.ground }} contentContainerStyle={{ paddingTop: inset.top + 12, padding: 8, paddingBottom: inset.bottom + 8 }}>
      <View style={{ backgroundColor: c.surface, borderColor: c.border, borderWidth: 1, borderRadius: 16, padding: 20, gap: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Mark size={22} />
          <T size="section" weight={600}>Trellis</T>
        </View>
        <T size="title" weight={600}>Design check</T>
        <T tone="muted">{subjects.map((s) => s.name).join(", ")} · next for “{goal.name}”: {next?.name}</T>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {(["done", "learning", "stuck", "shaky", "know", "new"] as const).map((s) => <StatusPill key={s} status={s} />)}
        </View>
        <View style={{ flexDirection: "row", gap: 16 }}>
          <DifficultyTag level="easy" />
          <DifficultyTag level="medium" />
          <DifficultyTag level="hard" />
        </View>
        <Button kind="primary" label="Copy" icon="copy" haptic="light" />
        <Button label="ChatGPT" trailing="external" />
        <Button kind="ghost" label="Ghost" />
        <Button kind="danger" label="Delete everything" haptic="warning" />
        <Button kind="primary" label="Disabled" disabled />
        <Segmented
          value={null}
          onChange={() => undefined}
          options={[
            { value: "got", label: "Got it", mark: <StatusMark status="done" /> },
            { value: "partly", label: "Partly", mark: <StatusMark status="learning" /> },
            { value: "stuck", label: "Stuck", mark: <StatusMark status="stuck" /> },
          ]}
        />
        <Segmented value={pref} onChange={setPref} options={[{ value: "system", label: "System" }, { value: "light", label: "Light" }, { value: "dark", label: "Dark" }]} />
      </View>
    </ScrollView>
  );
}
