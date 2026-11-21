// Search: every topic in every subject, by name or keyword (the web's ⌘K, for a thumb). A
// result opens its topic sheet, switching subject if it's in another one.

import { subjectById, topics } from "@shared/data";
import { statusOf } from "@shared/graph";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { FlatList, StyleSheet, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useStore } from "@/store/store";
import { useTheme } from "@/theme/theme";
import { font } from "@/theme/type";
import { Icon } from "@/ui/Icon";
import { Rule, Row } from "@/ui/Row";
import { StatusMark } from "@/ui/Status";
import { T } from "@/ui/Text";
import { Button } from "@/ui/Button";

export default function Search() {
  const { statuses, subjectId, dispatch } = useStore();
  const { c } = useTheme();
  const inset = useSafeAreaInsets();
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return topics
      .filter((t) => t.name.toLowerCase().includes(q) || t.keywords.some((k) => k.includes(q)))
      // The subject on screen first, then names that start with the query.
      .sort((a, b) => Number(b.subjectId === subjectId) - Number(a.subjectId === subjectId) || Number(b.name.toLowerCase().startsWith(q)) - Number(a.name.toLowerCase().startsWith(q)))
      .slice(0, 40);
  }, [query, subjectId]);

  return (
    <View style={{ flex: 1, backgroundColor: c.ground, paddingTop: inset.top }}>
      <View style={styles.bar}>
        <View style={[styles.field, { backgroundColor: c.surface, borderColor: c.control }]}>
          <Icon name="search" tone="muted" />
          <TextInput
            autoFocus
            value={query}
            onChangeText={setQuery}
            placeholder="Search topics"
            placeholderTextColor={c.faint}
            selectionColor={c.accent}
            returnKeyType="search"
            style={[styles.input, { color: c.text, fontFamily: font[400] }]}
            accessibilityLabel="Search topics"
          />
        </View>
        <Button kind="ghost" label="Cancel" onPress={() => router.back()} />
      </View>
      <FlatList
        data={results}
        keyExtractor={(t) => t.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 8, paddingBottom: inset.bottom + 16 }}
        ItemSeparatorComponent={Rule}
        ListEmptyComponent={
          query.trim() ? (
            <T tone="muted" style={styles.empty}>
              No topic matches “{query.trim()}”.
            </T>
          ) : undefined
        }
        renderItem={({ item }) => (
          <Row
            accessibilityLabel={item.name}
            left={<StatusMark status={statusOf(statuses, item.id)} />}
            onPress={() => {
              if (item.subjectId !== subjectId) dispatch({ type: "subject", subjectId: item.subjectId });
              router.replace({ pathname: "/topic/[id]", params: { id: item.id } });
            }}
          >
            <T weight={500}>{item.name}</T>
            <T size="small" tone="muted">
              {subjectById.get(item.subjectId)!.shortName}
              {item.parentId ? "" : " · big topic"}
            </T>
          </Row>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: "row", alignItems: "center", gap: 4, padding: 8 },
  field: { flex: 1, height: 48, borderWidth: 1, borderRadius: 8, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12 },
  input: { flex: 1, fontSize: 15, height: 48 },
  empty: { padding: 16 },
});
