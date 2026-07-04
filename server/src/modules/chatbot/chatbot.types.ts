export interface AskTextPayload {
  message: string;
}

export interface TextToSpeechPayload {
  text: string;
}

export interface VoicePayload {
  audioBase64: string;
  mimeType?: string;
}

export interface ChatReply {
  reply: string;
}

export interface VoiceToTextResult {
  transcript: string;
}

export interface AudioResult {
  audioBase64: string;
  audioMimeType: string;
}

export interface VoiceAgentResult extends AudioResult {
  reply?: string;
}
