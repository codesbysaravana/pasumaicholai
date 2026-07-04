import { useEffect, useMemo, useRef, useState } from "react";
import {
  buildExpertChatSocketUrl,
  getMessages,
  parseExpertChatSocketPayload,
  sendVoiceMessage,
  type ChatSender,
  type ExpertChatMessage,
} from "../../../services/expertChatApi";
import { useAuth } from "../../../context/AuthContext";
import { MessageBubble } from "./MessageBubble";
import { VoiceRecorder } from "./VoiceRecorder";

interface ChatWindowProps {
  sessionId: string;
  title: string;
  senderRole: ChatSender;
}

function isExpertChatMessage(value: unknown): value is ExpertChatMessage {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const data = value as Partial<ExpertChatMessage>;
  return (
    typeof data.id === "string" &&
    typeof data.session_id === "string" &&
    (data.sender === "farmer" || data.sender === "expert") &&
    typeof data.text === "string" &&
    typeof data.timestamp === "string"
  );
}

function isExpertChatMessageArray(value: unknown): value is ExpertChatMessage[] {
  return Array.isArray(value) && value.every((item) => isExpertChatMessage(item));
}

export function ChatWindow({ sessionId, title, senderRole }: ChatWindowProps) {
  const { auth } = useAuth();
  const [messages, setMessages] = useState<ExpertChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [isPeerTyping, setIsPeerTyping] = useState(false);
  const [peerPresence, setPeerPresence] = useState<"online" | "offline">("offline");
  const socketRef = useRef<WebSocket | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const typingStopTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const history = await getMessages(sessionId);
        setMessages(history);
      } catch {
        setMessages([]);
      }
    };
    void loadHistory();
  }, [sessionId]);

  useEffect(() => {
    const socket = new WebSocket(
      buildExpertChatSocketUrl(sessionId, {
        userId: auth?.userId,
        sender: senderRole,
      }),
    );
    socketRef.current = socket;

    socket.onopen = () => {
      setIsSocketConnected(true);
      socket.send(
        JSON.stringify({
          type: "join_session",
          data: {
            user_id: auth?.userId ?? "unknown-user",
            sender: senderRole,
          },
        }),
      );
    };
    socket.onclose = () => setIsSocketConnected(false);
    socket.onerror = () => setIsSocketConnected(false);
    socket.onmessage = (event) => {
      const payload = parseExpertChatSocketPayload(String(event.data));
      if (!payload) {
        return;
      }
      if (payload.type === "session_history" && isExpertChatMessageArray(payload.data)) {
        setMessages(payload.data);
      }
      if (payload.type === "new_message" && isExpertChatMessage(payload.data)) {
        const incomingMessage = payload.data;
        setMessages((prev) => [...prev, incomingMessage]);
      }
      if (payload.type === "typing_start" && typeof payload.data === "object" && payload.data !== null) {
        const data = payload.data as { sender?: unknown; user_id?: unknown };
        if (data.sender !== senderRole && data.user_id !== auth?.userId) {
          setIsPeerTyping(true);
        }
      }
      if (payload.type === "typing_stop" && typeof payload.data === "object" && payload.data !== null) {
        const data = payload.data as { sender?: unknown; user_id?: unknown };
        if (data.sender !== senderRole && data.user_id !== auth?.userId) {
          setIsPeerTyping(false);
        }
      }
      if (payload.type === "presence_update" && typeof payload.data === "object" && payload.data !== null) {
        const data = payload.data as { sender?: unknown; user_id?: unknown; status?: unknown };
        if (data.sender !== senderRole && data.user_id !== auth?.userId && (data.status === "online" || data.status === "offline")) {
          setPeerPresence(data.status);
        }
      }
    };

    return () => {
      socket.close();
      socketRef.current = null;
    };
  }, [auth?.userId, senderRole, sessionId]);

  useEffect(() => {
    if (!listRef.current) {
      return;
    }
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages]);

  useEffect(() => {
    return () => {
      if (typingStopTimeoutRef.current) {
        window.clearTimeout(typingStopTimeoutRef.current);
      }
    };
  }, []);

  const canSend = useMemo(() => draft.trim().length > 0 && isSocketConnected, [draft, isSocketConnected]);

  const sendTextMessage = () => {
    if (!socketRef.current || !canSend) {
      return;
    }
    socketRef.current.send(
      JSON.stringify({
        type: "text_message",
        data: {
          sender: senderRole,
          text: draft.trim(),
        },
      }),
    );
    setDraft("");
    setIsPeerTyping(false);
  };

  const handleVoiceRecorded = async (audioBlob: Blob) => {
    await sendVoiceMessage({
      sessionId,
      sender: senderRole,
      audioBlob,
    });
  };

  return (
    <section className="consult-chat-card">
      {title && (
        <header className="consult-chat-header">
          <h2>{title}</h2>
          <span className={`tag-chip ${isSocketConnected ? "consult-live-chip" : ""}`}>
            {isSocketConnected ? `Live - Expert ${peerPresence}` : "Reconnecting"}
          </span>
        </header>
      )}


      <div className="consult-messages" ref={listRef}>
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} currentSender={senderRole} />
        ))}
        {isPeerTyping ? <p className="consult-typing">Typing...</p> : null}
      </div>

      <div className="consult-input-row">
        <input
          className="input"
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
            if (socketRef.current?.readyState === WebSocket.OPEN) {
              socketRef.current.send(
                JSON.stringify({
                  type: "typing_start",
                  data: {
                    sender: senderRole,
                    user_id: auth?.userId ?? "unknown-user",
                  },
                }),
              );
            }
            if (typingStopTimeoutRef.current) {
              window.clearTimeout(typingStopTimeoutRef.current);
            }
            typingStopTimeoutRef.current = window.setTimeout(() => {
              if (socketRef.current?.readyState === WebSocket.OPEN) {
                socketRef.current.send(
                  JSON.stringify({
                    type: "typing_stop",
                    data: {
                      sender: senderRole,
                      user_id: auth?.userId ?? "unknown-user",
                    },
                  }),
                );
              }
            }, 700);
          }}
          placeholder="Type your message..."
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              sendTextMessage();
            }
          }}
        />
        <button type="button" className="btn btn-primary" disabled={!canSend} onClick={sendTextMessage}>
          Send
        </button>
        <VoiceRecorder onRecorded={handleVoiceRecorded} disabled={!isSocketConnected} />
      </div>
    </section>
  );
}
