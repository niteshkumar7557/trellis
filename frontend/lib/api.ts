// The one place the frontend talks to the backend. Every request goes to /api/... on this
// same origin (Caddy in production, the Next rewrite in development), so there is no CORS
// and the refresh cookie can be SameSite=Strict (backend-design.md §2, §4).
//
// The access token lives in this module's memory, never in localStorage: a script injected
// into the page can't read it from storage. The cost: a reload forgets it, so every page
// load starts with one POST /api/auth/refresh, which turns the httpOnly cookie into a new
// token.

/** An error answer from the API, in its one shape: { error: { code, message } }. */
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

let accessToken: string | null = null;

/** Called after sign-up, login or a refresh. */
export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function hasAccessToken() {
  return accessToken !== null;
}

// Several requests can hit an expired token at once (the map loads, a message is sent).
// They share ONE refresh instead of racing: without this, two tabs' worth of parallel
// refreshes would multiply requests for no reason.
let refreshing: Promise<boolean> | null = null;

/** Swaps the refresh cookie for a new access token. False when the student is signed out. */
export function refreshAccessToken(): Promise<boolean> {
  refreshing ??= fetch("/api/auth/refresh", { method: "POST", credentials: "same-origin" })
    .then(async (res) => {
      if (!res.ok) {
        accessToken = null;
        return false;
      }
      accessToken = ((await res.json()) as { accessToken: string }).accessToken;
      return true;
    })
    .catch(() => false)
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

// Told when a refresh fails mid-session (the student signed out in another tab, or the
// account was deleted), so the store can drop back to signed-out.
let onSignedOut: (() => void) | null = null;
export function whenSignedOut(handler: (() => void) | null) {
  onSignedOut = handler;
}

interface Options {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
}

/**
 * One API call. Sends the access token, and on a 401 refreshes once and tries again: an
 * access token lasts 15 minutes, so a student who leaves the map open will meet one.
 * Throws ApiError for any error answer, and for no answer at all (status 0, "network").
 */
export async function api<T>(path: string, { method = "GET", body }: Options = {}, retried = false): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method,
      credentials: "same-origin",
      headers: {
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, "network", "Can't reach Trellis. Check your connection and try again.");
  }

  if (res.status === 401 && !retried && !path.startsWith("/auth/")) {
    if (await refreshAccessToken()) return api<T>(path, { method, body }, true);
    onSignedOut?.();
  }

  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: { code?: string; message?: string } } | null;
    throw new ApiError(res.status, data?.error?.code ?? "internal", data?.error?.message ?? "Something went wrong.");
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
