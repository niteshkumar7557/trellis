// When the daily reminder fires next. Pure, so it's unit-tested (test/reminder.test.ts).

/**
 * Milliseconds from `now` to the next `time` ("HH:MM", local), strictly in the future: at
 * exactly 19:00 the next 19:00 is tomorrow's, because this one has just fired.
 *
 * It builds the target with the Date's own local-time setters instead of adding 24 hours
 * of milliseconds, so the reminder stays at 19:00 on the wall clock when daylight saving
 * starts or ends (a day can be 23 or 25 hours long).
 */
export function msUntilNext(time: string, now: Date): number {
  const [h, m] = time.split(":").map(Number) as [number, number];
  const next = new Date(now);
  next.setHours(h, m, 0, 0);
  if (next <= now) {
    next.setDate(next.getDate() + 1);
    next.setHours(h, m, 0, 0); // again, in case the day change crossed a DST switch
  }
  return next.getTime() - now.getTime();
}
