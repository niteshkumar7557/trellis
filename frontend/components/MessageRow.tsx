import type { ChatMessage } from "@/app/_types";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { formatMessageTime } from "@/app/_utils/formatTime";

interface MessageRowProps {
  message: ChatMessage;
}

export default function MessageRow({ message }: MessageRowProps) {
  const isAssistant = message.role === "assistant";

  return (
    <article
      className={`message-row ${message.role} flex gap-3 mb-7.5 ${
        isAssistant ? "" : "justify-end"
      }`}
    >
      {isAssistant && (
        <div className="avatar assistant-avatar shrink-0 w-6.75 h-6.75 grid place-items-center rounded-full text-white bg-[#b98170] font-manrope text-[12px] font-semibold">
          K
        </div>
      )}
      <div
        className={`message-block ${
          isAssistant ? "max-w-145" : "max-w-127.5 text-right"
        }`}
      >
        <div className="message-author mb-1.5 text-[#7a736c] dark:text-[#817a73] text-[11px]">
          {isAssistant ? "Kero" : "You"}{" "}
          <time className="ml-1.75 text-[#8f8881] dark:text-[#817a73] text-[10px]">
            {formatMessageTime(message.createdAt || message.time)}
          </time>
        </div>
        {isAssistant ? (
          <div className="markdown-body">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content}
            </ReactMarkdown>
          </div>
        ) : (
          <p className="inline-block py-3 px-3.75 rounded-[14px_14px_3px_14px] text-white dark:text-[#f5f1ed] bg-[#3b3835] dark:bg-[#b8806f] text-[15px] max-[700px]:text-[14px] leading-normal tracking-[-0.01em] text-left">
            {message.content}
          </p>
        )}
      </div>
    </article>
  );
}
