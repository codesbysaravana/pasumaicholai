import type { VoiceLanguage } from "./voiceFlowConfig";

function normalizeLanguage(language: VoiceLanguage): string {
  return language;
}

function pickVoice(voices: SpeechSynthesisVoice[], language: VoiceLanguage): SpeechSynthesisVoice | null {
  const target = normalizeLanguage(language).toLowerCase();
  const exactMatch = voices.find((voice) => voice.lang.toLowerCase() === target);
  if (exactMatch) {
    return exactMatch;
  }

  if (language === "ta-IN") {
    return voices.find((voice) => voice.lang.toLowerCase().includes("ta")) ?? null;
  }

  return voices.find((voice) => voice.lang.toLowerCase().includes("en")) ?? null;
}

export function isSpeechSynthesisSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function cancelSpeech(): void {
  if (!isSpeechSynthesisSupported()) {
    return;
  }
  window.speechSynthesis.cancel();
}

export async function speakText(text: string, language: VoiceLanguage): Promise<void> {
  if (!isSpeechSynthesisSupported() || !text.trim()) {
    return;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = normalizeLanguage(language);
  utterance.rate = 0.95;
  utterance.pitch = 1;

  const voices = window.speechSynthesis.getVoices();
  const selectedVoice = pickVoice(voices, language);
  if (selectedVoice) {
    utterance.voice = selectedVoice;
  }

  await new Promise<void>((resolve) => {
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    window.speechSynthesis.speak(utterance);
  });
}
