// The sort (the web's /start/sort): one card per big topic on the goal's route, answered
// "I know it", "Shaky" or "New to me". Swipe the card or tap a button (SwipeCard.tsx).
// /start/sort?only=unsorted (from the map, after a goal change) deals only the big topics
// never sorted, so changing goal doesn't mean sorting everything again.

import { kids, shortcutsOf, subjectById, topicById } from "@shared/data";
import { needsOf, summarise, unsortedAreas } from "@shared/graph";
import type { ClaimKind } from "@shared/types";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SwipeCard, type SwipeCardHandle } from "@/start/SwipeCard";
import { useStore } from "@/store/store";
import { useTheme } from "@/theme/theme";
import { Button } from "@/ui/Button";
import { Frame } from "@/ui/Frame";
import { StatusMark } from "@/ui/Status";
import { T } from "@/ui/Text";
import { TopBar } from "@/ui/TopBar";

const CHOICES: { kind: ClaimKind; label: string; hint: string }[] = [
  { kind: "know", label: "I know it", hint: "swipe left" },
  { kind: "shaky", label: "Shaky", hint: "swipe up" },
  { kind: "new", label: "New to me", hint: "swipe right" },
];

export default function Sort() {
  const { only } = useLocalSearchParams<{ only?: string }>();
  const onlyUnsorted = only === "unsorted";
  const { goal, statuses, claims, act } = useStore();
  const { c } = useTheme();
  const card = useRef<SwipeCardHandle>(null);

  // One-tap answers ("I already know React") before the first card; not on the
  // "only unsorted" pass, where the student has answered them once already.
  const shortcuts = goal && !onlyUnsorted ? shortcutsOf(goal.subjectId) : [];
  const [chosen, setChosen] = useState<string[]>([]);
  const known = useMemo(() => new Set(shortcuts.filter((s) => chosen.includes(s.id)).flatMap((s) => s.topics)), [chosen.join(","), goal?.subjectId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Dealt once per goal (and again only when a shortcut changes, which can happen before
  // the first answer only): answering must not reshuffle the deck.
  const deck = useMemo(() => {
    if (!goal) return [];
    if (onlyUnsorted) return unsortedAreas(goal, claims);
    return summarise(goal, statuses).areas.filter((t) => !known.has(t.id));
  }, [goal?.id, onlyUnsorted, known]); // eslint-disable-line react-hooks/exhaustive-deps

  const [answers, setAnswers] = useState<ClaimKind[]>([]);
  const [busy, setBusy] = useState(false);
  const index = answers.length;
  const topic = deck[index];
  const done = deck.length > 0 && index >= deck.length;
  const shown = Math.min(index, deck.length);

  if (!goal) {
    router.replace("/start");
    return null;
  }

  const count = (k: ClaimKind) => answers.filter((a) => a === k).length;
  const finish = async () => {
    setBusy(true);
    const ok = await act.addClaims([
      // What a shortcut marks comes first, so a card's own answer (sent after) wins.
      ...[...known].map((topicId) => ({ topicId, claim: "know" as const })),
      ...deck.map((t, i) => ({ topicId: t.id, claim: answers[i]! })),
    ]);
    setBusy(false);
    if (ok) router.replace("/map");
  };

  return (
    <Frame header={<TopBar title={goal.name} back />}>
      <ScrollView contentContainerStyle={styles.page}>
        <View style={{ gap: 8 }}>
          <T size="title" weight={600}>
            {done ? "Your map is ready" : "How well do you know these big topics?"}
          </T>
          <T tone="muted">
            {done
              ? "Trellis believes you, loosely. It starts small: each big topic opens into its smaller topics when you reach it."
              : "Go with your first instinct; nothing here is a test."}
          </T>
          <View style={styles.progress} accessibilityLabel={`${shown} of ${deck.length} sorted`}>
            <View style={[styles.track, { backgroundColor: c.active }]}>
              <View style={[styles.fill, { backgroundColor: c.text, width: `${deck.length ? (shown / deck.length) * 100 : 0}%` }]} />
            </View>
            <T size="small" tone="muted" tabular>
              {shown} of {deck.length}
            </T>
          </View>
        </View>

        {!done && index === 0 && shortcuts.length > 0 && (
          <View style={{ gap: 8 }}>
            {shortcuts.map((s) => {
              const on = chosen.includes(s.id);
              return (
                <Pressable
                  key={s.id}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on }}
                  accessibilityLabel={s.label}
                  onPress={() => setChosen((x) => (on ? x.filter((id) => id !== s.id) : [...x, s.id]))}
                  style={[styles.shortcut, { borderColor: on ? c.text : c.border, backgroundColor: on ? c.raised : c.surface }]}
                >
                  <StatusMark status={on ? "know" : "new"} size={14} />
                  <View style={{ flex: 1 }}>
                    <T weight={500}>{s.label}</T>
                    <T size="small" tone="muted">
                      {s.note}
                    </T>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}

        {!done && topic && (
          <>
            <SwipeCard ref={card} onChoose={(kind) => setAnswers((a) => [...a, kind])} key={topic.id}>
              <T size="small" tone="muted">
                {subjectById.get(topic.subjectId)!.shortName} · <T size="small" tone="muted" tabular>{kids(topic.id).length}</T> topics inside
              </T>
              <T size="title" weight={600}>
                {topic.name}
              </T>
              <T size="lede">{topic.summary}</T>
              <T size="small" tone="muted">
                {needsOf(topic.id).length ? `Builds on ${needsOf(topic.id).map((id) => topicById.get(id)!.name).join(", ")}` : "Where the subject starts: nothing comes before it."}
              </T>
            </SwipeCard>

            <View style={styles.choices}>
              {CHOICES.map((choice) => (
                <Pressable
                  key={choice.kind}
                  accessibilityRole="button"
                  accessibilityLabel={choice.label}
                  onPress={() => card.current?.fling(choice.kind)}
                  style={({ pressed }) => [styles.choice, { borderColor: c.control, backgroundColor: pressed ? c.raised : c.surface }]}
                >
                  <StatusMark status={choice.kind} size={12} />
                  <T weight={500}>{choice.label}</T>
                  <T size="small" tone="faint">
                    {choice.hint}
                  </T>
                </Pressable>
              ))}
            </View>
            <Button kind="ghost" icon="back" label="Previous topic" disabled={index === 0} onPress={() => setAnswers((a) => a.slice(0, -1))} />
          </>
        )}

        {done && (
          <View style={{ gap: 20 }}>
            <View style={[styles.result, { backgroundColor: c.raised }]}>
              {(
                [
                  ["know", "You know"],
                  ["shaky", "Shaky"],
                  ["new", "New to you"],
                ] as const
              ).map(([kind, label]) => (
                <View key={kind} style={{ gap: 4 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <StatusMark status={kind} />
                    <T size="small" tone="muted">
                      {label}
                    </T>
                  </View>
                  <T size="figure" weight={600} tabular>
                    {count(kind)}
                  </T>
                </View>
              ))}
            </View>
            <Button kind="primary" label={busy ? "One moment…" : "Open my map"} trailing="forward" disabled={busy} haptic="light" onPress={finish} />
            <Button kind="ghost" label="Change the last one" onPress={() => setAnswers((a) => a.slice(0, -1))} />
          </View>
        )}
      </ScrollView>
    </Frame>
  );
}

const styles = StyleSheet.create({
  page: { padding: 20, gap: 20, paddingBottom: 40 },
  progress: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 4 },
  track: { flex: 1, height: 4, borderRadius: 2, overflow: "hidden" },
  fill: { height: 4 },
  shortcut: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderRadius: 8, padding: 14 },
  choices: { flexDirection: "row", gap: 8 },
  choice: { flex: 1, minHeight: 64, borderWidth: 1, borderRadius: 8, alignItems: "center", justifyContent: "center", gap: 2, paddingVertical: 8 },
  result: { flexDirection: "row", justifyContent: "space-between", padding: 16, borderRadius: 8 },
});
