import type { Difficulty } from "@shared/types";
import styles from "./ui.module.css";

export const DIFFICULTY_LABEL: Record<Difficulty, string> = { easy: "Easy", medium: "Medium", hard: "Hard" };

const LEVEL: Record<Difficulty, number> = { easy: 1, medium: 2, hard: 3 };

/**
 * Three rising bars, as many filled as the level: easy one, medium two, hard three.
 * A different shape from every status mark (those are circles and a diamond), so the two
 * scales stay apart without relying on colour; it reads in greyscale too.
 */
export function DifficultyMark({ level }: { level: Difficulty }) {
  const n = LEVEL[level];
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <rect
          key={i}
          x={i * 3.5}
          y={6 - i * 3}
          width="2.5"
          height={4 + i * 3}
          rx="0.6"
          fill={i < n ? `var(--${level})` : "var(--control)"}
        />
      ))}
    </svg>
  );
}

/** "▂▄▆ Medium": how hard a topic usually is for people learning it. */
export function DifficultyTag({ level }: { level: Difficulty }) {
  return (
    <span className={styles.difficulty} data-level={level} title="How hard people usually find this topic">
      <DifficultyMark level={level} />
      {DIFFICULTY_LABEL[level]}
    </span>
  );
}
