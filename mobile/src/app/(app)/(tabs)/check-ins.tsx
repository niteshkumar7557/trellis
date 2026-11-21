// The Check-ins tab (the web's /check-ins, the same words): every update to the map and
// what the student said about it, newest first, by day. Tap one to change how it went or
// its words; swipe it left to delete (docs/mobile.md §7). The map and the prompts are
// worked out from these, so a change here changes them.

import { subjectById, subjects, topicById } from "@shared/data";
import { relativeDay } from "@shared/graph";
import type { CheckIn, Outcome, SubjectId } from "@shared/types";
import * as Haptics from "expo-haptics";
import { useMemo, useState } from "react";
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, TextInput, View } from "react-native";
import Swipeable from "react-native-gesture-handler/ReanimatedSwipeable";
import { useStore } from "@/store/store";
import { useTheme } from "@/theme/theme";
import { font } from "@/theme/type";
import { Button } from "@/ui/Button";
import { Frame } from "@/ui/Frame";
import { Icon } from "@/ui/Icon";
import { Mark } from "@/ui/Mark";
import { Segmented } from "@/ui/Segmented";
import { StatusMark, StatusPill } from "@/ui/Status";
import { T } from "@/ui/Text";

const OUTCOME_STATUS = { got: "done", partly: "learning", stuck: "stuck" } as const;
const KIND_LABEL = { easy: "Felt easy", hard: "Was hard", clicked: "Made it click" } as const;

export default function CheckIns() {
  const { checkIns, experiences, today, act } = useStore();
  const { c } = useTheme();
  const [filter, setFilter] = useState<SubjectId | "all">("all");
  const [editing, setEditing] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  /** A check-in's notes: from the same helper message (the web's rule). */
  const notesFor = (x: CheckIn) => experiences.filter((e) => x.messageId && e.messageId === x.messageId);

  const shown = useMemo(
    () => [...checkIns].filter((x) => filter === "all" || topicById.get(x.topicId)?.subjectId === filter).sort((a, b) => b.at.localeCompare(a.at)),
    [checkIns, filter],
  );
  const days = useMemo(() => {
    const out: { day: string; items: CheckIn[] }[] = [];
    for (const x of shown) {
      const day = x.at.slice(0, 10);
      const last = out.at(-1);
      if (last?.day === day) last.items.push(x);
      else out.push({ day, items: [x] });
    }
    return out;
  }, [shown]);
  const stuckCount = shown.filter((x) => x.outcome === "stuck").length;

  const confirmDelete = (x: CheckIn) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
    Alert.alert("Delete this check-in?", "Your map and prompts are worked out again without it. This can't be undone.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => void act.removeCheckIn(x.id) },
    ]);
  };

  return (
    <Frame
      bottomInset={false}
      header={
        <View style={styles.top}>
          <Mark size={20} />
          <T size="section" weight={600}>
            Check-ins
          </T>
        </View>
      }
    >
      <ScrollView
        contentContainerStyle={styles.page}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            colors={[c.accent]}
            onRefresh={async () => {
              setRefreshing(true);
              await act.reload();
              setRefreshing(false);
            }}
          />
        }
      >
        <T tone="muted">Every update to your map, and what you said about how it went, newest first. Your map and your prompts are worked out from these, so changing one here changes them.</T>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <Segmented value={filter} onChange={setFilter} options={[{ value: "all" as const, label: "All" }, ...subjects.map((s) => ({ value: s.id, label: s.shortName }))]} />
        </ScrollView>
        <T size="small" tone="muted" tabular>
          {shown.length} {shown.length === 1 ? "check-in" : "check-ins"} · {stuckCount} where you got stuck
        </T>

        {days.length === 0 && <T tone="muted">No check-ins yet. Tell the helper what you studied.</T>}

        {days.map(({ day, items }) => (
          <View key={day} style={{ gap: 6 }}>
            <View style={styles.dayTitle}>
              <T weight={600}>{relativeDay(day, today)}</T>
              <T size="small" tone="muted">
                {new Date(day + "T12:00:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
              </T>
            </View>
            {items.map((x) =>
              editing === x.id ? (
                <Editor key={x.id} checkIn={x} onCancel={() => setEditing(null)} onSave={(next) => (void act.editCheckIn(next), setEditing(null))} />
              ) : (
                <Swipeable
                  key={x.id}
                  friction={2}
                  rightThreshold={60}
                  renderRightActions={() => (
                    <Pressable accessibilityRole="button" accessibilityLabel="Delete this check-in" onPress={() => confirmDelete(x)} style={[styles.delete, { backgroundColor: c.stuck }]}>
                      <Icon name="trash" tone="onPrimary" size={18} />
                      <T size="small" weight={600} tone="onPrimary">
                        Delete
                      </T>
                    </Pressable>
                  )}
                >
                  <Pressable
                    accessibilityRole="button"
                    accessibilityHint="Tap to edit, swipe left to delete"
                    onPress={() => setEditing(x.id)}
                    style={({ pressed }) => [styles.row, { backgroundColor: pressed ? c.raised : c.surface, borderColor: c.rule }]}
                  >
                    <T size="small" tone="faint" tabular style={styles.time}>
                      {new Date(x.at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                    </T>
                    <View style={{ flex: 1, gap: 4 }}>
                      <T>“{x.text}”</T>
                      <T size="small" tone="muted">
                        {topicById.get(x.topicId)?.name} · {topicById.get(topicById.get(x.topicId)?.parentId ?? "")?.name ?? subjectById.get(topicById.get(x.topicId)!.subjectId)?.shortName}
                      </T>
                      {notesFor(x).map((e) => (
                        <T key={e.id} size="small">
                          <T size="small" weight={600} tone="muted">
                            {KIND_LABEL[e.kind]}
                          </T>{" "}
                          “{e.text}”
                        </T>
                      ))}
                    </View>
                    <StatusPill status={OUTCOME_STATUS[x.outcome]} />
                  </Pressable>
                </Swipeable>
              ),
            )}
          </View>
        ))}
      </ScrollView>
    </Frame>
  );
}

function Editor({ checkIn, onSave, onCancel }: { checkIn: CheckIn; onSave: (c: CheckIn) => void; onCancel: () => void }) {
  const { c } = useTheme();
  const [outcome, setOutcome] = useState<Outcome>(checkIn.outcome);
  const [text, setText] = useState(checkIn.text);
  return (
    <View style={[styles.editor, { borderColor: c.control }]}>
      <T weight={600}>{topicById.get(checkIn.topicId)?.name}</T>
      <T size="small" weight={500} tone="muted">
        How it went
      </T>
      <Segmented
        stretch
        value={outcome}
        onChange={setOutcome}
        options={[
          { value: "got", label: "Got it", mark: <StatusMark status="done" size={8} /> },
          { value: "partly", label: "Partly", mark: <StatusMark status="learning" size={8} /> },
          { value: "stuck", label: "Stuck", mark: <StatusMark status="stuck" size={8} /> },
        ]}
      />
      <T size="small" weight={500} tone="muted">
        What you wrote
      </T>
      <TextInput
        multiline
        value={text}
        onChangeText={setText}
        accessibilityLabel="Your words"
        style={[styles.input, { borderColor: c.control, color: c.text, fontFamily: font[400] }]}
      />
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Button kind="primary" icon="check" label="Save" haptic="light" disabled={!text.trim()} style={{ flex: 1 }} onPress={() => onSave({ ...checkIn, outcome, text: text.trim() })} />
        <Button kind="ghost" label="Cancel" onPress={onCancel} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { height: 52, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16 },
  page: { padding: 16, gap: 14, paddingBottom: 32 },
  dayTitle: { flexDirection: "row", alignItems: "baseline", gap: 8, marginTop: 6 },
  row: { flexDirection: "row", alignItems: "flex-start", gap: 12, paddingVertical: 12, paddingHorizontal: 4, borderBottomWidth: 1 },
  time: { width: 40, paddingTop: 2 },
  delete: { width: 96, alignItems: "center", justifyContent: "center", gap: 4 },
  editor: { borderWidth: 1, borderRadius: 10, padding: 12, gap: 10 },
  input: { minHeight: 64, borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 14, textAlignVertical: "top" },
});
