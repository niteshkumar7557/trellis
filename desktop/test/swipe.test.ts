import { describe, expect, it } from "vitest";
import { createSwipeTracker, type SwipeDirection } from "../src/main/swipe";

/** Feed a gesture: `n` scroll events of (dx, dy), 16 ms apart, starting at `t0`. */
function gesture(track: ReturnType<typeof createSwipeTracker>, n: number, dx: number, dy = 0, t0 = 0, blocked = false) {
  for (let i = 0; i < n; i++) track.wheel(dx, dy, blocked, t0 + i * 16);
  return t0 + n * 16;
}

function tracker() {
  const seen: SwipeDirection[] = [];
  return { seen, track: createSwipeTracker((d) => seen.push(d)) };
}

describe("two-finger swipe: when sideways scrolling means back or forward", () => {
  it("a firm swipe toward the left edge (negative deltaX) is Back; toward the right, Forward", () => {
    const a = tracker();
    gesture(a.track, 10, -20);
    expect(a.seen).toEqual(["back"]);
    const b = tracker();
    gesture(b.track, 10, 20);
    expect(b.seen).toEqual(["forward"]);
  });

  it("fires once per gesture, however long it goes on (momentum included)", () => {
    const { seen, track } = tracker();
    gesture(track, 60, -20);
    expect(seen).toEqual(["back"]);
  });

  it("a pause ends a gesture, so the next swipe counts again", () => {
    const { seen, track } = tracker();
    const end = gesture(track, 10, -20);
    gesture(track, 10, -20, 0, end + 400);
    expect(seen).toEqual(["back", "back"]);
  });

  it("a small nudge is not a swipe", () => {
    const { seen, track } = tracker();
    gesture(track, 5, -20); // 100 px in all
    expect(seen).toEqual([]);
  });

  it("mostly up-and-down scrolling is reading, not navigating", () => {
    const { seen, track } = tracker();
    gesture(track, 20, -15, 40);
    expect(seen).toEqual([]);
  });

  it("a gesture the page used (the map panning) never navigates, even if it later reaches the page", () => {
    const { seen, track } = tracker();
    track.wheel(-20, 0, true, 0); // started over the map: the map called preventDefault
    gesture(track, 20, -20, 0, 16); // then slid off the canvas, same gesture
    expect(seen).toEqual([]);
  });
});
