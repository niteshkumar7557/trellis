// The refresh token's home on the phone: expo-secure-store, which encrypts it with a key
// kept in the Android Keystore (hardware-backed on most phones), so another app, or someone
// copying the app's files, can't read it (docs/mobile.md §4).
//
// Only the refresh token lives here. The access token lives in memory (api.ts), as on the
// web: it lasts 15 minutes and is remade from this one at every start.

import * as SecureStore from "expo-secure-store";

const KEY = "trellis.refresh";

export const session = {
  get: () => SecureStore.getItemAsync(KEY),
  set: (token: string) => SecureStore.setItemAsync(KEY, token),
  clear: () => SecureStore.deleteItemAsync(KEY),
};
