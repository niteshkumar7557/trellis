import { MARK_PATH } from "./brand";

interface Props {
  size?: number;
  /**
   * The stroke colour. Screens leave this alone and get the theme's green. The build-time
   * images (touch icon, share image) pass a plain hex, because CSS variables don't exist
   * where they are drawn.
   */
  color?: string;
  /** Stroke width on the 24 grid. Small icons use a heavier line so the tiers stay apart. */
  weight?: number;
  className?: string;
}

// The Trellis mark: an espalier — one trunk, three trained tiers — drawn on a 24 grid.
export function Mark({ size = 20, color = "var(--accent)", weight = 2, className }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path d={MARK_PATH} stroke={color} strokeWidth={weight} strokeLinecap="round" />
    </svg>
  );
}
