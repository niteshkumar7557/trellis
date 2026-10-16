// The SERVER-side API instance, for server components and build-time fetches. It
// talks to the API directly rather than through the /api rewrite.

import axios from "axios";

const serverApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
});

export default serverApi;