import { useCallback } from "react";

export type VoiceLanguage = "en" | "ta";

const languageCodeByVoice: Record<VoiceLanguage, string> = {
  en: "en-US",
  ta: "ta-IN",
};

function pickVoice(voices: SpeechSynthesisVoice[], language: VoiceLanguage): SpeechSynthesisVoice | null {
  const target = languageCodeByVoice[language].toLowerCase();
  const exact = voices.find((voice) => voice.lang.toLowerCase() === target);
  if (exact) {
    return exact;
  }
  if (language === "ta") {
    return voices.find((voice) => voice.lang.toLowerCase().includes("ta")) ?? null;
  }
  return voices.find((voice) => voice.lang.toLowerCase().includes("en")) ?? null;
}

export function useVoiceOutput() {
  const isSupported = typeof window !== "undefined" && "speechSynthesis" in window;

  const cancel = useCallback(() => {
    if (!isSupported) {
      return;
    }
    window.speechSynthesis.cancel();
  }, [isSupported]);

  const speak = useCallback(
    async (text: string, language: VoiceLanguage) => {
      if (!isSupported || !text.trim()) {
        return;
      }

      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = languageCodeByVoice[language];
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
    },
    [isSupported],
  );

  return {
    isSupported,
    speak,
    cancel,
  };
}
