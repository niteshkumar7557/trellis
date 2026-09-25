import type { WireMessage } from "./types";

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const result = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(result.error || "Something went wrong while contacting Groq.");
  }

  return result;
}

export async function requestChat(messages: WireMessage[]): Promise<string> {
  if (typeof window !== "undefined" && window.kero?.chat) {
    return window.kero.chat(messages);
  }

  const result = await postJson<{ content: string }>("/api/chat", { messages });
  return result.content;
}

export async function requestTitle(messages: WireMessage[]): Promise<string> {
  if (typeof window !== "undefined" && window.kero?.title) {
    return window.kero.title(messages);
  }

  const result = await postJson<{ title: string }>("/api/title", { messages });
  return result.title;
}

export function createFallbackTitle(messages: WireMessage[]): string {
  const firstUserMessage =
    messages.find(({ role }) => role === "user")?.content || "";
  const words = firstUserMessage
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);

  if (words.length === 0) return "New conversation";
  return `Chat about ${words.slice(0, 5).join(" ")}${
    words.length > 5 ? "…" : ""
  }`;
}
