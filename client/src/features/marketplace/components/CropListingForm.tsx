import { useCallback, useRef, useState, type FormEvent } from "react";
import { createCropListing, transcribeVoiceListing, type VoiceTranscribeFields } from "../api";
import type { CropCategory, CropListingInput } from "../types";
import { ImageUploader } from "./ImageUploader";
import { VoiceAssistButton } from "../../../components/voice/VoiceAssistButton";
import { VoiceRecorder } from "../../../components/voice/VoiceRecorder";
import { VoiceStatusIndicator } from "../../../components/voice/VoiceStatusIndicator";
import { cleanTranscript, extractCategory, extractNumber } from "../../../utils/voiceParser";

const categories: CropCategory[] = ["fruit", "vegetable", "grain", "other"];

const initialForm: CropListingInput = {
  cropName: "",
  category: "vegetable",
  quantity: 0,
  pricePerKg: 0,
  harvestDate: "",
  description: "",
  location: "",
  images: [],
  unit: "kg",
};

interface CropListingFormProps {
  onPublished?: () => Promise<void> | void;
}

type VoiceStepField = "cropName" | "pricePerKg" | "quantity" | "category" | "description";
type VoiceLang = "en-IN" | "ta-IN";
type VoiceStep = {
  field: VoiceStepField;
  prompt: Record<VoiceLang, string>;
};

const voiceSteps: VoiceStep[] = [
  {
    field: "cropName",
    prompt: {
      "en-IN": "Product Name. Please say the product name.",
      "ta-IN": "பொருளின் பெயர். தயவுசெய்து பொருளின் பெயரை சொல்லுங்கள்.",
    },
  },
  {
    field: "pricePerKg",
    prompt: {
      "en-IN": "Price. Please say the price per kilogram.",
      "ta-IN": "விலை. ஒரு கிலோவுக்கு விலையை சொல்லுங்கள்.",
    },
  },
  {
    field: "quantity",
    prompt: {
      "en-IN": "Quantity. Please say quantity available.",
      "ta-IN": "அளவு. கிடைக்கும் அளவை சொல்லுங்கள்.",
    },
  },
  {
    field: "category",
    prompt: {
      "en-IN": "Category. Please say the product category.",
      "ta-IN": "வகை. பொருளின் வகையை சொல்லுங்கள்.",
    },
  },
  {
    field: "description",
    prompt: {
      "en-IN": "Description. Please describe your product.",
      "ta-IN": "விளக்கம். உங்கள் பொருளை விவரிக்கவும்.",
    },
  },
];

export function CropListingForm({ onPublished }: CropListingFormProps) {
  const [form, setForm] = useState<CropListingInput>(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [voiceLanguage, setVoiceLanguage] = useState<"en-IN" | "ta-IN">("en-IN");
  const [voiceStatus, setVoiceStatus] = useState<"idle" | "speaking" | "listening" | "processing" | "completed" | "error">("idle");
  const [voiceMessage, setVoiceMessage] = useState<string | null>(null);
  const [voiceTranscript, setVoiceTranscript] = useState<string | null>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [voiceStepIndex, setVoiceStepIndex] = useState(0);
  const flowIdRef = useRef(0);

  const applyFormValue = useCallback(<K extends keyof CropListingInput>(field: K, value: CropListingInput[K]) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }, []);

  const stopAllSpeech = () => {
    window.speechSynthesis.cancel();
  };

  const speakPrompt = useCallback(
    (text: string) =>
      new Promise<void>((resolve) => {
        if (!("speechSynthesis" in window)) {
          resolve();
          return;
        }
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = voiceLanguage;
        utterance.onend = () => resolve();
        utterance.onerror = () => resolve();
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
      }),
    [voiceLanguage]
  );

  const runStep = useCallback(
    async (stepIndex: number, flowId: number) => {
      if (stepIndex >= voiceSteps.length) {
        setVoiceStatus("completed");
        setVoiceMessage("Voice flow completed. Please review remaining fields and submit.");
        setIsVoiceActive(false);
        setIsRecording(false);
        return;
      }

      const step = voiceSteps[stepIndex];
      const promptText = step.prompt[voiceLanguage];
      setVoiceStatus("speaking");
      setVoiceMessage(promptText);
      await speakPrompt(promptText);
      if (flowIdRef.current !== flowId) {
        return;
      }
      setVoiceStatus("listening");
      setIsRecording(true);
    },
    [speakPrompt, voiceLanguage]
  );

  const startVoiceAssist = async () => {
    setVoiceError(null);
    setVoiceTranscript(null);
    setVoiceStatus("idle");
    setVoiceStepIndex(0);
    setIsVoiceActive(true);
    setIsRecording(false);
    flowIdRef.current += 1;
    await runStep(0, flowIdRef.current);
  };

  const stopVoiceAssist = () => {
    flowIdRef.current += 1;
    stopAllSpeech();
    setIsVoiceActive(false);
    setIsRecording(false);
    setVoiceStatus("idle");
    setVoiceMessage("Voice assist stopped.");
  };

  const applyStepValue = useCallback(
    (stepIndex: number, transcript: string, fields: VoiceTranscribeFields): boolean => {
      const step = voiceSteps[stepIndex];
      const cleaned = cleanTranscript(transcript);

      switch (step.field) {
        case "cropName": {
          const productName = cleanTranscript(fields.productName || cleaned);
          if (!productName) return false;
          applyFormValue("cropName", productName);
          return true;
        }
        case "pricePerKg": {
          const value = Number(fields.price) > 0 ? Number(fields.price) : extractNumber(cleaned);
          if (!value || value <= 0) return false;
          applyFormValue("pricePerKg", value);
          return true;
        }
        case "quantity": {
          const value = extractNumber(fields.quantity || cleaned);
          if (!value || value <= 0) return false;
          applyFormValue("quantity", value);
          return true;
        }
        case "category": {
          const category = extractCategory(fields.category || cleaned) as CropCategory | null;
          if (!category) return false;
          applyFormValue("category", category);
          return true;
        }
        case "description": {
          const description = cleanTranscript(fields.description || cleaned);
          if (!description) return false;
          applyFormValue("description", description);
          return true;
        }
        default:
          return false;
      }
    },
    [applyFormValue]
  );

  const handleVoiceAudio = useCallback(
    async (audioBlob: Blob) => {
      if (!isVoiceActive) {
        return;
      }

      const flowId = flowIdRef.current;
      setIsRecording(false);
      setVoiceError(null);
      setVoiceStatus("processing");
      try {
        const voiceResult = await transcribeVoiceListing(audioBlob);
        setVoiceTranscript(voiceResult.transcript);

        const normalizedTranscript = voiceResult.cleanedText || voiceResult.transcript;
        const isApplied = applyStepValue(voiceStepIndex, normalizedTranscript, voiceResult.fields);
        if (!isApplied) {
          const retryText =
            voiceLanguage === "ta-IN"
              ? "இந்த பதிலை புரிந்துகொள்ள முடியவில்லை. மீண்டும் சொல்லுங்கள்."
              : "I could not understand that value. Please say it again.";
          setVoiceStatus("error");
          setVoiceError(retryText);
          await speakPrompt(retryText);
          if (flowIdRef.current !== flowId || !isVoiceActive) {
            return;
          }
          setVoiceStatus("listening");
          setIsRecording(true);
          return;
        }

        const nextStep = voiceStepIndex + 1;
        setVoiceStepIndex(nextStep);
        await runStep(nextStep, flowId);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Voice processing failed.";
        setVoiceStatus("error");
        setVoiceError(message);
        if (message.toLowerCase().includes("low confidence") || message.toLowerCase().includes("speech unclear")) {
          const retryText =
            voiceLanguage === "ta-IN"
              ? "குரல் தெளிவாக கிடைக்கவில்லை. மீண்டும் சொல்லுங்கள்."
              : "Voice is not clear. Please say it again.";
          await speakPrompt(retryText);
          if (flowIdRef.current === flowId && isVoiceActive) {
            setVoiceStatus("listening");
            setIsRecording(true);
          }
        }
      }
    },
    [applyStepValue, isVoiceActive, runStep, speakPrompt, voiceLanguage, voiceStepIndex]
  );

  const handleVoiceButtonClick = () => {
    if (isVoiceActive) {
      stopVoiceAssist();
      return;
    }
    void startVoiceAssist();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError(null);
    setSuccessMessage(null);

    if (!form.cropName || !form.description || !form.location || !form.harvestDate) {
      setSubmitError("Please fill all required fields before publishing.");
      return;
    }

    if (form.quantity <= 0 || form.pricePerKg <= 0) {
      setSubmitError("Quantity and price should be greater than 0.");
      return;
    }

    setIsSubmitting(true);
    try {
      await createCropListing(form);
      setSuccessMessage("Listing published successfully.");
      setForm(initialForm);
      await onPublished?.();
    } catch (caughtError) {
      setSubmitError(caughtError instanceof Error ? caughtError.message : "Unable to publish listing.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="dashboard-page stack">
      <article className="card">
        <h2>Create Listing</h2>
        <p className="muted">Fill manually or use voice-assisted flow.</p>
      </article>

      <article className="card stack">
        <h3>Voice Assist</h3>
        <label className="stack">
          Language
          <select
            className="input"
            value={voiceLanguage}
            onChange={(event) => setVoiceLanguage(event.target.value === "ta-IN" ? "ta-IN" : "en-IN")}
            disabled={isVoiceActive}
          >
            <option value="en-IN">English (India)</option>
            <option value="ta-IN">Tamil (India)</option>
          </select>
        </label>
        <VoiceAssistButton isActive={isVoiceActive} onClick={handleVoiceButtonClick} />
        <VoiceStatusIndicator status={voiceStatus} message={voiceError ?? voiceMessage} transcript={voiceTranscript} />
        <VoiceRecorder
          isRecording={isRecording}
          maxDurationMs={4500}
          onRecordingReady={(audioBlob) => void handleVoiceAudio(audioBlob)}
          onStart={() => setVoiceStatus("listening")}
          onEnd={() => setIsRecording(false)}
          onError={(message) => {
            setVoiceStatus("error");
            setVoiceError(message);
            setIsRecording(false);
          }}
        />
      </article>

      <form className="card stack" onSubmit={(event) => void handleSubmit(event)}>
        <label className="stack">
          Crop Name
          <input
            className="input"
            value={form.cropName}
            onChange={(event) => applyFormValue("cropName", event.target.value)}
            placeholder="Tomatoes"
            required
          />
        </label>

        <label className="stack">
          Quantity (kg)
          <input
            className="input"
            type="number"
            min={1}
            value={form.quantity || ""}
            onChange={(event) => applyFormValue("quantity", Number(event.target.value))}
            required
          />
        </label>

        <label className="stack">
          Unit
          <select
            className="input"
            value={form.unit}
            onChange={(event) => applyFormValue("unit", event.target.value as CropListingInput["unit"])}
          >
            <option value="kg">kg</option>
            <option value="ton">ton</option>
            <option value="crate">crate</option>
          </select>
        </label>

        <label className="stack">
          Price per Kg (Rs)
          <input
            className="input"
            type="number"
            min={1}
            value={form.pricePerKg || ""}
            onChange={(event) => applyFormValue("pricePerKg", Number(event.target.value))}
            required
          />
        </label>

        <label className="stack">
          Category
          <select
            className="input"
            value={form.category}
            onChange={(event) => applyFormValue("category", event.target.value as CropCategory)}
          >
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>

        <label className="stack">
          Harvest Date
          <input
            className="input"
            type="date"
            value={form.harvestDate}
            onChange={(event) => applyFormValue("harvestDate", event.target.value)}
            required
          />
        </label>

        <label className="stack">
          Location
          <input
            className="input"
            value={form.location}
            onChange={(event) => applyFormValue("location", event.target.value)}
            placeholder="Madurai, Tamil Nadu"
            required
          />
        </label>

        <label className="stack">
          Description
          <textarea
            className="input"
            value={form.description}
            onChange={(event) => applyFormValue("description", event.target.value)}
            rows={4}
            required
          />
        </label>

        <ImageUploader value={form.images} onChange={(images) => applyFormValue("images", images)} />

        {submitError ? <p className="muted">{submitError}</p> : null}
        {successMessage ? <p className="muted">{successMessage}</p> : null}

        <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
          {isSubmitting ? "Publishing..." : "Publish Listing"}
        </button>
      </form>
    </section>
  );
}
