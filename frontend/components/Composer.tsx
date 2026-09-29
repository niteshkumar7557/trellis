"use client";

import {
  useEffect,
  useRef,
  type FormEvent,
  type FormEventHandler,
  type KeyboardEvent,
  type Dispatch,
  type SetStateAction,
} from "react";
import Icon from "./Icon";

interface ComposerProps {
  draft: string;
  setDraft: Dispatch<SetStateAction<string>>;
  sendMessage: (
    event: FormEvent<HTMLFormElement> | KeyboardEvent<HTMLTextAreaElement>,
  ) => void;
  isLoading: boolean;
  welcome?: boolean;
}

const MAX_TEXTAREA_HEIGHT = 125;

export default function Composer({
  draft,
  setDraft,
  sendMessage,
  isLoading,
  welcome = false,
}: ComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Grow the textarea with its content instead of trapping lines in a
  // one-row scroll box.
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(
      textarea.scrollHeight,
      MAX_TEXTAREA_HEIGHT,
    )}px`;
  }, [draft]);

  const handleSubmit: FormEventHandler<HTMLFormElement> = (event) => {
    sendMessage(event);
  };

  return (
    <form
      className={`composer min-h-14.75 p-2 pl-[17px] flex items-end gap-2.5 border border-[#dfdad4] dark:border-[#45413d] rounded-[11px] bg-white dark:bg-[#252422] shadow-[0_5px_18px_rgba(50,43,37,0.04)] dark:shadow-[0_5px_18px_rgba(0,0,0,0.12)] transition-[border-color,box-shadow] duration-[180ms] ease-out focus-within:border-[#c6a196] focus-within:shadow-[0_5px_18px_rgba(141,87,70,0.08)] dark:focus-within:border-[#9c6b5d] dark:focus-within:shadow-[0_5px_18px_rgba(0,0,0,0.2)] ${
        welcome ? "welcome-composer mt-6.5 text-left" : ""
      }`}
      onSubmit={handleSubmit}
    >
      <textarea
        ref={textareaRef}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key !== "Enter" || event.shiftKey) return;
          // Never send mid-composition (e.g. IME candidate selection).
          if (event.nativeEvent.isComposing) return;
          if (isLoading) return;
          event.preventDefault();
          sendMessage(event);
        }}
        placeholder="Message Kero…"
        rows={1}
        aria-label="Message Kero"
        className="min-h-9.5 max-h-31.25 flex-1 py-2.25 px-0 resize-none border-0 outline-none focus:outline-none focus:ring-0 focus:border-0 focus:shadow-none text-[#3b3733] dark:text-[#e6dfd9] bg-transparent text-[13px] leading-[1.45] placeholder-[#8f8881] dark:placeholder-[#77716b]"
      />
      <div className="composer-actions flex items-center gap-0.5 pb-[5px]">
        <button
          className="send-button w-8 h-8 grid place-items-center border-0 rounded-lg text-white bg-[#b8806f] hover:enabled:bg-[#a86d5d] disabled:cursor-default disabled:opacity-[0.38] transition-[background-color,opacity] duration-[180ms] ease-out cursor-pointer"
          type="submit"
          aria-label="Send message"
          disabled={!draft.trim() || isLoading}
        >
          <Icon name="send" size={17} />
        </button>
      </div>
    </form>
  );
}
