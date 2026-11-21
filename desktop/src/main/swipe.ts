// Two-finger swipe for Back and Forward (docs/desktop.md §7). Pure, so it's unit-tested.
//
// Why this exists: in Chrome and Safari the swipe is a feature of the browser's own
// interface. Electron is a bare window and has none of it; its "swipe" event only fires for
// an old three-finger swipe that macOS has off by default. So the preload reports each real
// two-finger scroll, and this decides when the scrolling means "back" or "forward".
//
// A trackpad swipe arrives as a burst of wheel events: the fingers moving, then macOS's
// "momentum" events after they lift, a few milliseconds apart. A gesture is one burst.

export type SwipeDirection = "back" | "forward";

/** A deliberate swipe moves hundreds of pixels; a nudge, under a hundred. */
const THRESHOLD_PX = 150;
/** Sideways must win clearly: reading scrolls down and drifts a little sideways. */
const SIDEWAYS_RATIO = 2;
/** Longer than any gap inside one burst (momentum events come every few ms). */
const GESTURE_GAP_MS = 250;

export function createSwipeTracker(onSwipe: (direction: SwipeDirection) => void) {
  let lastAt = -Infinity;
  let sumX = 0;
  let sumY = 0;
  let done = false; // fired, or blocked: either way this gesture is over for us

  return {
    /**
     * One wheel event. `blocked`: the page used it (called preventDefault, as the map does
     * to pan) or the element under the fingers could scroll sideways itself.
     * Positive deltaX scrolls toward the right edge, so a swipe to go back reads negative.
     */
    wheel(dx: number, dy: number, blocked: boolean, now: number): void {
      if (now - lastAt > GESTURE_GAP_MS) {
        sumX = 0;
        sumY = 0;
        done = false;
      }
      lastAt = now;
      if (done) return;
      // One blocked event spoils the whole gesture: a pan that starts on the map and slides
      // off the canvas is still a pan, not a request to leave the page.
      if (blocked) {
        done = true;
        return;
      }
      sumX += dx;
      sumY += dy;
      if (Math.abs(sumX) >= THRESHOLD_PX && Math.abs(sumX) >= SIDEWAYS_RATIO * Math.abs(sumY)) {
        done = true;
        onSwipe(sumX < 0 ? "back" : "forward");
      }
    },
  };
}
