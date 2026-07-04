export type ChatRole = "user" | "assistant";

export interface ChatMessageItem {
  id: string;
  role: ChatRole;
  content: string;
}

export interface ChatReply {
  reply: string;
}

export interface VoiceTranscript {
  transcript: string;
}

export interface AudioPayload {
  audioBase64: string;
  audioMimeType: string;
}
