import { useCallback, useMemo, useRef, useState } from "react";
import { listenForSpeech, isSpeechRecognitionSupported } from "./speechRecognition";
import { cancelSpeech, isSpeechSynthesisSupported, speakText } from "./speechSynthesis";
import type { VoiceFieldKey, VoiceFieldValueMap, VoiceLanguage, VoiceStep } from "./voiceFlowConfig";
import { voiceMessages } from "./voiceFlowConfig";

export type VoiceAssistantStatus = "IDLE" | "ASKING" | "LISTENING" | "CONFIRMING" | "NEXT_FIELD" | "COMPLETED";

type ConfirmAction = "confirm" | "repeat" | "stop";

interface UseVoiceAssistantOptions {
  language: VoiceLanguage;
  steps: VoiceStep[];
  onApplyFieldValue: (field: VoiceFieldKey, value: VoiceFieldValueMap[VoiceFieldKey]) => void;
}

const yesWords = ["yes", "yeah", "yep", "correct", "right", "ஆம்", "ஆமாம்", "சரி"];
const noWords = ["no", "nope", "wrong", "இல்லை", "இல்ல", "தவறு"];

function isYes(transcript: string): boolean {
  const normalized = transcript.toLowerCase();
  return yesWords.some((word) => normalized.includes(word));
}

function isNo(transcript: string): boolean {
  const normalized = transcript.toLowerCase();
  return noWords.some((word) => normalized.includes(word));
}

export function useVoiceAssistant(options: UseVoiceAssistantOptions) {
  const { language, steps, onApplyFieldValue } = options;
  const [status, setStatus] = useState<VoiceAssistantStatus>("IDLE");
  const [isActive, setIsActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(-1);
  const [detectedSpeech, setDetectedSpeech] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isAwaitingConfirmation, setIsAwaitingConfirmation] = useState(false);

  const stopRequestedRef = useRef(false);
  const pendingConfirmationRef = useRef<{ field: VoiceFieldKey; value: VoiceFieldValueMap[VoiceFieldKey] } | null>(null);
  const confirmationResolverRef = useRef<((action: ConfirmAction) => void) | null>(null);
  const recognitionAbortRef = useRef<AbortController | null>(null);
  const runningRef = useRef(false);

  const isSupported = isSpeechRecognitionSupported() && isSpeechSynthesisSupported();
  const currentStep = currentStepIndex >= 0 ? steps[currentStepIndex] : null;
  const currentQuestion = currentStep ? currentStep.question[language] : "";

  const stop = useCallback(
    async (speakCancelled = true) => {
      stopRequestedRef.current = true;
      recognitionAbortRef.current?.abort();
      cancelSpeech();
      confirmationResolverRef.current?.("stop");
      setIsActive(false);
      setStatus("IDLE");
      setCurrentStepIndex(-1);
      setIsAwaitingConfirmation(false);
      pendingConfirmationRef.current = null;

      if (speakCancelled && isSpeechSynthesisSupported()) {
        await speakText(voiceMessages.cancelled[language], language);
      }
    },
    [language],
  );

  const askAndListen = useCallback(async () => {
    setStatus("ASKING");
    await speakText(currentQuestion, language);

    setStatus("LISTENING");
    recognitionAbortRef.current = new AbortController();
    try {
      const result = await listenForSpeech({
        language,
        timeoutMs: 8000,
        signal: recognitionAbortRef.current.signal,
      });
      setDetectedSpeech(result.transcript);
      return result.transcript;
    } finally {
      recognitionAbortRef.current = null;
    }
  }, [currentQuestion, language]);

  const waitForConfirmAction = useCallback((): Promise<ConfirmAction> => {
    setIsAwaitingConfirmation(true);
    return new Promise<ConfirmAction>((resolve) => {
      confirmationResolverRef.current = resolve;
    });
  }, []);

  const getSpeechConfirmAction = useCallback(async (): Promise<ConfirmAction> => {
    setStatus("LISTENING");
    recognitionAbortRef.current = new AbortController();
    try {
      const result = await listenForSpeech({
        language,
        timeoutMs: 6000,
        signal: recognitionAbortRef.current.signal,
      });
      if (isYes(result.transcript)) {
        return "confirm";
      }
      if (isNo(result.transcript)) {
        return "repeat";
      }
      return "repeat";
    } catch {
      return "repeat";
    } finally {
      recognitionAbortRef.current = null;
    }
  }, [language]);

  const confirmCurrentValue = useCallback(async (): Promise<ConfirmAction> => {
    const pending = pendingConfirmationRef.current;
    if (!pending) {
      return "repeat";
    }

    setStatus("CONFIRMING");
    const confirmText = `${voiceMessages.confirmPrefix[language]} ${detectedSpeech}. ${voiceMessages.confirmSuffix[language]}`;
    await speakText(confirmText, language);

    const manualActionPromise = waitForConfirmAction();
    const speechActionPromise = getSpeechConfirmAction();
    const action = await Promise.race([manualActionPromise, speechActionPromise]);
    setIsAwaitingConfirmation(false);
    confirmationResolverRef.current = null;

    if (action !== "confirm" && action !== "repeat") {
      return "stop";
    }

    if (action === "repeat") {
      await speakText(voiceMessages.answerYesNo[language], language);
    }

    return action;
  }, [detectedSpeech, getSpeechConfirmAction, language, waitForConfirmAction]);

  const start = useCallback(async () => {
    if (runningRef.current) {
      return;
    }
    runningRef.current = true;
    stopRequestedRef.current = false;
    setError(null);
    setDetectedSpeech("");
    setIsActive(true);
    setStatus("IDLE");

    try {
      if (!isSupported) {
        setError(voiceMessages.notSupported[language]);
        await stop(false);
        return;
      }

      await speakText(voiceMessages.start[language], language);

      for (let stepIndex = 0; stepIndex < steps.length; stepIndex += 1) {
        if (stopRequestedRef.current) {
          break;
        }
        setCurrentStepIndex(stepIndex);
        const step = steps[stepIndex];

        let stepCompleted = false;
        while (!stepCompleted && !stopRequestedRef.current) {
          let transcript = "";
          try {
            transcript = await askAndListen();
          } catch {
            await speakText(voiceMessages.couldNotHear[language], language);
            continue;
          }

          const parsedValue = step.parseTranscript(transcript);
          if (parsedValue === null || parsedValue === undefined || parsedValue === "") {
            await speakText(voiceMessages.couldNotHear[language], language);
            continue;
          }

          pendingConfirmationRef.current = {
            field: step.field,
            value: parsedValue,
          };

          const confirmation = await confirmCurrentValue();
          if (confirmation === "stop") {
            stopRequestedRef.current = true;
            break;
          }

          if (confirmation === "confirm") {
            onApplyFieldValue(step.field, parsedValue);
            setStatus("NEXT_FIELD");
            stepCompleted = true;
          }
        }
      }

      if (!stopRequestedRef.current) {
        setStatus("COMPLETED");
        setIsActive(false);
        setCurrentStepIndex(-1);
        await speakText(voiceMessages.completed[language], language);
      } else {
        await stop();
      }
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Voice assistant failed.");
      await stop(false);
    } finally {
      runningRef.current = false;
      confirmationResolverRef.current = null;
      pendingConfirmationRef.current = null;
      setIsAwaitingConfirmation(false);
    }
  }, [askAndListen, confirmCurrentValue, isSupported, language, onApplyFieldValue, steps, stop]);

  const repeatQuestion = useCallback(async () => {
    if (!isActive || !currentQuestion) {
      return;
    }
    await speakText(currentQuestion, language);
  }, [currentQuestion, isActive, language]);

  const confirmDetected = useCallback(() => {
    if (!pendingConfirmationRef.current || !confirmationResolverRef.current) {
      return;
    }
    recognitionAbortRef.current?.abort();
    confirmationResolverRef.current("confirm");
  }, []);

  const canConfirm = Boolean(
    isActive &&
      pendingConfirmationRef.current &&
      isAwaitingConfirmation &&
      (status === "CONFIRMING" || status === "LISTENING"),
  );

  return useMemo(
    () => ({
      start,
      stop,
      repeatQuestion,
      confirmDetected,
      isSupported,
      isActive,
      status,
      currentStepIndex,
      currentQuestion,
      detectedSpeech,
      error,
      canConfirm,
    }),
    [canConfirm, confirmDetected, currentQuestion, currentStepIndex, detectedSpeech, error, isActive, isSupported, repeatQuestion, start, status, stop],
  );
}
