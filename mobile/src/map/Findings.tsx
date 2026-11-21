// The two findings above the route (the web map's header buttons): what you're stuck on and
// what may be underneath it, and the next topic. Each opens its topic. The web's words.

import { daysBetween, lastCheckIn, statusOf } from "@shared/graph";
import type { CheckIn, Status, Topic } from "@shared/types";
import { Pressable, StyleSheet, View } from "react-native";
import { useTheme } from "@/theme/theme";
import { Icon } from "@/ui/Icon";
import { StatusMark } from "@/ui/Status";
import { T } from "@/ui/Text";

interface Props {
  stuck: Topic | null;
  /** The likeliest cause (shared/graph.ts suspectsFor), if any. */
  suspect: Topic | null;
  next: Topic | null;
  checkIns: CheckIn[];
  statuses: Map<string, Status>;
  today: string;
  onOpen: (id: string) => void;
}

export function Findings({ stuck, suspect, next, checkIns, statuses, today, onOpen }: Props) {
  const { c } = useTheme();
  const since = stuck ? lastCheckIn(checkIns, stuck.id, "stuck") : undefined;
  return (
    <View style={styles.wrap}>
      {stuck && since && (
        <Pressable
          accessibilityRole="button"
          onPress={() => onOpen(stuck.id)}
          style={({ pressed }) => [styles.card, { backgroundColor: pressed ? c.stuckBg : c.surface, borderColor: c.stuck }]}
        >
          <StatusMark status="stuck" />
          <View style={styles.text}>
            <T weight={600} tone="stuckInk">{`Stuck: ${stuck.name}`}</T>
            <T size="small" tone="muted">
              {daysBetween(since.at, today)} days{suspect ? ` · may be ${suspect.name}` : ""}
            </T>
          </View>
          <Icon name="forward" tone="faint" />
        </Pressable>
      )}
      {next ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => onOpen(next.id)}
          style={({ pressed }) => [styles.card, { backgroundColor: pressed ? c.raised : c.surface, borderColor: c.border }]}
        >
          <StatusMark status={statusOf(statuses, next.id)} />
          <View style={styles.text}>
            <T weight={600}>{`Next: ${next.name}`}</T>
            <T size="small" tone="muted">
              ~{next.minutes} min
            </T>
          </View>
          <Icon name="forward" tone="faint" />
        </Pressable>
      ) : (
        <T tone="muted">Everything on this route is done or under way.</T>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  card: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderRadius: 999, paddingVertical: 10, paddingHorizontal: 16, minHeight: 52 },
  text: { flex: 1, gap: 1 },
});
