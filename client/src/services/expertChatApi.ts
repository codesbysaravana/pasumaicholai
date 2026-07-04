import { API_BASE_URL } from "../api/http";

export interface ExpertChatExpert {
  id: string;
  name: string;
  specialization: string;
  email: string;
  phone: string | null;
  status: "active" | "busy" | "offline";
}

export interface ExpertChatSession {
  session_id: string;
  farmer_id: string;
  expert_id: string;
  created_at: string;
}

export type ChatSender = "farmer" | "expert";

export interface ExpertChatMessage {
  id: string;
  session_id: string;
  sender: ChatSender;
  text: string;
  audio_url?: string;
  timestamp: string;
}

export interface ExpertChatSocketOptions {
  userId?: string;
  sender?: ChatSender;
}

export type ExpertChatSocketEvent =
  | "session_history"
  | "new_message"
  | "typing_start"
  | "typing_stop"
  | "presence_update"
  | "error";

export interface ExpertChatSocketPayload {
  type: ExpertChatSocketEvent;
  data: unknown;
}

interface ApiPayload<T> {
  success?: boolean;
  data?: T;
  message?: string;
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: "include",
    ...init,
  });

  const payload = (await response.json()) as ApiPayload<T>;
  if (!response.ok || !payload.success) {
    throw new Error(payload.message ?? "Request failed");
  }
  return payload.data as T;
}

export async function getExperts(): Promise<ExpertChatExpert[]> {
  return requestJson<ExpertChatExpert[]>("/expert-chat/experts", { method: "GET" });
}

export async function startSession(expertId: string): Promise<ExpertChatSession> {
  return requestJson<ExpertChatSession>("/expert-chat/start-session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      expert_id: expertId,
    }),
  });
}

export async function getMessages(sessionId: string): Promise<ExpertChatMessage[]> {
  return requestJson<ExpertChatMessage[]>(`/expert-chat/messages/${sessionId}`, { method: "GET" });
}

export async function getExpertSessions(expertId?: string): Promise<ExpertChatSession[]> {
  const query = expertId ? `?${new URLSearchParams({ expert_id: expertId }).toString()}` : "";
  return requestJson<ExpertChatSession[]>(`/expert-chat/sessions${query}`, { method: "GET" });
}

export async function sendVoiceMessage(input: {
  sessionId: string;
  sender: ChatSender;
  audioBlob: Blob;
}): Promise<ExpertChatMessage> {
  const formData = new FormData();
  formData.append("session_id", input.sessionId);
  formData.append("sender", input.sender);
  formData.append("audio", input.audioBlob, "voice.webm");

  return requestJson<ExpertChatMessage>("/expert-chat/voice-message", {
    method: "POST",
    body: formData,
  });
}

export function buildExpertChatSocketUrl(sessionId: string, options?: ExpertChatSocketOptions): string {
  const base = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "http://localhost:5000/api/v1";
  const normalized = base.replace(/\/api\/v1\/?$/, "");
  const wsBase = normalized.startsWith("https://") ? normalized.replace("https://", "wss://") : normalized.replace("http://", "ws://");
  const query = new URLSearchParams();
  if (options?.userId) {
    query.set("user_id", options.userId);
  }
  if (options?.sender) {
    query.set("sender", options.sender);
  }
  const qs = query.toString();
  return `${wsBase}/ws/expert-chat/${encodeURIComponent(sessionId)}${qs ? `?${qs}` : ""}`;
}

export function parseExpertChatSocketPayload(raw: string): ExpertChatSocketPayload | null {
  try {
    const parsed = JSON.parse(raw) as { type?: unknown; data?: unknown };
    const type = parsed.type;
    if (
      type !== "session_history" &&
      type !== "new_message" &&
      type !== "typing_start" &&
      type !== "typing_stop" &&
      type !== "presence_update" &&
      type !== "error"
    ) {
      return null;
    }

    return {
      type,
      data: parsed.data,
    };
  } catch {
    return null;
  }
}
