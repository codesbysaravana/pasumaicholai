import { useCallback, useState } from "react";
import { API_BASE_URL } from "../../../api/http";
import type { VoiceLanguage } from "./useVoiceOutput";

type VoiceInputStatus = "idle" | "listening" | "processing";

interface SpeechRecognitionAlternativeLike {
  transcript?: string;
  confidence?: number;
}

interface SpeechRecognitionResultLike {
  0?: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionEventLike {
  results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionErrorLike {
  error?: string;
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorLike) => void) | null;
  onend: (() => void) | null;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

interface ApiPayload<T> {
  success?: boolean;
  data?: T;
  message?: string;
}

export interface VoiceInputResult {
  text: string;
  confidence?: number;
  source: "browser" | "fallback";
}

function mapLanguage(language: VoiceLanguage): string {
  return language === "ta" ? "ta-IN" : "en-US";
}

function getRecognitionCtor(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") {
    return null;
  }
  const browserWindow = window as Window & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return browserWindow.SpeechRecognition ?? browserWindow.webkitSpeechRecognition ?? null;
}

async function recordAudioBlob(durationMs: number): Promise<Blob> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  try {
    const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "audio/webm";
    const recorder = new MediaRecorder(stream, { mimeType });
    const chunks: BlobPart[] = [];

    await new Promise<void>((resolve, reject) => {
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };
      recorder.onerror = () => reject(new Error("Audio recording failed."));
      recorder.onstop = () => resolve();
      recorder.start();
      window.setTimeout(() => {
        if (recorder.state !== "inactive") {
          recorder.stop();
        }
      }, durationMs);
    });

    return new Blob(chunks, { type: mimeType });
  } finally {
    stream.getTracks().forEach((track) => track.stop());
  }
}

async function transcribeViaFallback(blob: Blob): Promise<string> {
  const extension = blob.type.includes("wav") ? "wav" : blob.type.includes("mp4") ? "m4a" : "webm";
  const file = new File([blob], `marketplace-voice-${Date.now()}.${extension}`, {
    type: blob.type || "audio/webm",
  });
  const formData = new FormData();
  formData.append("audio", file);

  const response = await fetch(`${API_BASE_URL}/farmer/complaints/transcribe-voice`, {
    method: "POST",
    body: formData,
    credentials: "include",
  });
  const payload = (await response.json()) as ApiPayload<{ transcript?: string }>;
  if (!response.ok || !payload.success) {
    throw new Error(payload.message ?? "Voice transcription fallback failed.");
  }
  const transcript = payload.data?.transcript?.trim() ?? "";
  if (!transcript) {
    throw new Error("No speech detected from fallback transcription.");
  }
  return transcript;
}

export function useVoiceInput() {
  const [status, setStatus] = useState<VoiceInputStatus>("idle");
  const [detectedText, setDetectedText] = useState("");
  const [lastSource, setLastSource] = useState<"browser" | "fallback" | null>(null);

  const listenWithBrowser = useCallback(async (language: VoiceLanguage): Promise<VoiceInputResult> => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      throw new Error("Browser speech recognition is not supported.");
    }

    setStatus("listening");
    return new Promise<VoiceInputResult>((resolve, reject) => {
      const recognition = new Ctor();
      recognition.lang = mapLanguage(language);
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      let resolved = false;

      recognition.onresult = (event) => {
        const alt = event.results[0]?.[0];
        const transcript = alt?.transcript?.trim() ?? "";
        if (!transcript) {
          return;
        }
        resolved = true;
        setDetectedText(transcript);
        setLastSource("browser");
        setStatus("idle");
        resolve({
          text: transcript,
          confidence: alt?.confidence,
          source: "browser",
        });
        recognition.stop();
      };

      recognition.onerror = (event) => {
        if (resolved) {
          return;
        }
        resolved = true;
        setStatus("idle");
        reject(new Error(event.error || "Speech recognition failed."));
      };

      recognition.onend = () => {
        if (resolved) {
          return;
        }
        resolved = true;
        setStatus("idle");
        reject(new Error("No speech detected."));
      };

      recognition.start();
    });
  }, []);

  const listen = useCallback(
    async (language: VoiceLanguage): Promise<VoiceInputResult> => {
      try {
        return await listenWithBrowser(language);
      } catch {
        setStatus("listening");
        const audioBlob = await recordAudioBlob(4500);
        setStatus("processing");
        const transcript = await transcribeViaFallback(audioBlob);
        setStatus("idle");
        setDetectedText(transcript);
        setLastSource("fallback");
        return {
          text: transcript,
          source: "fallback",
        };
      }
    },
    [listenWithBrowser],
  );

  return {
    status,
    detectedText,
    lastSource,
    listen,
  };
}
