import type { Dispatch, FormEvent, KeyboardEvent, SetStateAction } from "react";
import Composer from "./Composer";
import Icon from "./Icon";

interface WelcomeStateProps {
  draft: string;
  setDraft: Dispatch<SetStateAction<string>>;
  sendMessage: (
    event: FormEvent<HTMLFormElement> | KeyboardEvent<HTMLTextAreaElement>,
  ) => void;
  isLoading: boolean;
}

export default function WelcomeState({
  draft,
  setDraft,
  sendMessage,
  isLoading,
}: WelcomeStateProps) {
  return (
    <div className="welcome-state">
      <div className="welcome-icon">
        <Icon name="sparkle" size={22} />
      </div>
      <h1>What&apos;s on your mind?</h1>
      <p>Ask anything, and Kero will help you think it through.</p>
      <Composer
        draft={draft}
        setDraft={setDraft}
        sendMessage={sendMessage}
        isLoading={isLoading}
        welcome
      />
      <p className="composer-hint welcome-hint">
        Kero is here to help you think things through.
      </p>
    </div>
  );
}
