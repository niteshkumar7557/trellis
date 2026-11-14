import { BRAND } from "./brand";
import { Mark } from "./Mark";

interface Props {
  /** The mark's size in px. The name is set at 0.8 of it, which keeps the two the same visual weight. */
  size?: number;
  /** The mark's colour; see Mark. */
  color?: string;
  className?: string;
}

// The lockup: the mark with the name beside it. Every screen that shows "Trellis" as a
// brand (sidebar, sign-in, setup, landing, 404) uses this, so the gap and the weight are
// the same everywhere. The text colour is inherited, so it follows whatever it sits on.
//
// Inline styles rather than a CSS module, on purpose: the share image is drawn by Next's
// ImageResponse, which reads inline styles only, and it uses this same component. For the
// same reason it is `display: flex`, not inline-flex: ImageResponse accepts only flex.
// Every place that uses it is already a flex or grid item, so it never stretches.
export function Logo({ size = 20, color, className }: Props) {
  return (
    <span
      className={className}
      style={{ display: "flex", alignItems: "center", gap: size * 0.5, fontSize: size * 0.8, fontWeight: 600, lineHeight: 1 }}
    >
      <Mark size={size} color={color} />
      <span style={{ letterSpacing: "-0.01em" }}>{BRAND.name}</span>
    </span>
  );
}
