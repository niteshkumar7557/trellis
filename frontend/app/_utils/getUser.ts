// Reads the access token, refreshing it when expired. Resolves to null for a
// signed-out visitor rather than rejecting — the refresh call 401s when there is
// no cookie, and callers await this inside effects where a rejection means the
// state never settles at all.

import { jwtDecode } from "jwt-decode";
import { jwtPayload } from "../_types/index";
import axios from "axios";

export const getUser = async () => {
  if (typeof window === "undefined") return null;
  let token = localStorage.getItem("access_token");

  if (token) {
    try {
      const user = jwtDecode(token) as jwtPayload;
      const isExpired = user.exp && user.exp * 1000 < Date.now();
      if (!isExpired) return user;
    } catch {}
  }

  let data: { access_token: string };
  try {
    ({ data } = await axios.post<{ access_token: string }>(
      `/api/user/refresh`,
      {},
      {
        withCredentials: true,
      },
    ));
  } catch {
    localStorage.removeItem("access_token");
    return null;
  }

  if (!data.access_token) {
    localStorage.removeItem("access_token");
    return null;
  }

  token = data.access_token;
  localStorage.setItem("access_token", token);

  const user = jwtDecode(token) as jwtPayload;
  return user;
};
