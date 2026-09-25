import type {
  FormEvent,
  FormEventHandler,
  KeyboardEvent,
  Dispatch,
  SetStateAction,
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

export default function Composer({
  draft,
  setDraft,
  sendMessage,
  isLoading,
  welcome = false,
}: ComposerProps) {
  const handleSubmit: FormEventHandler<HTMLFormElement> = (event) => {
    sendMessage(event);
  };

  return (
    <form
      className={`composer ${welcome ? "welcome-composer" : ""}`}
      onSubmit={handleSubmit}
    >
      <textarea
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            sendMessage(event);
          }
        }}
        placeholder={isLoading ? "Kero is thinking…" : "Message Kero…"}
        rows={1}
        aria-label="Message Kero"
        disabled={isLoading}
      />
      <div className="composer-actions">
        <button
          className="icon-button attach-button"
          type="button"
          aria-label="Attach a file"
        >
          <Icon name="paperclip" size={18} />
        </button>
        <button
          className="send-button"
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
