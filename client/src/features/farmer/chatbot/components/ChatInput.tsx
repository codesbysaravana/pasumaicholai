import { useState, type FormEvent } from "react";
import { VoiceRecorder } from "./VoiceRecorder";

interface ChatInputProps {
  onSendMessage: (text: string) => Promise<void> | void;
  onVoiceCaptured: (file: File, transcriptHint: string) => Promise<void>;
  disabled?: boolean;
}

export function ChatInput({ onSendMessage, onVoiceCaptured, disabled = false }: ChatInputProps) {
  const [value, setValue] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = value.trim();
    if (!text) return;
    setValue("");
    await onSendMessage(text);
  };

  return (
    <div className="chatbot-input-container">
      <form className="chatbot-input-row" onSubmit={handleSubmit}>
        <input
          id="chatbot-input"
          className="chatbot-input-field"
          placeholder="Type your message here..."
          value={value}
          disabled={disabled}
          onChange={(e) => setValue(e.target.value)}
          autoComplete="off"
        />
        <div className="chatbot-input-actions">
          <VoiceRecorder onVoiceCaptured={onVoiceCaptured} disabled={disabled} />
          <button
            type="submit"
            className="chatbot-send-btn"
            disabled={disabled || value.trim().length === 0}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
}
