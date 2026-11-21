// Start: pick a subject and a goal (the web's /start, the same words and rules). Only
// subjects the student hasn't started are listed: changing the goal of one already started
// happens on its map.

import { bigTopicsOf, goalsOf, subjects, subtopicsOf } from "@shared/data";
import { requiredFor } from "@shared/graph";
import type { Subject, SubjectId } from "@shared/types";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { RequestSubject } from "@/start/RequestSubject";
import { useStore } from "@/store/store";
import { useTheme } from "@/theme/theme";
import { Button } from "@/ui/Button";
import { Choice } from "@/ui/Choice";
import { Frame } from "@/ui/Frame";
import { T } from "@/ui/Text";
import { TopBar } from "@/ui/TopBar";

export default function Start() {
  const { goalIds, subjectId: current } = useStore();
  // Fixed when the screen opens: choosing a goal starts the subject, and it shouldn't
  // vanish from the list in the moment before the sort opens.
  const [fresh] = useState(() => subjects.filter((s) => !goalIds[s.id]));
  const startedAny = fresh.length < subjects.length;

  if (!fresh.length) {
    return (
      <Frame header={<TopBar title="Start" back />}>
        <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
          <T size="figure" weight={600}>
            You’ve started every subject
          </T>
          <T size="lede" tone="muted">
            Trellis has reviewed maps for {subjects.map((s) => s.name).join(" and ")} so far, and they’re all on your map. Tell us what you’d like next.
          </T>
          <RequestSubject />
        </ScrollView>
      </Frame>
    );
  }
  const first = fresh.find((s) => s.id === current)?.id ?? fresh[0]!.id;
  return <Pick fresh={fresh} first={first} startedAny={startedAny} />;
}

function Pick({ fresh, first, startedAny }: { fresh: Subject[]; first: SubjectId; startedAny: boolean }) {
  const { act } = useStore();
  const { c } = useTheme();
  const [subjectId, setSubjectId] = useState<SubjectId>(first);
  const [goalId, setGoalId] = useState(goalsOf(first)[0]!.id);
  const [busy, setBusy] = useState(false);

  const goals = goalsOf(subjectId);
  const goal = goals.find((g) => g.id === goalId) ?? goals[0]!;
  const required = useMemo(() => requiredFor(goal), [goal]);
  const subs = subtopicsOf(subjectId);
  const toLearn = subs.filter((t) => required.has(t.id)).length;
  const areas = bigTopicsOf(subjectId).filter((t) => required.has(t.id)).length;

  return (
    <Frame header={<TopBar title={startedAny ? "Add a subject" : "Start"} back={startedAny} />}>
      <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
        <View style={{ gap: 8 }}>
          <T size="figure" weight={600}>
            {startedAny ? "What else are you learning?" : "What are you learning?"}
          </T>
          <T size="lede" tone="muted">
            Pick a subject and what you want to be able to do. Trellis works out the rest of the route.
          </T>
        </View>

        <View accessibilityRole="radiogroup" accessibilityLabel="Subject" style={styles.list}>
          {fresh.map((s) => (
            <Choice
              key={s.id}
              label={s.name}
              on={s.id === subjectId}
              onPress={() => {
                setSubjectId(s.id);
                setGoalId(goalsOf(s.id)[0]!.id);
              }}
            >
              <T size="section" weight={600}>
                {s.name}
              </T>
              <T tone="muted">{s.blurb}</T>
              <T size="small" tone="faint" tabular>
                {bigTopicsOf(s.id).length} big topics · {subtopicsOf(s.id).length} inside
              </T>
            </Choice>
          ))}
        </View>

        <RequestSubject />

        <View accessibilityRole="radiogroup" accessibilityLabel="Your goal" style={styles.list}>
          <T size="section" weight={600}>
            Your goal
          </T>
          {goals.map((g) => {
            const n = subs.filter((t) => requiredFor(g).has(t.id)).length;
            return (
              <Choice key={g.id} label={g.name} on={g.id === goal.id} onPress={() => setGoalId(g.id)}>
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

        <View style={[styles.figures, { backgroundColor: c.raised }]}>
          <View>
            <T size="figure" weight={600} tabular>
              {toLearn}
            </T>
            <T size="small" tone="muted">
              topics to learn
            </T>
          </View>
          <View>
            <T size="figure" weight={600} tabular tone="faint">
              {subs.length - toLearn}
            </T>
            <T size="small" tone="muted">
              you can skip
            </T>
          </View>
        </View>

        <View style={{ gap: 8 }}>
          <Button
            kind="primary"
            label="Sort the big topics"
            trailing="forward"
            disabled={busy}
            onPress={async () => {
              setBusy(true);
              const ok = await act.setGoal(subjectId, goal.id);
              setBusy(false);
              if (ok) router.push("/start/sort");
            }}
          />
          <T size="small" tone="muted">
            {areas} cards, about a minute. You can change your goal any time.
          </T>
        </View>
      </ScrollView>
    </Frame>
  );
}

const styles = StyleSheet.create({
  page: { padding: 20, gap: 24, paddingBottom: 40 },
  list: { gap: 8 },
  goalRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  figures: { flexDirection: "row", gap: 32, padding: 16, borderRadius: 8 },
});
