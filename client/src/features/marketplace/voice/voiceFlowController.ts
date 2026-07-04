import { useCallback, useMemo, useState } from "react";
import type { CropCategory } from "../types";
import { useVoiceInput } from "./useVoiceInput";
import { useVoiceOutput, type VoiceLanguage } from "./useVoiceOutput";

export type VoiceField = "cropName" | "quantity" | "pricePerKg" | "category" | "harvestDate" | "description" | "location";

type FormPatch = Partial<{
  cropName: string;
  quantity: number;
  pricePerKg: number;
  category: CropCategory;
  harvestDate: string;
  description: string;
  location: string;
}>;

type PromptMap = Record<
  VoiceLanguage,
  {
    start: string;
    done: string;
    cancelled: string;
    lowConfidence: string;
    couldNotDetect: string;
    fallbackInUse: string;
    [key: string]: string;
  }
>;

const prompts: PromptMap = {
  en: {
    start: "Voice assist started. I will ask a few questions to fill your listing.",
    done: "Voice assisted form fill is complete. Please review and publish.",
    cancelled: "Voice assist cancelled.",
    lowConfidence: "I could not clearly understand that. Please repeat.",
    couldNotDetect: "No speech detected. Please repeat.",
    fallbackInUse: "Browser recognition failed. Trying server transcription fallback.",
    cropName: "Please say the product name.",
    quantity: "Please say the quantity available.",
    pricePerKg: "Please say the price per kilogram.",
    category: "Please say category: fruit, vegetable, grain, or other.",
    harvestDate: "Please say harvest date. You can say today, yesterday, or an exact date.",
    description: "Please describe the product.",
    location: "Please say the farm location.",
  },
  ta: {
    start: "குரல் உதவி தொடங்கியது. உங்கள் பட்டியலை நிரப்ப சில கேள்விகள் கேட்கிறேன்.",
    done: "குரல் உதவியுடன் படிவம் நிரம்பியது. சரிபார்த்து வெளியிடுங்கள்.",
    cancelled: "குரல் உதவி நிறுத்தப்பட்டது.",
    lowConfidence: "தெளிவாக புரியவில்லை. தயவு செய்து மீண்டும் சொல்லுங்கள்.",
    couldNotDetect: "குரல் பதிவாகவில்லை. மீண்டும் சொல்லுங்கள்.",
    fallbackInUse: "உலாவி குரல் அறிதல் தோல்வியடைந்தது. சேவையக வழி முயற்சிக்கிறோம்.",
    cropName: "பொருளின் பெயரை சொல்லுங்கள்.",
    quantity: "கிடைக்கும் அளவை சொல்லுங்கள்.",
    pricePerKg: "ஒரு கிலோவின் விலையை சொல்லுங்கள்.",
    category: "வகையை சொல்லுங்கள்: பழம், காய்கறி, தானியம் அல்லது மற்றது.",
    harvestDate: "அறுவடை தேதியை சொல்லுங்கள். இன்று, நேற்று அல்லது குறிப்பிட்ட தேதியை சொல்லலாம்.",
    description: "பொருளை விளக்கமாக சொல்லுங்கள்.",
    location: "பண்ணை இருப்பிடத்தை சொல்லுங்கள்.",
  },
};

const fields: VoiceField[] = ["cropName", "quantity", "pricePerKg", "category", "harvestDate", "description", "location"];

function normalizeCategory(rawText: string): CropCategory {
  const text = rawText.toLowerCase();
  if (text.includes("fruit") || text.includes("பழ")) {
    return "fruit";
  }
  if (text.includes("vegetable") || text.includes("காய்கறி") || text.includes("காய்")) {
    return "vegetable";
  }
  if (text.includes("grain") || text.includes("தானிய")) {
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

function parsePatch(field: VoiceField, text: string): FormPatch {
  if (field === "quantity") {
    const value = Number(text.replace(/[^\d.]/g, ""));
    return Number.isFinite(value) && value > 0 ? { quantity: value } : {};
  }
  if (field === "pricePerKg") {
    const value = Number(text.replace(/[^\d.]/g, ""));
    return Number.isFinite(value) && value > 0 ? { pricePerKg: value } : {};
  }
  if (field === "category") {
    return { category: normalizeCategory(text) };
  }
  if (field === "harvestDate") {
    const harvestDate = normalizeDate(text);
    return harvestDate ? { harvestDate } : {};
  }
  return { [field]: text } as FormPatch;
}

function commandOf(rawText: string): "skip" | "repeat" | "cancel" | null {
  const text = rawText.toLowerCase();
  if (text.includes("cancel") || text.includes("ரத்து")) {
    return "cancel";
  }
  if (text.includes("repeat") || text.includes("மீண்டும்")) {
    return "repeat";
  }
  if (text.includes("skip") || text.includes("தவிர்க்க")) {
    return "skip";
  }
  return null;
}

export function useVoiceFlowController(params: {
  language: VoiceLanguage;
  onApplyPatch: (patch: FormPatch) => void;
}) {
  const { language, onApplyPatch } = params;
  const { isSupported: isOutputSupported, speak } = useVoiceOutput();
  const { status, detectedText, lastSource, listen } = useVoiceInput();
  const [isActive, setIsActive] = useState(false);
  const [currentField, setCurrentField] = useState<VoiceField | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isListening = status === "listening";
  const isProcessing = status === "processing";

  const start = useCallback(async () => {
    setError(null);
    setIsActive(true);
    if (isOutputSupported) {
      await speak(prompts[language].start, language);
    }

    try {
      for (const field of fields) {
        setCurrentField(field);
        let attempts = 0;
        let shouldMoveNext = false;

        while (!shouldMoveNext && attempts < 3) {
          attempts += 1;
          if (isOutputSupported) {
            await speak(prompts[language][field], language);
          }

          let result;
          try {
            result = await listen(language);
            if (result.source === "fallback" && isOutputSupported) {
              await speak(prompts[language].fallbackInUse, language);
            }
          } catch {
            if (isOutputSupported) {
              await speak(prompts[language].couldNotDetect, language);
            }
            continue;
          }

          const command = commandOf(result.text);
          if (command === "cancel") {
            setIsActive(false);
            setCurrentField(null);
            if (isOutputSupported) {
              await speak(prompts[language].cancelled, language);
            }
            return;
          }
          if (command === "repeat") {
            continue;
          }
          if (command === "skip") {
            shouldMoveNext = true;
            continue;
          }

          if (typeof result.confidence === "number" && result.confidence > 0 && result.confidence < 0.45) {
            if (isOutputSupported) {
              await speak(prompts[language].lowConfidence, language);
            }
            continue;
          }

          const patch = parsePatch(field, result.text);
          if (Object.keys(patch).length === 0) {
            if (isOutputSupported) {
              await speak(prompts[language].couldNotDetect, language);
            }
            continue;
          }
          onApplyPatch(patch);
          shouldMoveNext = true;
        }
      }

      if (isOutputSupported) {
        await speak(prompts[language].done, language);
      }
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Voice assist failed.");
    } finally {
      setIsActive(false);
      setCurrentField(null);
    }
  }, [isOutputSupported, language, listen, onApplyPatch, speak]);

  return useMemo(
    () => ({
      start,
      isActive,
      isListening,
      isProcessing,
      currentField,
      currentPrompt: currentField ? prompts[language][currentField] : "",
      detectedText,
      lastSource,
      error,
    }),
    [currentField, detectedText, error, isActive, isListening, isProcessing, language, lastSource, start],
  );
}
