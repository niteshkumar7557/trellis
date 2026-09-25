import type { Conversation } from "./types";

const STORAGE_KEY = "kero-chats";

export async function loadChats(): Promise<Conversation[]> {
  if (typeof window === "undefined") return [];

  if (window.kero?.loadChats) {
    try {
      const saved = await window.kero.loadChats();
      return Array.isArray(saved) ? saved : [];
    } catch {
      return [];
    }
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Conversation[]) : [];
  } catch {
    return [];
  }
}

export async function saveChats(conversations: Conversation[]): Promise<void> {
  if (typeof window === "undefined") return;

  if (window.kero?.saveChats) {
    await window.kero.saveChats(conversations);
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
}
