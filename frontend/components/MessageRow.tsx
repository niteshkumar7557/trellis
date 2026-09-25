import type { ChatMessage } from "@/lib/types";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MessageRowProps {
  message: ChatMessage;
}

export default function MessageRow({ message }: MessageRowProps) {
  const isAssistant = message.role === "assistant";

  return (
    <article className={`message-row ${message.role}`}>
      {isAssistant && <div className="avatar assistant-avatar">K</div>}
      <div className="message-block">
        <div className="message-author">
          {isAssistant ? "Kero" : "You"} <time>{message.time}</time>
        </div>
        {isAssistant ? (
          <div className="markdown-body">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content}
            </ReactMarkdown>
          </div>
        ) : (
          <p>{message.content}</p>
        )}
      </div>
    </article>
  );
}
