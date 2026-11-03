import { STATUS_LABEL } from "@/lib/graph";
import type { Status } from "@/lib/types";
import styles from "./ui.module.css";

// Each status has its own shape as well as its colour, so it reads without colour too:
// done ●, learning ◐, stuck ◆, said shaky ◌ (amber), said I know ○ (ink), new ○ (faint).
export function StatusMark({ status, size = 10 }: { status: Status; size?: number }) {
  const r = size / 2;
  const c = r;
  switch (status) {
    case "done":
      return (
        <svg width={size} height={size} aria-hidden="true" className={styles.mark}>
          <circle cx={c} cy={c} r={r} fill="var(--done)" />
        </svg>
      );
    case "learning":
      return (
        <svg width={size} height={size} aria-hidden="true" className={styles.mark}>
          <circle cx={c} cy={c} r={r - 0.75} fill="none" stroke="var(--learning)" strokeWidth="1.5" />
          <path d={`M${c} ${0.75}A${r - 0.75} ${r - 0.75} 0 0 1 ${c} ${size - 0.75}Z`} fill="var(--learning)" />
        </svg>
      );
    case "stuck":
      return (
        <svg width={size} height={size} aria-hidden="true" className={styles.mark}>
          <path d={`M${c} 0L${size} ${c}L${c} ${size}L0 ${c}Z`} fill="var(--stuck)" />
        </svg>
      );
    case "shaky":
      return (
        <svg width={size} height={size} aria-hidden="true" className={styles.mark}>
          <circle cx={c} cy={c} r={r - 0.75} fill="none" stroke="var(--shaky)" strokeWidth="1.5" strokeDasharray="2 1.6" />
        </svg>
      );
    case "know":
      return (
        <svg width={size} height={size} aria-hidden="true" className={styles.mark}>
          <circle cx={c} cy={c} r={r - 0.75} fill="none" stroke="var(--know)" strokeWidth="1.5" />
        </svg>
      );
    default:
      return (
        <svg width={size} height={size} aria-hidden="true" className={styles.mark}>
          <circle cx={c} cy={c} r={r - 0.75} fill="none" stroke="var(--faint)" strokeWidth="1.25" />
        </svg>
      );
  }
}

export function StatusPill({ status }: { status: Status }) {
  return (
    <span className={styles.pill} data-status={status}>
      <StatusMark status={status} size={8} />
      {STATUS_LABEL[status]}
    </span>
  );
}
