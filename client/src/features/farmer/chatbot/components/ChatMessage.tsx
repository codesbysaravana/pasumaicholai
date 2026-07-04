import type { ChatRole } from "../types/chat.types";

interface ChatMessageProps {
  role: ChatRole;
  content: string;
}

export function ChatMessage({ role, content }: ChatMessageProps) {
  const className = role === "user" ? "chatbot-message chatbot-message-user" : "chatbot-message chatbot-message-assistant";

  return <div className={className}>{content}</div>;
}
