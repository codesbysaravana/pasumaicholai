import { useState } from "react";
import { DashboardLayout } from "../../../../components/layout/DashboardLayout";
import { ChatInput } from "../components/ChatInput";
import { ChatWindow } from "../components/ChatWindow";
import { VoiceRecorder } from "../components/VoiceRecorder";
import { useTextToSpeech } from "../hooks/useTextToSpeech";
import { playTTS, sendMessage, sendVoice } from "../services/chatbot.api";
import type { ChatMessageItem } from "../types/chat.types";

const farmerItems = [
  { label: "Overview", href: "/dashboard/farmer" },
  { label: "Marketplace", href: "/dashboard/farmer/marketplace" },
  { label: "Recommended Prices", href: "/dashboard/farmer/recommended-prices" },
  { label: "Consultation", href: "/dashboard/farmer/expert-consultation" },
  { label: "Complaints", href: "/dashboard/farmer/complaints" },
  { label: "Chatbot", href: "/dashboard/farmer/chatbot" },
];

function nextMessageId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function FarmerChatbotPage() {
  const [messages, setMessages] = useState<ChatMessageItem[]>([
    {
      id: nextMessageId(),
      role: "assistant",
      content: "Hello farmer! Ask me anything about crops, soil, irrigation, pests, or market readiness.",
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const { speak } = useTextToSpeech();

  const appendMessage = (role: ChatMessageItem["role"], content: string) => {
    setMessages((current) => [
      ...current,
      {
        id: nextMessageId(),
        role,
        content,
      },
    ]);
  };

  const speakFromBackend = async (text: string) => {
    try {
      const tts = await playTTS(text);
      const source = `data:${tts.audioMimeType};base64,${tts.audioBase64}`;
      const audio = new Audio(source);
      await audio.play();
    } catch {
      speak(text);
    }
  };

  const handleSendMessage = async (text: string) => {
    appendMessage("user", text);
    setIsLoading(true);
    try {
      const result = await sendMessage(text);
      appendMessage("assistant", result.reply);
      await speakFromBackend(result.reply);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Chat request failed";
      appendMessage("assistant", `Unable to process request right now. ${message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVoiceCaptured = async (file: File, transcriptHint: string) => {
    setIsLoading(true);
    try {
      const voiceResult = await sendVoice(file);
      const transcript = voiceResult.transcript || transcriptHint;

      if (transcript) {
        appendMessage("user", transcript);
        const chatResult = await sendMessage(transcript);
        appendMessage("assistant", chatResult.reply);
        await speakFromBackend(chatResult.reply);
      } else {
        appendMessage("assistant", "I could not understand the voice input. Please try again.");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Voice request failed";
      appendMessage("assistant", `Unable to process voice request right now. ${message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DashboardLayout title="Farmer Chatbot" items={farmerItems}>
      <section className="chatbot-page">
        <header className="chatbot-header">
          <h2>AI Farming Assistant</h2>
          <p className="muted">Text or voice support for day-to-day farming decisions.</p>
        </header>
        <ChatWindow messages={messages} isLoading={isLoading} />
        <div className="chatbot-controls">
          <ChatInput onSendMessage={handleSendMessage} disabled={isLoading} />
          <VoiceRecorder onVoiceCaptured={handleVoiceCaptured} disabled={isLoading} />
        </div>
      </section>
    </DashboardLayout>
  );
}
