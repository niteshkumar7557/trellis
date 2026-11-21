// The one place the app talks to the backend (the web's frontend/lib/api.ts, for a phone).
//
// The differences from the web, and why (docs/mobile.md §4):
//   - every request carries X-Trellis-Client: mobile, so the auth routes keep the refresh
//     token in the JSON body (a native app has no cookie jar the server can rely on);
//   - the refresh token comes from secure storage (session.ts) instead of a cookie;
//   - "the server said no" and "the phone is offline" are kept apart. Only a 401 from
//     /auth/refresh deletes the stored token; a network error, a 5xx or a 429 keeps it, so
//     a student on a train isn't signed out by a tunnel.

import { config } from "./config";
import { session } from "./session";

/** An error answer from the API, in its one shape { error: { code, message } }. Status 0 = no answer. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const MOBILE_HEADER = { "X-Trellis-Client": "mobile" } as const;
const OFFLINE = "Can't reach Trellis. Check your connection and try again.";

let accessToken: string | null = null;

/** After sign-in or a refresh; null on sign-out. */
export function setAccessToken(token: string | null) {
  accessToken = token;
}

// Told when the server refuses the refresh token mid-session (signed out on another
// device, account deleted), so the app can go back to Log in.
let onSignedOut: (() => void) | null = null;
export function whenSignedOut(handler: (() => void) | null) {
  onSignedOut = handler;
}

export type RefreshResult = "ok" | "refused" | "offline";

async function refreshOnce(): Promise<RefreshResult> {
  const refreshToken = await session.get();
  if (!refreshToken) return "refused";
  let res: Response;
  try {
    res = await fetch(`${config.apiUrl}/auth/refresh`, {
      method: "POST",
      headers: { ...MOBILE_HEADER, "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
  } catch {
    return "offline";
  }
  if (res.status === 401) {
    // The server no longer knows this token: it's useless, so forget it.
    await session.clear();
    accessToken = null;
    return "refused";
  }
  if (!res.ok) return "offline"; // 5xx or 429: the server is having a moment, the token is fine
  accessToken = ((await res.json()) as { accessToken: string }).accessToken;
  return "ok";
}

// Several requests can meet an expired access token at once (the map loads while a message
// is sent). They share ONE refresh instead of each making their own.
let refreshing: Promise<RefreshResult> | null = null;

export function refreshAccessToken(): Promise<RefreshResult> {
  refreshing ??= refreshOnce().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

interface Options {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
}

/**
 * One API call. Sends the access token, and on a 401 refreshes once and tries again (an
 * access token lasts 15 minutes; a student who keeps the app open will meet one).
 * Throws ApiError for any error answer, and status 0 for no answer at all.
 */
export async function api<T>(path: string, { method = "GET", body }: Options = {}, retried = false): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${config.apiUrl}${path}`, {
      method,
      headers: {
        ...MOBILE_HEADER,
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, "network", OFFLINE);
  }

  // The auth routes answer 401 for a wrong password too; refreshing would make no sense there.
  if (res.status === 401 && !retried && !path.startsWith("/auth/")) {
    const result = await refreshAccessToken();
    if (result === "ok") return api<T>(path, { method, body }, true);
    if (result === "offline") throw new ApiError(0, "network", OFFLINE);
    onSignedOut?.();
  }

  if (res.status === 204) return undefined as T;
  const data: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const error = (data as { error?: { code?: string; message?: string } } | null)?.error;
    throw new ApiError(res.status, error?.code ?? "error", error?.message ?? "Something went wrong. Try again.");
  }
  return data as T;
}
