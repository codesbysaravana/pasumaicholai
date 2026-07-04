import { http } from "../../../../api/http";
import type { AudioPayload, ChatReply, VoiceTranscript } from "../types/chat.types";

async function toBase64(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}

export async function sendMessage(text: string): Promise<ChatReply> {
  return http<ChatReply>("/chatbot/chat", {
    method: "POST",
    body: { message: text },
  });
}

export async function sendVoice(file: File): Promise<VoiceTranscript> {
  const audioBase64 = await toBase64(file);
  return http<VoiceTranscript>("/chatbot/voice", {
    method: "POST",
    body: {
      audioBase64,
      mimeType: file.type || "audio/webm",
    },
  });
}

export async function sendVoiceAgent(file: File): Promise<AudioPayload & { reply?: string }> {
  const audioBase64 = await toBase64(file);
  return http<AudioPayload & { reply?: string }>("/chatbot/agent", {
    method: "POST",
    body: {
      audioBase64,
      mimeType: file.type || "audio/webm",
    },
  });
}

export async function playTTS(text: string): Promise<AudioPayload> {
  return http<AudioPayload>("/chatbot/tts", {
    method: "POST",
    body: { text },
  });
}
