import { useEffect, useRef } from "react";
import { ChatMessage } from "./ChatMessage";
import type { ChatMessageItem } from "../types/chat.types";

interface ChatWindowProps {
  messages: ChatMessageItem[];
  isLoading?: boolean;
}

export function ChatWindow({ messages, isLoading = false }: ChatWindowProps) {
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, isLoading]);

  return (
    <section ref={listRef} className="chatbot-window" aria-live="polite">
      {messages.map((message) => (
        <ChatMessage key={message.id} role={message.role} content={message.content} />
      ))}
      {isLoading ? <div className="chatbot-loading">Pasum AI is processing...</div> : null}
    </section>
  );
}
