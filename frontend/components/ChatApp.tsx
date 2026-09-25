"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type UIEventHandler,
} from "react";
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

export default function ChatApp() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<
    number | null
  >(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
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
        setConversations(savedConversations);
        if (savedConversations.length > 0) {
          const latestConversation = savedConversations[0];
          setActiveConversationId(latestConversation.id);
          setMessages(latestConversation.messages);
        }
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

  const startNewChat = useCallback(() => {
    setMessages([]);
    setActiveConversationId(null);
    setDraft("");
    setError("");
    setIsLoading(false);
    requestId.current += 1;
  }, []);

  useEffect(() => {
    const handleNewChatShortcut = (event: globalThis.KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        startNewChat();
      }
    };

    window.addEventListener("keydown", handleNewChatShortcut);
    return () => window.removeEventListener("keydown", handleNewChatShortcut);
  }, [startNewChat]);

  const selectConversation = (conversation: Conversation) => {
    requestId.current += 1;
    setActiveConversationId(conversation.id);
    setMessages(conversation.messages);
    setDraft("");
    setError("");
    setIsLoading(false);
  };

  const filteredConversations = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return conversations.filter((conversation) =>
      `${conversation.title} ${conversation.preview}`
        .toLowerCase()
        .includes(query),
    );
  }, [conversations, searchQuery]);

  const activeTitle =
    conversations.find(
      (conversation) => conversation.id === activeConversationId,
    )?.title || "Kero";

  return (
    <main
      className={`app-shell ${darkMode ? "dark-mode" : ""} ${
        sidebarOpen ? "" : "sidebar-hidden"
      }`}
    >
      <Sidebar
        conversations={filteredConversations}
        totalConversations={conversations.length}
        searchQuery={searchQuery}
        searchOpen={searchOpen}
        onToggleSearch={() => setSearchOpen((open) => !open)}
        onSearchChange={setSearchQuery}
        activeConversationId={activeConversationId}
        onSelectConversation={selectConversation}
        onNewChat={startNewChat}
      />

      <section className="chat-panel">
        <ChatHeader
          title={activeTitle}
          sidebarOpen={sidebarOpen}
          darkMode={darkMode}
          onToggleSidebar={() => setSidebarOpen((current) => !current)}
          onToggleTheme={toggleTheme}
        />

        <div className="chat-content">
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
            <div className="composer-wrap">
              {error && (
                <p className="chat-error" role="alert">
                  {error}
                </p>
              )}
              <Composer
                draft={draft}
                setDraft={setDraft}
                sendMessage={sendMessage}
                isLoading={isLoading}
              />
              <p className="composer-hint">
                Kero is here to help you think things through.
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
