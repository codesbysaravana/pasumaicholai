import { useCallback, useMemo, useRef, useState } from "react";
import { VoiceAssistant, type VoiceLanguage, type VoiceListenResult } from "../components/VoiceAssistant";
import type { CropCategory } from "../types";

type VoiceField = "cropName" | "quantity" | "pricePerKg" | "category" | "harvestDate" | "description" | "location";

interface VoiceQuestion {
  field: VoiceField;
  promptKey: keyof typeof voicePrompts.en;
}

interface VoiceAnswers {
  cropName?: string;
  quantity?: string;
  pricePerKg?: string;
  category?: CropCategory;
  harvestDate?: string;
  description?: string;
  location?: string;
}

const voicePrompts = {
  en: {
    greeting: "Hello farmer. I will help you list your crops in the marketplace.",
    commandHint: "You can say skip, repeat, or cancel at any time.",
    cropName: "What crop are you selling?",
    quantity: "How many kilograms are you selling?",
    pricePerKg: "What is the price per kilogram?",
    category: "Is it fruit, vegetable, grain, or other?",
    harvestDate: "When was this harvested?",
    description: "Please describe the crop quality.",
    location: "Where is your farm location?",
    captured: "Captured",
    cancelled: "Voice listing cancelled.",
    complete: "Voice form filling is complete. Please review and publish your listing.",
    notSupported: "Voice assistant is not supported in this browser.",
    failed: "Voice flow failed.",
  },
  ta: {
    greeting: "வணக்கம் விவசாயி. உங்கள் பயிரை சந்தையில் பட்டியலிட உதவுகிறேன்.",
    commandHint: "எப்போது வேண்டுமானாலும் தவிர்க்க, மீண்டும், அல்லது ரத்து என்று சொல்லலாம்.",
    cropName: "நீங்கள் எந்த பயிரை விற்க விரும்புகிறீர்கள்?",
    quantity: "நீங்கள் எத்தனை கிலோ விற்கிறீர்கள்?",
    pricePerKg: "ஒரு கிலோவிற்கு விலை என்ன?",
    category: "இது பழமா, காய்கறியா, தானியமா, அல்லது மற்றதா?",
    harvestDate: "இந்த பயிர் எப்போது அறுவடை செய்யப்பட்டது?",
    description: "பயிரின் தரத்தை விளக்குங்கள்.",
    location: "உங்கள் பண்ணை எங்கு உள்ளது?",
    captured: "பதிவு செய்யப்பட்டது",
    cancelled: "குரல் பட்டியல் ரத்து செய்யப்பட்டது.",
    complete: "குரல் வழி படிவம் முடிந்தது. தயவுசெய்து சரிபார்த்து வெளியிடுங்கள்.",
    notSupported: "இந்த உலாவியில் குரல் உதவி ஆதரிக்கப்படவில்லை.",
    failed: "குரல் செயல்முறை தோல்வியடைந்தது.",
  },
} as const;

const voiceQuestions: VoiceQuestion[] = [
  { field: "cropName", promptKey: "cropName" },
  { field: "quantity", promptKey: "quantity" },
  { field: "pricePerKg", promptKey: "pricePerKg" },
  { field: "category", promptKey: "category" },
  { field: "harvestDate", promptKey: "harvestDate" },
  { field: "description", promptKey: "description" },
  { field: "location", promptKey: "location" },
];

function normalizeCategory(rawText: string): CropCategory {
  const text = rawText.toLowerCase();
  if (text.includes("fruit") || text.includes("பழம்")) {
    return "fruit";
  }
  if (text.includes("vegetable") || text.includes("காய்கறி") || text.includes("காய்")) {
    return "vegetable";
  }
  if (text.includes("grain") || text.includes("தானியம்")) {
    return "grain";
  }
  return "other";
}

function normalizeDate(rawText: string): string {
  const text = rawText.toLowerCase();
  if (text.includes("today") || text.includes("இன்று")) {
    return new Date().toISOString().slice(0, 10);
  }
  if (text.includes("yesterday") || text.includes("நேற்று")) {
    const date = new Date();
    date.setDate(date.getDate() - 1);
    return date.toISOString().slice(0, 10);
  }

  const parsed = new Date(rawText);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }
  return parsed.toISOString().slice(0, 10);
}

export function useVoiceForm(language: VoiceLanguage = "en") {
  const assistantRef = useRef<VoiceAssistant | null>(null);
  const assistantLanguageRef = useRef<VoiceLanguage>("en");
  const [answers, setAnswers] = useState<VoiceAnswers>({});
  const [isRecording, setIsRecording] = useState(false);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(-1);
  const [error, setError] = useState<string | null>(null);

  const ensureAssistant = useCallback(() => {
    if (!assistantRef.current || assistantLanguageRef.current !== language) {
      assistantRef.current = new VoiceAssistant({ language });
      assistantLanguageRef.current = language;
    }
    return assistantRef.current;
  }, [language]);

  const stopVoiceFlow = useCallback(async (speakText?: string) => {
    const assistant = ensureAssistant();
    setIsVoiceActive(false);
    setIsRecording(false);
    setCurrentQuestionIndex(-1);
    if (speakText) {
      await assistant.speak(speakText);
    }
  }, [ensureAssistant]);

  const applyAnswer = useCallback((field: VoiceField, response: string) => {
    setAnswers((previous) => {
      if (field === "category") {
        return { ...previous, category: normalizeCategory(response) };
      }
      if (field === "harvestDate") {
        return { ...previous, harvestDate: normalizeDate(response) };
      }
      return { ...previous, [field]: response };
    });
  }, []);

  const processOneQuestion = useCallback(
    async (question: VoiceQuestion): Promise<"next" | "cancel"> => {
      const assistant = ensureAssistant();
      const prompts = voicePrompts[language];

      while (true) {
        await assistant.speak(prompts[question.promptKey]);
        setIsRecording(true);
        let result: VoiceListenResult;
        try {
          result = await assistant.listen();
        } finally {
          setIsRecording(false);
        }

        if (result.kind === "command") {
          if (result.command === "repeat") {
            continue;
          }
          if (result.command === "skip") {
            return "next";
          }
          if (result.command === "cancel") {
            return "cancel";
          }
        } else {
          applyAnswer(question.field, result.text);
          await assistant.speak(`${prompts.captured} ${result.text}`);
          return "next";
        }
      }
    },
    [applyAnswer, ensureAssistant, language],
  );

  const startVoiceFlow = useCallback(async () => {
    const assistant = ensureAssistant();
    const prompts = voicePrompts[language];
    setError(null);

    if (!assistant.isSupported()) {
      setError(prompts.notSupported);
      return;
    }

    setIsVoiceActive(true);
    await assistant.speak(prompts.greeting);
    await assistant.speak(prompts.commandHint);

    try {
      for (let index = 0; index < voiceQuestions.length; index += 1) {
        setCurrentQuestionIndex(index);
        const result = await processOneQuestion(voiceQuestions[index]);
        if (result === "cancel") {
          await stopVoiceFlow(prompts.cancelled);
          return;
        }
      }

      await stopVoiceFlow(prompts.complete);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : prompts.failed);
      await stopVoiceFlow();
    }
  }, [ensureAssistant, language, processOneQuestion, stopVoiceFlow]);

  const resetAnswers = useCallback(() => {
    setAnswers({});
    setError(null);
  }, []);

  return useMemo(
    () => ({
      answers,
      isRecording,
      isVoiceActive,
      currentQuestionIndex,
      questions: voiceQuestions.map((question) => ({
        field: question.field,
        prompt: voicePrompts[language][question.promptKey],
      })),
      language,
      error,
      startVoiceFlow,
      stopVoiceFlow,
      resetAnswers,
    }),
    [answers, isRecording, isVoiceActive, currentQuestionIndex, language, error, startVoiceFlow, stopVoiceFlow, resetAnswers],
  );
}
