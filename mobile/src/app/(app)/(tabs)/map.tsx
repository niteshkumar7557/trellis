// The Map tab: the web's /map for a phone (docs/mobile.md §5). The header says where you are
// (subject and goal, tap to switch), the findings (stuck, next) and three figures; below it,
// the route as a list. Pull down to load the record again. Every rule is shared/graph.ts's.

import { subjectById, topicById } from "@shared/data";
import { nextTopic, revealed, statusOf, summarise, suspectsFor, unsortedAreas } from "@shared/graph";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { Findings } from "@/map/Findings";
import { RouteList } from "@/map/RouteList";
import { useStore } from "@/store/store";
import { useTheme } from "@/theme/theme";
import { Button } from "@/ui/Button";
import { Frame } from "@/ui/Frame";
import { Icon } from "@/ui/Icon";
import { Mark } from "@/ui/Mark";
import { T } from "@/ui/Text";

export default function MapScreen() {
  const { subjectId, goal, goalIds, statuses, claims, checkIns, experiences, opened, today, act, dispatch } = useStore();
  const { c } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const subject = subjectById.get(subjectId)!;

  const summary = useMemo(() => (goal ? summarise(goal, statuses) : null), [goal, statuses]);
  const next = useMemo(() => (goal ? nextTopic(goal, statuses) : null), [goal, statuses]);
  const open = useMemo(() => revealed(subjectId, statuses, checkIns, next?.id ?? null, opened, experiences), [subjectId, statuses, checkIns, next, opened, experiences]);
  const stuck = summary?.route.find((t) => statusOf(statuses, t.id) === "stuck") ?? null;
  const suspects = useMemo(() => (stuck ? suspectsFor(stuck.id, statuses, checkIns, experiences) : []), [stuck, statuses, checkIns, experiences]);

  const openTopic = (id: string) => {
    const t = topicById.get(id)!;
    if (t.subjectId !== subjectId) dispatch({ type: "subject", subjectId: t.subjectId });
    router.push({ pathname: "/topic/[id]", params: { id } });
  };

  const header = (
    <View style={styles.top}>
      <Mark size={20} />
      <Pressable accessibilityRole="button" accessibilityLabel={`Subject ${subject.name}, goal ${goal?.name ?? "none"}. Change`} onPress={() => router.push("/switch")} style={styles.switcher} hitSlop={6}>
        <T size="section" weight={600} numberOfLines={1} style={{ flexShrink: 1 }}>
          {Object.keys(goalIds).length ? subject.name : "Your map"}
        </T>
        <Icon name="chevron" tone="muted" />
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Search topics" onPress={() => router.push("/search")} hitSlop={10} style={styles.icon}>
        <Icon name="search" size={20} />
      </Pressable>
    </View>
  );

  if (!goal || !summary) {
    const none = Object.keys(goalIds).length === 0;
    return (
      <Frame header={header} bottomInset={false}>
        <View style={styles.page}>
          <T tone="muted">{none ? "You haven't picked a subject yet. Your map appears here once you do." : "You haven't picked a goal for this subject yet."}</T>
          <Button kind="primary" label={none ? "Pick a subject and a goal" : "Pick a goal and sort the topics"} trailing="forward" onPress={() => router.push("/start")} />
        </View>
      </Frame>
    );
  }

  const unsorted = unsortedAreas(goal, claims);
  const sortedBefore = claims.some((cl) => topicById.get(cl.topicId)?.subjectId === subjectId);

  return (
    <Frame header={header} bottomInset={false}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            colors={[c.accent]}
            progressBackgroundColor={c.surface}
            onRefresh={async () => {
              setRefreshing(true);
              await act.reload();
              setRefreshing(false);
            }}
          />
        }
      >
        <View style={styles.page}>
          <Pressable accessibilityRole="button" onPress={() => router.push("/switch")} style={styles.goal}>
            <T size="small" tone="muted">
              Goal
            </T>
            <View style={styles.goalRow}>
              <T size="title" weight={600} style={{ flexShrink: 1 }}>
                {goal.name}
              </T>
              <Icon name="chevron" tone="muted" />
            </View>
          </Pressable>

          {unsorted.length > 0 && sortedBefore && (
            <Pressable accessibilityRole="link" onPress={() => router.push({ pathname: "/start/sort", params: { only: "unsorted" } })}>
              <T size="small" tone="muted">
                This goal needs <T size="small" tabular>{unsorted.length}</T> {unsorted.length === 1 ? "area" : "areas"} you haven’t sorted yet.{" "}
                <T size="small" weight={600} style={{ textDecorationLine: "underline" }}>
                  Sort them
                </T>
              </T>
            </Pressable>
          )}

          <Findings stuck={stuck} suspect={suspects[0]?.topic ?? null} next={next} checkIns={checkIns} statuses={statuses} today={today} onOpen={openTopic} />

          <View style={styles.figures}>
            <Figure value={summary.done} of={summary.route.length} label="done" />
            <View style={[styles.divider, { backgroundColor: c.border }]} />
            <Figure value={summary.left} label="to learn" />
            <View style={[styles.divider, { backgroundColor: c.border }]} />
            <Figure value={summary.skippable.length} label="you can skip" />
          </View>
        </View>

        <RouteList summary={summary} statuses={statuses} open={open} nextId={next?.id ?? null} onOpen={openTopic} />
      </ScrollView>
    </Frame>
  );
}

function Figure({ value, of, label }: { value: number; of?: number; label: string }) {
  return (
    <View style={{ flex: 1 }}>
      <T size="figure" weight={600} tabular>
        {value}
        {of !== undefined && (
          <T size="section" tone="faint" tabular>
            /{of}
          </T>
        )}
      </T>
      <T size="small" tone="muted">
        {label}
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { height: 52, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16 },
  switcher: { flex: 1, flexDirection: "row", alignItems: "center", gap: 4, minHeight: 44 },
  icon: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  scroll: { paddingHorizontal: 10, paddingBottom: 24 },
  page: { padding: 10, paddingTop: 16, gap: 14 },
  goal: { gap: 2 },
  goalRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  figures: { flexDirection: "row", alignItems: "stretch", gap: 12, marginTop: 6 },
  divider: { width: StyleSheet.hairlineWidth },
});
