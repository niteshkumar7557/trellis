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
import type { ChatMessage, Conversation, WireMessage } from "@/lib/types";
import { createFallbackTitle, requestChat, requestTitle } from "@/lib/api";
import { loadChats, saveChats } from "@/lib/storage";
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
  initialMessages?: ChatMessage[];
  initialTitle?: string;
}

export default function ChatApp({
  initialMessages = EMPTY_MESSAGES,
  initialTitle,
}: ChatAppProps = {}) {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<
    number | null
  >(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  const { darkMode, toggleTheme } = useTheme();

  const requestId = useRef(0);
  const threadRef = useRef<HTMLDivElement>(null);
  const shouldScrollToLatest = useRef(false);

  useEffect(() => {
    let isMounted = true;

    const restoreConversations = async () => {
      try {
        const savedConversations = await loadChats();
        if (!isMounted || !Array.isArray(savedConversations)) return;
        // Load the list so new conversations are persisted correctly,
        // but never auto-open a previous chat — '/' is always a blank slate.
        setConversations(savedConversations);
      } catch (restoreError) {
        if (isMounted) {
          setError(
            restoreError instanceof Error
              ? restoreError.message
              : "Saved conversations could not be restored.",
          );
        }
      } finally {
        if (isMounted) setIsHydrated(true);
      }
    };

    restoreConversations();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    saveChats(conversations).catch(() => {});
  }, [conversations, isHydrated]);

  const scrollToLatest = useCallback((behavior: ScrollBehavior = "smooth") => {
    if (!threadRef.current) return;
    threadRef.current.scrollTo({
      top: threadRef.current.scrollHeight,
      behavior,
    });
    setShowScrollButton(false);
  }, []);

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

  const sendMessage = async (event: SendEvent) => {
    event.preventDefault();
    const trimmedDraft = draft.trim();
    if (!trimmedDraft) return;

    const messageId = Date.now();
    const conversationId = activeConversationId || messageId;
    const isNewConversation = !activeConversationId;
    const nextMessages: ChatMessage[] = [
      ...messages,
      { id: messageId, role: "user", content: trimmedDraft, time: "Just now" },
    ];
    const currentRequestId = requestId.current + 1;
    requestId.current = currentRequestId;
    shouldScrollToLatest.current = true;
    setMessages(nextMessages);

    if (isNewConversation) {
      setActiveConversationId(conversationId);
      setConversations((current) => [
        {
          id: conversationId,
          title: createFallbackTitle(nextMessages),
          preview: trimmedDraft,
          time: "Just now",
          messages: nextMessages,
        },
        ...current,
      ]);
    } else {
      setConversations((current) =>
        current.map((conversation) =>
          conversation.id === conversationId
            ? {
                ...conversation,
                preview: trimmedDraft,
                time: "Just now",
                messages: nextMessages,
              }
            : conversation,
        ),
      );
    }

    setDraft("");
    setError("");
    setIsLoading(true);

    try {
      const response = await requestChat(
        nextMessages.map(({ role, content }) => ({ role, content })),
      );
      if (requestId.current !== currentRequestId) return;

      const assistantMessage: ChatMessage = {
        id: Date.now() + 1,
        role: "assistant",
        content: response,
        time: "Just now",
      };
      setMessages((current) => [...current, assistantMessage]);
      setConversations((current) =>
        current.map((conversation) =>
          conversation.id === conversationId
            ? {
                ...conversation,
                preview: response,
                messages: [...conversation.messages, assistantMessage],
              }
            : conversation,
        ),
      );

      if (isNewConversation) {
        const titleMessages: WireMessage[] = [
          ...nextMessages,
          assistantMessage,
        ].map(({ role, content }) => ({ role, content }));

        requestTitle(titleMessages)
          .then((title) => {
            if (title?.trim()) {
              setConversations((current) =>
                current.map((conversation) =>
                  conversation.id === conversationId
                    ? { ...conversation, title: title.trim() }
                    : conversation,
                ),
              );
            }
          })
          .catch(() =>
            setConversations((current) =>
              current.map((conversation) =>
                conversation.id === conversationId
                  ? {
                      ...conversation,
                      title: createFallbackTitle(nextMessages),
                    }
                  : conversation,
              ),
            ),
          );
      }
    } catch (requestError) {
      if (requestId.current !== currentRequestId) return;
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Something went wrong while contacting Groq.",
      );
    } finally {
      if (requestId.current === currentRequestId) setIsLoading(false);
    }
  };

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

  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  const activeTitle =
    conversations.find(
      (conversation) => conversation.id === activeConversationId,
    )?.title ||
    initialTitle ||
    "Kero";

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
      <Sidebar />

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
              {error && (
                <p className="chat-error mb-[9px] text-[#a25e50] dark:text-[#d89180] text-[11px] leading-[1.4] text-center" role="alert">
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
