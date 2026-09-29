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
      className={`thread min-h-0 flex-1 overflow-y-auto pt-[43px] max-[700px]:pt-[30px] px-0 pb-[30px] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden ${
        isEmpty ? "thread-empty flex items-center justify-center pb-[120px]" : ""
      }`}
      ref={threadRef}
      onScroll={onScroll}
      role="log"
      aria-live="polite"
      aria-busy={isLoading}
      aria-label="Conversation with Kero"
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
          <div className="date-divider flex items-center gap-3 mb-[34px] text-[#6f6862] dark:text-[#817a73] text-[10px] uppercase tracking-[0.08em] before:content-[''] before:h-px before:flex-1 before:bg-[#eeeae5] dark:before:bg-[#302e2c] after:content-[''] after:h-px after:flex-1 after:bg-[#eeeae5] dark:after:bg-[#302e2c]">
            <span>Today</span>
          </div>
          {messages.map((message) => (
            <MessageRow key={message.id} message={message} />
          ))}
          {isLoading && (
            <article className="message-row assistant loading-row flex gap-3 mb-1">
              <div className="avatar assistant-avatar shrink-0 w-[27px] h-[27px] grid place-items-center rounded-full text-white bg-[#b98170] font-manrope text-[12px] font-semibold">
                K
              </div>
              <div className="message-block max-w-[580px]">
                <div className="message-author mb-1.5 text-[#7a736c] dark:text-[#817a73] text-[11px]">
                  Kero <time className="ml-[7px] text-[#8f8881] dark:text-[#817a73] text-[10px]">Thinking…</time>
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
