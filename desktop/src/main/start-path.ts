// Which page the app opens first. Pure, so it's unit-tested (test/start-path.test.ts).
//
// A browser visitor arrives through the landing page, which leads to Log in. The app has
// no landing page, so it decides itself: a student with a session goes to their map, and
// anyone else to Log in. Before 1.0.1 it always opened /map, and a signed-out student saw
// the sample student with no obvious way to their own account (owner, 21 Nov 2026).

/** `hasSession`: the window's cookie store holds a refresh_token cookie for the site. */
export function startPathFor(hasSession: boolean): "/map" | "/login" {
  return hasSession ? "/map" : "/login";
}
