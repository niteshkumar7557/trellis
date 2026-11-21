// Each status has its own shape as well as its colour, so it reads without colour too
// (frontend/components/ui/Status.tsx, same geometry): done ●, learning ◐, stuck ◆, said
// shaky ◌ (amber, dashed), said I know ○ (ink), new ○ (faint).

import { STATUS_LABEL } from "@shared/graph";
import type { Status } from "@shared/types";
import { StyleSheet, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { useTheme } from "@/theme/theme";
import { T } from "./Text";

export function StatusMark({ status, size = 10 }: { status: Status; size?: number }) {
  const { c } = useTheme();
  const r = size / 2;
  const shape = (() => {
    switch (status) {
      case "done":
        return <Circle cx={r} cy={r} r={r} fill={c.done} />;
      case "learning":
        return (
          <>
            <Circle cx={r} cy={r} r={r - 0.75} fill="none" stroke={c.learning} strokeWidth={1.5} />
            <Path d={`M${r} 0.75A${r - 0.75} ${r - 0.75} 0 0 1 ${r} ${size - 0.75}Z`} fill={c.learning} />
          </>
        );
      case "stuck":
        return <Path d={`M${r} 0L${size} ${r}L${r} ${size}L0 ${r}Z`} fill={c.stuck} />;
      case "shaky":
        return <Circle cx={r} cy={r} r={r - 0.75} fill="none" stroke={c.shaky} strokeWidth={1.5} strokeDasharray="2 1.6" />;
      case "know":
        return <Circle cx={r} cy={r} r={r - 0.75} fill="none" stroke={c.know} strokeWidth={1.5} />;
      default:
        return <Circle cx={r} cy={r} r={r - 0.75} fill="none" stroke={c.faint} strokeWidth={1.25} />;
    }
  })();
  return (
    <Svg width={size} height={size}>
      {shape}
    </Svg>
  );
}

/** The filled pill: statuses own filled pills (difficulty never uses one). */
export function StatusPill({ status }: { status: Status }) {
  const { c } = useTheme();
  const fill = {
    done: [c.doneBg, "doneInk"],
    learning: [c.learningBg, "learningInk"],
    stuck: [c.stuckBg, "stuckInk"],
    shaky: [c.shakyBg, "shakyInk"],
    know: [c.active, "text"],
    new: [c.active, "text"],
  } as const;
  const [bg, ink] = fill[status];
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <StatusMark status={status} size={8} />
      <T size="small" weight={500} tone={ink}>
        {STATUS_LABEL[status]}
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { flexDirection: "row", alignItems: "center", gap: 6, height: 22, paddingHorizontal: 8, borderRadius: 999, alignSelf: "flex-start" },
});
