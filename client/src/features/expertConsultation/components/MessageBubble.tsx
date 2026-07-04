import type { ExpertChatMessage } from "../../../services/expertChatApi";

interface MessageBubbleProps {
  message: ExpertChatMessage;
  currentSender: "farmer" | "expert";
}

export function MessageBubble({ message, currentSender }: MessageBubbleProps) {
  const isOwnMessage = message.sender === currentSender;

  return (
    <article className={`consult-message ${isOwnMessage ? "consult-message-own" : "consult-message-peer"}`}>
      <p>{message.text}</p>
      {message.audio_url ? (
        <audio controls preload="none" className="consult-audio">
          <source src={message.audio_url} />
        </audio>
      ) : null}
      <span className="consult-time">{new Date(message.timestamp).toLocaleTimeString()}</span>
    </article>
  );
}
