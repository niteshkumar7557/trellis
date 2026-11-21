// Switch subject or goal: a bottom sheet from the map's header. The web has a goal dropdown
// (GoalPicker.tsx) and the subjects in its sidebar; a phone has room for neither, so both
// live here. A subject with no goal yet starts on Start.

import { goalsOf, subjects, subtopicsOf } from "@shared/data";
import { requiredFor } from "@shared/graph";
import { router } from "expo-router";
import { ScrollView, StyleSheet, View } from "react-native";
import { useStore } from "@/store/store";
import { useTheme } from "@/theme/theme";
import { Button } from "@/ui/Button";
import { Choice } from "@/ui/Choice";
import { T } from "@/ui/Text";

export default function Switch() {
  const { subjectId, goalIds, goal, act } = useStore();
  const { c } = useTheme();
  const started = subjects.filter((s) => goalIds[s.id]);
  const subs = subtopicsOf(subjectId);

  return (
    <ScrollView style={{ backgroundColor: c.surface }} contentContainerStyle={styles.page}>
      <T size="section" weight={600}>
        Subject
      </T>
      <View accessibilityRole="radiogroup" style={styles.list}>
        {started.map((s) => (
          <Choice key={s.id} label={s.name} on={s.id === subjectId} onPress={() => act.setSubject(s.id)}>
            <T weight={600}>{s.name}</T>
            <T size="small" tone="muted">
              {s.blurb}
            </T>
          </Choice>
        ))}
        {started.length < subjects.length && (
          <Button
            label="Add a subject"
            icon="forward"
            onPress={() => {
              router.back();
              router.push("/start");
            }}
          />
        )}
      </View>

      {goalIds[subjectId] && (
        <>
          <T size="section" weight={600}>
            Goal
          </T>
          <View accessibilityRole="radiogroup" style={styles.list}>
            {goalsOf(subjectId).map((g) => {
              const n = subs.filter((t) => requiredFor(g).has(t.id)).length;
              return (
                <Choice key={g.id} label={g.name} on={g.id === goal?.id} onPress={() => void act.setGoal(subjectId, g.id)}>
                  <View style={styles.goalRow}>
                    <View style={{ flex: 1, gap: 2 }}>
                      <T weight={500}>{g.name}</T>
                      <T size="small" tone="muted">
                        {g.blurb}
                      </T>
                    </View>
                    <T weight={600} tabular>
                      {n}
                      <T size="small" tone="faint">
                        {" "}
                        of {subs.length}
                      </T>
                    </T>
                  </View>
                </Choice>
              );
            })}
          </View>
          <T size="small" tone="muted">
            Changing goal keeps everything you’ve done; only what’s needed changes.
          </T>
        </>
      )}
      <Button kind="primary" label="Done" onPress={() => router.back()} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 20, paddingTop: 28, gap: 14, paddingBottom: 40 },
  list: { gap: 8 },
  goalRow: { flexDirection: "row", alignItems: "center", gap: 12 },
});
