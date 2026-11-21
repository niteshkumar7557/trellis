// shared/ calls console.assert(value, message) with any value, as the browser's and Node's
// console allow (shared/data/index.ts runs ~1,500 such self-checks on import). React
// Native's type definitions narrow the first argument to boolean, so `tsc` refuses code
// that runs fine on the phone. This adds the standard signature back, rather than
// editing shared/ for one app's types.

export {};

declare global {
  interface Console {
    assert(value: unknown, ...data: unknown[]): void;
  }
}
