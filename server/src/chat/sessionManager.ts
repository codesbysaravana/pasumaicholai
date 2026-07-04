import { randomUUID } from 'crypto';

export type ChatSender = 'farmer' | 'expert';

export interface ChatSession {
  session_id: string;
  farmer_id: string;
  expert_id: string;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  sender: ChatSender;
  text: string;
  audio_url?: string;
  timestamp: string;
}

const sessions = new Map<string, ChatSession>();
const messages = new Map<string, ChatMessage[]>();

export function createSession(farmerId: string, expertId: string): ChatSession {
  const session: ChatSession = {
    session_id: randomUUID(),
    farmer_id: farmerId,
    expert_id: expertId,
    created_at: new Date().toISOString(),
  };

  sessions.set(session.session_id, session);
  messages.set(session.session_id, []);

  return session;
}

export function getSession(sessionId: string): ChatSession | undefined {
  return sessions.get(sessionId);
}

export function getMessages(sessionId: string): ChatMessage[] {
  return messages.get(sessionId) ?? [];
}

export function addMessage(message: ChatMessage): ChatMessage {
  const sessionMessages = messages.get(message.session_id) ?? [];
  sessionMessages.push(message);
  messages.set(message.session_id, sessionMessages);
  return message;
}

export function getSessionsByExpert(expertId: string): ChatSession[] {
  return [...sessions.values()]
    .filter((session) => session.expert_id === expertId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function getAllSessions(): ChatSession[] {
  return [...sessions.values()].sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function getSessionByParticipants(farmerId: string, expertId: string): ChatSession | undefined {
  return [...sessions.values()].find((session) => session.farmer_id === farmerId && session.expert_id === expertId);
}
