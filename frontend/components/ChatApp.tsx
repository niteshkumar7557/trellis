"use client";

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
import api from "@/app/_utils/axios"
import { useTheme } from "@/lib/useTheme";
import ChatHeader from "./ChatHeader";
import Composer from "./Composer";
import MessageThread from "./MessageThread";
import ScrollLatestButton from "./ScrollLatestButton";
import Sidebar from "./Sidebar";
import type { ChatMessage, Conversation } from "@/app/_types";

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
   * 3. Calls POST /api/conversations (new convo) or POST /api/conversations/:id/messages
   */
  const sendMessage = async (event: SendEvent) => {
    event.preventDefault();
    const trimmedDraft = draft.trim();
    if (!trimmedDraft || isLoading) return;

    const now = new Date();
    const messageId = `msg-${now.getTime()}`;
    const userMessage: ChatMessage = {
      id: messageId,
      role: "user",
      content: trimmedDraft,
      time: "Just now",
      createdAt: now.toISOString(),
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
      if (isNewConversation) {
        // Create conversation in DB and receive AI reply from backend
        const { data: createdConv } = await api.post<Conversation>('/conversations', {
          message: trimmedDraft,
        });
        if (requestId.current !== currentRequestId) return;

        setActiveConversationId(createdConv.id);
        setActiveTitle(createdConv.title);
        setMessages(createdConv.messages);

        // Seamlessly update URL to /c/[newConvoId] without page reload
        window.history.replaceState(null, "", `/c/${createdConv.id}`);
      } else if (targetConversationId) {
        // Send message to existing conversation
        const { data: result } = await api.post<{
          userMessage: ChatMessage;
          assistantMessage: ChatMessage;
        }>(`/conversations/${targetConversationId}/messages`, {
          message: trimmedDraft,
        });
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
          : "sidebar-hidden [&_.sidebar]:w-0! [&_.sidebar]:flex-[0_0_0px]! [&_.sidebar]:px-0! [&_.sidebar]:border-r-transparent! [&_.sidebar]:opacity-0! [&_.sidebar]:pointer-events-none!"
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
                  className="chat-error mb-2.25 text-[#a25e50] dark:text-[#d89180] text-[11px] leading-[1.4] text-center"
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
