// Where a trellis://auth?code=… link lands in the router. Google sign-in reads the code in
// src/lib/google.ts (openAuthSessionAsync hands it over); this screen does nothing with it,
// so a link that arrives when no sign-in is in progress is simply ignored.

import { Redirect } from "expo-router";

export default function AuthLink() {
  return <Redirect href="/" />;
}
