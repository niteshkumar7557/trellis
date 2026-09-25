export type MessageRole = "user" | "assistant";

export interface ChatMessage {
  id: number;
  role: MessageRole;
  content: string;
  time: string;
}

export interface Conversation {
  id: number;
  title: string;
  preview: string;
  time: string;
  messages: ChatMessage[];
}

/** Shape sent to the chat/title endpoints and any desktop bridge. */
export interface WireMessage {
  role: MessageRole;
  content: string;
}

/**
 * Optional desktop (Electron) bridge. When the app runs inside the desktop
 * shell, these methods take precedence over the HTTP API and localStorage.
 */
export interface KeroBridge {
  chat?: (messages: WireMessage[]) => Promise<string>;
  title?: (messages: WireMessage[]) => Promise<string>;
  loadChats?: () => Promise<Conversation[]>;
  saveChats?: (conversations: Conversation[]) => Promise<void>;
}

declare global {
  interface Window {
    kero?: KeroBridge;
  }
}
