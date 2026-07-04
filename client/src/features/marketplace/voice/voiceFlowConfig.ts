import type { CropCategory, CropListingInput } from "../types";

export type VoiceLanguage = "en-IN" | "ta-IN";

export type VoiceFieldKey = "cropName" | "quantity" | "pricePerKg" | "location" | "description" | "category" | "harvestDate";

export type VoiceFieldValueMap = Pick<
  CropListingInput,
  "cropName" | "quantity" | "pricePerKg" | "location" | "description" | "category" | "harvestDate"
>;

interface LocalizedText {
  "en-IN": string;
  "ta-IN": string;
}

export interface VoiceStep {
  field: VoiceFieldKey;
  question: LocalizedText;
  parseTranscript: (transcript: string) => VoiceFieldValueMap[VoiceFieldKey] | null;
  formatValueForConfirmation?: (value: VoiceFieldValueMap[VoiceFieldKey]) => string;
}

export interface VoiceMessages {
  start: LocalizedText;
  completed: LocalizedText;
  cancelled: LocalizedText;
  notSupported: LocalizedText;
  couldNotHear: LocalizedText;
  confirmPrefix: LocalizedText;
  confirmSuffix: LocalizedText;
  answerYesNo: LocalizedText;
}

const categorySynonyms: Record<CropCategory, string[]> = {
  fruit: ["fruit", "fruits", "பழம்", "பழங்கள்"],
  vegetable: ["vegetable", "vegetables", "காய்கறி", "காய்", "காய்கறிகள்"],
  grain: ["grain", "grains", "தானியம்", "தானியங்கள்"],
  other: ["other", "மற்றது"],
};

function parsePositiveNumber(text: string): number | null {
  const numeric = Number(text.replace(/[^\d.]/g, ""));
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return null;
  }
  return numeric;
}

function parseCategory(text: string): CropCategory {
  const normalized = text.toLowerCase();
  if (categorySynonyms.fruit.some((item) => normalized.includes(item))) {
    return "fruit";
  }
  if (categorySynonyms.vegetable.some((item) => normalized.includes(item))) {
    return "vegetable";
  }
  if (categorySynonyms.grain.some((item) => normalized.includes(item))) {
    return "grain";
  }
  return "other";
}

function parseHarvestDate(text: string): string | null {
  const normalized = text.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  if (normalized.includes("today") || normalized.includes("இன்று")) {
    return new Date().toISOString().slice(0, 10);
  }

  if (normalized.includes("yesterday") || normalized.includes("நேற்று")) {
    const date = new Date();
    date.setDate(date.getDate() - 1);
    return date.toISOString().slice(0, 10);
  }

  const parsedDate = new Date(text);
  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }
  return parsedDate.toISOString().slice(0, 10);
}

export const marketplaceVoiceSteps: VoiceStep[] = [
  {
    field: "cropName",
    question: {
      "en-IN": "What product are you selling?",
      "ta-IN": "நீங்கள் எந்த பொருளை விற்கிறீர்கள்?",
    },
    parseTranscript: (transcript) => transcript.trim() || null,
  },
  {
    field: "quantity",
    question: {
      "en-IN": "What is the quantity in kilograms?",
      "ta-IN": "அளவு எவ்வளவு கிலோ?",
    },
    parseTranscript: (transcript) => parsePositiveNumber(transcript),
  },
  {
    field: "pricePerKg",
    question: {
      "en-IN": "What is the price per kilogram?",
      "ta-IN": "ஒரு கிலோவிற்கு விலை என்ன?",
    },
    parseTranscript: (transcript) => parsePositiveNumber(transcript),
  },
  {
    field: "location",
    question: {
      "en-IN": "Where is your farm located?",
      "ta-IN": "உங்கள் பண்ணை எந்த இடத்தில் உள்ளது?",
    },
    parseTranscript: (transcript) => transcript.trim() || null,
  },
  {
    field: "description",
    question: {
      "en-IN": "Please describe your product quality.",
      "ta-IN": "உங்கள் பொருளின் தரத்தை விளக்குங்கள்.",
    },
    parseTranscript: (transcript) => transcript.trim() || null,
  },
  {
    field: "category",
    question: {
      "en-IN": "Which category is this: fruit, vegetable, grain, or other?",
      "ta-IN": "இது எந்த வகை: பழம், காய்கறி, தானியம், அல்லது மற்றது?",
    },
    parseTranscript: (transcript) => parseCategory(transcript),
  },
  {
    field: "harvestDate",
    question: {
      "en-IN": "What is the harvest date? You can say today, yesterday, or a date.",
      "ta-IN": "அறுவடை தேதி என்ன? இன்று, நேற்று, அல்லது ஒரு தேதியை சொல்லலாம்.",
    },
    parseTranscript: (transcript) => parseHarvestDate(transcript),
  },
];

export const voiceMessages: VoiceMessages = {
  start: {
    "en-IN": "Voice assistant started. I will help you fill this listing form.",
    "ta-IN": "குரல் உதவி தொடங்கியது. இந்த படிவத்தை நிரப்ப நான் உதவுகிறேன்.",
  },
  completed: {
    "en-IN": "Voice form filling is completed. Please review and publish.",
    "ta-IN": "குரல் வழி படிவம் முடிந்தது. சரிபார்த்து வெளியிடுங்கள்.",
  },
  cancelled: {
    "en-IN": "Voice mode stopped.",
    "ta-IN": "குரல் முறை நிறுத்தப்பட்டது.",
  },
  notSupported: {
    "en-IN": "Your browser does not support speech features for this assistant.",
    "ta-IN": "இந்த உலாவி இந்த குரல் உதவியை ஆதரிக்கவில்லை.",
  },
  couldNotHear: {
    "en-IN": "I could not hear you clearly. Please try again.",
    "ta-IN": "நான் தெளிவாக கேட்க முடியவில்லை. தயவு செய்து மீண்டும் சொல்லுங்கள்.",
  },
  confirmPrefix: {
    "en-IN": "You said",
    "ta-IN": "நீங்கள் சொன்னது",
  },
  confirmSuffix: {
    "en-IN": "Is that correct?",
    "ta-IN": "அது சரியா?",
  },
  answerYesNo: {
    "en-IN": "Please say yes or no.",
    "ta-IN": "தயவு செய்து ஆம் அல்லது இல்லை என்று சொல்லுங்கள்.",
  },
};
