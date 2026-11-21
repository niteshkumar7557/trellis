// The API client (docs/mobile.md §4): the mobile header, the access token in memory, one
// shared refresh on a 401, and a stored refresh token that's deleted only when the server
// refuses it (never because the phone is offline).

import * as SecureStore from "expo-secure-store";
import { ApiError, api, refreshAccessToken, setAccessToken, whenSignedOut } from "@/lib/api";
import { restoreSession, signIn, signOut } from "@/lib/auth";

// The Keystore doesn't exist under Jest: an in-memory stand-in with the same functions.
jest.mock("expo-secure-store", () => {
  const store = new Map<string, string>();
  return {
    getItemAsync: jest.fn(async (k: string) => store.get(k) ?? null),
    setItemAsync: jest.fn(async (k: string, v: string) => void store.set(k, v)),
    deleteItemAsync: jest.fn(async (k: string) => void store.delete(k)),
  };
});

const KEY = "trellis.refresh";
const json = (status: number, body?: unknown) =>
  ({ ok: status >= 200 && status < 300, status, json: async () => body }) as Response;
const fetchMock = jest.fn<Promise<Response>, [string, RequestInit]>();
global.fetch = fetchMock as unknown as typeof fetch;

/** The headers a call was sent with, as a plain object. */
const headersOf = (call: number) => (fetchMock.mock.calls[call]![1].headers ?? {}) as Record<string, string>;

beforeEach(async () => {
  fetchMock.mockReset();
  setAccessToken(null);
  whenSignedOut(null);
  await SecureStore.deleteItemAsync(KEY);
});

describe("api()", () => {
  it("sends the mobile header and the access token", async () => {
    setAccessToken("access-1");
    fetchMock.mockResolvedValueOnce(json(200, { ok: true }));
    await api("/state");
    expect(fetchMock.mock.calls[0]![0]).toMatch(/\/api\/state$/);
    expect(headersOf(0)["X-Trellis-Client"]).toBe("mobile");
    expect(headersOf(0).Authorization).toBe("Bearer access-1");
  });

  it("refreshes once on a 401 with the stored token, then retries", async () => {
    await SecureStore.setItemAsync(KEY, "refresh-1");
    setAccessToken("old");
    fetchMock
      .mockResolvedValueOnce(json(401, { error: { code: "unauthorized", message: "x" } }))
      .mockResolvedValueOnce(json(200, { accessToken: "new", refreshToken: "refresh-1" }))
      .mockResolvedValueOnce(json(200, { done: true }));
    await expect(api("/state")).resolves.toEqual({ done: true });
    expect(fetchMock.mock.calls[1]![0]).toMatch(/\/auth\/refresh$/);
    expect(JSON.parse(fetchMock.mock.calls[1]![1].body as string)).toEqual({ refreshToken: "refresh-1" });
    expect(headersOf(2).Authorization).toBe("Bearer new");
  });

  it("shares ONE refresh between requests that meet a 401 together", async () => {
    await SecureStore.setItemAsync(KEY, "refresh-1");
    fetchMock.mockImplementation(async (url, init) => {
      if (url.endsWith("/auth/refresh")) return json(200, { accessToken: "new", refreshToken: "refresh-1" });
      const auth = (init.headers as Record<string, string>).Authorization;
      return auth === "Bearer new" ? json(200, {}) : json(401, { error: { code: "unauthorized", message: "x" } });
    });
    await Promise.all([api("/a"), api("/b")]);
    expect(fetchMock.mock.calls.filter(([url]) => url.endsWith("/auth/refresh"))).toHaveLength(1);
  });

  it("signs out when the server refuses the refresh token: deletes it and tells the app", async () => {
    await SecureStore.setItemAsync(KEY, "revoked");
    const signedOut = jest.fn();
    whenSignedOut(signedOut);
    fetchMock
      .mockResolvedValueOnce(json(401, { error: { code: "unauthorized", message: "x" } }))
      .mockResolvedValueOnce(json(401, { error: { code: "unauthorized", message: "x" } }));
    await expect(api("/state")).rejects.toMatchObject({ status: 401 });
    expect(await SecureStore.getItemAsync(KEY)).toBeNull();
    expect(signedOut).toHaveBeenCalled();
  });

  it("turns an error answer into ApiError with the server's code and message", async () => {
    fetchMock.mockResolvedValueOnce(json(409, { error: { code: "email_taken", message: "An account exists." } }));
    await expect(api("/x", { method: "POST", body: {} })).rejects.toEqual(new ApiError(409, "email_taken", "An account exists."));
  });

  it("turns no answer at all into ApiError status 0", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("Network request failed"));
    await expect(api("/x")).rejects.toMatchObject({ status: 0, code: "network" });
  });
});

describe("the session", () => {
  it("restores a signed-in session from the stored token", async () => {
    await SecureStore.setItemAsync(KEY, "refresh-1");
    fetchMock.mockResolvedValueOnce(json(200, { accessToken: "a", refreshToken: "refresh-1" }));
    await expect(restoreSession()).resolves.toBe("signed-in");
  });

  it("is signed out with no stored token, without calling the server", async () => {
    await expect(restoreSession()).resolves.toBe("signed-out");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("is OFFLINE, not signed out, when the server can't be reached, and keeps the token", async () => {
    await SecureStore.setItemAsync(KEY, "refresh-1");
    fetchMock.mockRejectedValueOnce(new TypeError("Network request failed"));
    await expect(restoreSession()).resolves.toBe("offline");
    expect(await SecureStore.getItemAsync(KEY)).toBe("refresh-1");
  });

  it("keeps the token when the server is down or busy (5xx, 429)", async () => {
    await SecureStore.setItemAsync(KEY, "refresh-1");
    fetchMock.mockResolvedValueOnce(json(503, {}));
    await expect(refreshAccessToken()).resolves.toBe("offline");
    expect(await SecureStore.getItemAsync(KEY)).toBe("refresh-1");
  });

  it("signIn stores the refresh token from the body and returns the student", async () => {
    const student = { id: "5", name: "Ada" };
    fetchMock.mockResolvedValueOnce(json(200, { accessToken: "a", refreshToken: "r".repeat(64), student }));
    await expect(signIn("login", { email: "ada@example.com", password: "pw" })).resolves.toEqual(student);
    expect(fetchMock.mock.calls[0]![0]).toMatch(/\/auth\/login$/);
    expect(await SecureStore.getItemAsync(KEY)).toBe("r".repeat(64));
  });

  it("signOut tells the server which token to delete, then forgets it", async () => {
    await SecureStore.setItemAsync(KEY, "refresh-1");
    fetchMock.mockResolvedValueOnce(json(204));
    await signOut();
    expect(fetchMock.mock.calls[0]![0]).toMatch(/\/auth\/logout$/);
    expect(JSON.parse(fetchMock.mock.calls[0]![1].body as string)).toEqual({ refreshToken: "refresh-1" });
    expect(await SecureStore.getItemAsync(KEY)).toBeNull();
  });

  it("signOut forgets the token even when the server can't be reached", async () => {
    await SecureStore.setItemAsync(KEY, "refresh-1");
    fetchMock.mockRejectedValueOnce(new TypeError("Network request failed"));
    await signOut();
    expect(await SecureStore.getItemAsync(KEY)).toBeNull();
  });
});
