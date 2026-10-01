"use client";

/**
 * =============================================================================
 * CHAT APPLICATION ROOT COMPONENT
 * =============================================================================
 * Central chat interface for Trellis / Kero.
 * 
 * 🔗 BACKEND INTEGRATION (ONLY REQUESTED ROUTES):
 *  1. POST /api/conversations              -> First message of new convo
 *                                             (Title is generated & stored in DB by backend)
 *  2. POST /api/conversations/:id/messages -> Message to an existing convo
 * 
 * ⏱️ CHAT WAITING BEHAVIOR:
 *  - User sends a message -> Immediate local append
 *  - UI displays thinking status banner directly above input box
 *  - Dummy 4 seconds wait time simulates AI generation latency until backend is connected
 * =============================================================================
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type UIEventHandler,
} from "react";
import { useRouter } from "next/navigation";
import type { ChatMessage } from "@/lib/types";
import { api, waitDummyDelay } from "@/lib/api";
import { useTheme } from "@/lib/useTheme";
import ChatHeader from "./ChatHeader";
import Composer from "./Composer";
import MessageThread from "./MessageThread";
import ScrollLatestButton from "./ScrollLatestButton";
import Sidebar from "./Sidebar";

type SendEvent =
  | FormEvent<HTMLFormElement>
  | KeyboardEvent<HTMLTextAreaElement>;

const EMPTY_MESSAGES: ChatMessage[] = [];

interface ChatAppProps {
  initialConversationId?: string;
  initialMessages?: ChatMessage[];
  initialTitle?: string;
}

export default function ChatApp({
  initialConversationId,
  initialMessages = EMPTY_MESSAGES,
  initialTitle,
}: ChatAppProps = {}) {
  const router = useRouter();

  // Active chat state
  const [messages, setMessages] = useState<ChatMessage[]>(() => initialMessages);
  const [draft, setDraft] = useState("");
  const [activeConversationId, setActiveConversationId] = useState<string | null>(
    () => initialConversationId || null
  );
  const [activeTitle, setActiveTitle] = useState<string>(() => initialTitle || "Kero");

  // UI state
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showScrollButton, setShowScrollButton] = useState(false);

  const { darkMode, toggleTheme } = useTheme();

  const requestId = useRef(0);
  const threadRef = useRef<HTMLDivElement>(null);
  const shouldScrollToLatest = useRef(false);

  // Smooth scroll handler
  const scrollToLatest = useCallback((behavior: ScrollBehavior = "smooth") => {
    if (!threadRef.current) return;
    threadRef.current.scrollTo({
      top: threadRef.current.scrollHeight,
      behavior,
    });
    setShowScrollButton(false);
  }, []);

  // Auto-scroll when new messages arrive
  useEffect(() => {
    if (!messages.length || !shouldScrollToLatest.current) return undefined;
    const frame = window.requestAnimationFrame(() => scrollToLatest());
    shouldScrollToLatest.current = false;
    return () => window.cancelAnimationFrame(frame);
  }, [messages, scrollToLatest]);

  const handleThreadScroll: UIEventHandler<HTMLDivElement> = (event) => {
    const thread = event.currentTarget;
    const distanceFromLatest =
      thread.scrollHeight - thread.scrollTop - thread.clientHeight;
    setShowScrollButton(distanceFromLatest > 120);
  };

  /**
   * Send message handler:
   * 1. Appends user message to thread immediately
   * 2. Displays thinking status above input box
   * 3. Waits 4 seconds dummy time (replaced by real backend once connected)
   * 4. Calls POST /api/conversations (new convo) or POST /api/conversations/:id/messages
   */
  const sendMessage = async (event: SendEvent) => {
    event.preventDefault();
    const trimmedDraft = draft.trim();
    if (!trimmedDraft || isLoading) return;

    const messageId = `msg-${Date.now()}`;
    const userMessage: ChatMessage = {
      id: messageId,
      role: "user",
      content: trimmedDraft,
      time: "Just now",
    };

    const nextMessages: ChatMessage[] = [...messages, userMessage];
    const currentRequestId = requestId.current + 1;
    requestId.current = currentRequestId;
    shouldScrollToLatest.current = true;

    setMessages(nextMessages);
    setDraft("");
    setError("");
    setIsLoading(true);

    const isNewConversation = !activeConversationId;
    const targetConversationId = activeConversationId;

    try {
      // ⏱️ DUMMY 4-SECOND WAIT TIME (simulates AI thinking latency until backend is set up)
      await waitDummyDelay(4000);
      if (requestId.current !== currentRequestId) return;

      if (isNewConversation) {
        // 🔗 BACKEND ROUTE: POST /api/conversations
        // New convo first message: Backend stores title in DB, generates AI response, saves both.
        const createdConv = await api.conversations.create(trimmedDraft);
        if (requestId.current !== currentRequestId) return;

        setActiveConversationId(createdConv.id);
        setActiveTitle(createdConv.title);

        const assistantMsg = createdConv.messages.find((m) => m.role === "assistant") || {
          id: `msg-${Date.now() + 1}`,
          role: "assistant",
          content: "I received your study check-in! Once the backend is online, precision AI study guidance will appear here.",
          time: "Just now",
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } else if (targetConversationId) {
        // 🔗 BACKEND ROUTE: POST /api/conversations/:id/messages
        // Message on specific conv-id: Backend appends message & returns AI response.
        const result = await api.conversations.sendMessage(targetConversationId, trimmedDraft);
        if (requestId.current !== currentRequestId) return;

        setMessages((prev) => [...prev, result.assistantMessage]);
      }
    } catch (requestError) {
      if (requestId.current !== currentRequestId) return;
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not send message. Verify your backend server is running."
      );
    } finally {
      if (requestId.current === currentRequestId) {
        setIsLoading(false);
      }
    }
  };

  // Keyboard shortcut: Cmd+K / Ctrl+K jumps to new conversation at "/"
  useEffect(() => {
    const handleNewChatShortcut = (event: globalThis.KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        router.push("/");
      }
    };
    window.addEventListener("keydown", handleNewChatShortcut);
    return () => window.removeEventListener("keydown", handleNewChatShortcut);
  }, [router]);

  return (
    <main
      className={`app-shell h-svh min-h-svh flex overflow-hidden text-[#252321] dark:text-[#e8e3de] bg-[#fbfaf8] dark:bg-[#1b1a19] ${
        darkMode ? "dark-mode" : ""
      } ${
        sidebarOpen
          ? ""
          : "sidebar-hidden [&_.sidebar]:!w-0 [&_.sidebar]:!flex-[0_0_0px] [&_.sidebar]:!px-0 [&_.sidebar]:!border-r-transparent [&_.sidebar]:!opacity-0 [&_.sidebar]:!pointer-events-none"
      }`}
    >
      {/* Sidebar fetching data from single GET /api/sidebar route */}
      <Sidebar />

      {/* Main chat workspace */}
      <section className="chat-panel relative min-w-0 min-h-0 h-svh flex-1 flex flex-col bg-[#fbfaf8] dark:bg-[#1b1a19]">
        <ChatHeader
          title={activeTitle}
          sidebarOpen={sidebarOpen}
          darkMode={darkMode}
          onToggleSidebar={() => setSidebarOpen((current) => !current)}
          onToggleTheme={toggleTheme}
        />

        <div className="chat-content w-[min(760px,100%)] min-h-0 flex-1 mx-auto px-8 flex flex-col overflow-hidden">
          <MessageThread
            messages={messages}
            isLoading={isLoading}
            draft={draft}
            setDraft={setDraft}
            sendMessage={sendMessage}
            threadRef={threadRef}
            onScroll={handleThreadScroll}
          />

          {messages.length > 0 && (
            <div className="composer-wrap pt-2.5 px-0 pb-4.5">
              {/* 💬 Thinking / status banner displayed above the input box */}
              {isLoading && (
                <div
                  className="chat-thinking-banner mb-2 mx-auto w-fit flex items-center gap-2 px-3 py-1 rounded-full text-[11.5px] font-medium text-[#ba806e] dark:text-[#c48e7a] bg-[#ba806e]/10 dark:bg-[#c48e7a]/15 border border-[#ba806e]/20 dark:border-[#c48e7a]/25 shadow-sm transition-all animate-pulse"
                  role="status"
                  aria-live="polite"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#ba806e] dark:bg-[#c48e7a] animate-ping" />
                  <span>Kero is thinking…</span>
                </div>
              )}

              {error && (
                <p
                  className="chat-error mb-[9px] text-[#a25e50] dark:text-[#d89180] text-[11px] leading-[1.4] text-center"
                  role="alert"
                >
                  {error}
                </p>
              )}

              <Composer
                draft={draft}
                setDraft={setDraft}
                sendMessage={sendMessage}
                isLoading={isLoading}
              />
              <p className="composer-hint mt-2.5 text-[#7a736c] dark:text-[#817a73] text-[11px] text-center">
                Tell Kero what you studied, what bounced, or ask what&apos;s next.
              </p>
            </div>
          )}
        </div>

        {showScrollButton && (
          <ScrollLatestButton onClick={() => scrollToLatest()} />
        )}
      </section>
    </main>
  );
}
