import type {
  Dispatch,
  FormEvent,
  KeyboardEvent,
  RefObject,
  SetStateAction,
  UIEventHandler,
} from "react";
import type { ChatMessage } from "@/lib/types";
import MessageRow from "./MessageRow";
import TypingIndicator from "./TypingIndicator";
import WelcomeState from "./WelcomeState";

interface MessageThreadProps {
  messages: ChatMessage[];
  isLoading: boolean;
  draft: string;
  setDraft: Dispatch<SetStateAction<string>>;
  sendMessage: (
    event: FormEvent<HTMLFormElement> | KeyboardEvent<HTMLTextAreaElement>,
  ) => void;
  threadRef: RefObject<HTMLDivElement | null>;
  onScroll: UIEventHandler<HTMLDivElement>;
}

export default function MessageThread({
  messages,
  isLoading,
  draft,
  setDraft,
  sendMessage,
  threadRef,
  onScroll,
}: MessageThreadProps) {
  const isEmpty = messages.length === 0;

  return (
    <div
      className={`thread ${isEmpty ? "thread-empty" : ""}`}
      ref={threadRef}
      onScroll={onScroll}
    >
      {isEmpty ? (
        <WelcomeState
          draft={draft}
          setDraft={setDraft}
          sendMessage={sendMessage}
          isLoading={isLoading}
        />
      ) : (
        <>
          <div className="date-divider">
            <span>Today</span>
          </div>
          {messages.map((message) => (
            <MessageRow key={message.id} message={message} />
          ))}
          {isLoading && (
            <article className="message-row assistant loading-row">
              <div className="avatar assistant-avatar">K</div>
              <div className="message-block">
                <div className="message-author">
                  Kero <time>Thinking…</time>
                </div>
                <TypingIndicator />
              </div>
            </article>
          )}
        </>
      )}
    </div>
  );
}
