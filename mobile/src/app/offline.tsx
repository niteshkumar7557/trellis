// A session is stored but the server couldn't be reached. The student is still signed in,
// so this isn't Log in: it's Retry.

import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { useStore } from "@/store/store";
import { Button } from "@/ui/Button";
import { Frame } from "@/ui/Frame";
import { Mark } from "@/ui/Mark";
import { T } from "@/ui/Text";

export default function Offline() {
  const { act } = useStore();
  const [trying, setTrying] = useState(false);
  return (
    <Frame>
      <View style={styles.page}>
        <Mark size={32} />
        <T size="title" weight={600}>
          Can’t reach Trellis
        </T>
        <T tone="muted" style={styles.text}>
          Your map is safe on the server. Check your connection, then try again.
        </T>
        <Button
          kind="primary"
          label={trying ? "Trying…" : "Try again"}
          disabled={trying}
          onPress={async () => {
            setTrying(true);
            await act.retry();
            setTrying(false);
          }}
        />
      </View>
    </Frame>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 12 },
  text: { textAlign: "center", marginBottom: 12 },
});
