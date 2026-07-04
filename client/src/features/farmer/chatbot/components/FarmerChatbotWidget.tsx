import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChatInput } from "./ChatInput";
import { ChatWindow } from "./ChatWindow";
import { useTextToSpeech } from "../hooks/useTextToSpeech";
import { playTTS, sendMessage, sendVoice } from "../services/chatbot.api";
import type { ChatMessageItem } from "../types/chat.types";
import logo from "../../../../assets/img/logi.png";

function nextMessageId() {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function FarmerChatbotWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessageItem[]>([
        {
            id: nextMessageId(),
            role: "assistant",
            content: "Hello farmer! I am your Uzhavar Thunai, powered by Pasum AI. How can I help you today?",
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
        <div className="fixed bottom-5 right-5 z-[100] flex flex-col items-end gap-3">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8, y: 20, transformOrigin: "bottom right" }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8, y: 20 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                        className="w-[380px] h-[580px] bg-[#011913] p-0 flex flex-col overflow-hidden shadow-[0_20px_80px_rgba(0,0,0,0.6)] border-white/10"
                        style={{
                            border: "1px solid rgba(255, 255, 255, 0.1)",
                        }}
                    >
                        {/* Header with Cartoon Bot */}
                        <div className="p-3 bg-[#011913] border-b border-white/10 flex items-center justify-between relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                                <div className="absolute top-[-50%] right-[-10%] w-32 h-32 bg-accent-green rounded-full blur-[40px]"></div>
                            </div>

                            <div className="flex items-center gap-4 z-10">
                                <motion.div
                                    animate={{
                                        y: [0, -8, 0],
                                        rotate: [0, 5, -5, 0]
                                    }}
                                    transition={{
                                        duration: 4,
                                        repeat: Infinity,
                                        ease: "easeInOut"
                                    }}
                                    className="relative"
                                >
                                    <div className="h-16 w-16 rounded-2xl bg-[#01251c] flex items-center justify-center p-0.5 shadow-2xl border border-accent-green/30 overflow-hidden">
                                        <img src={logo} className="h-full w-full object-contain brightness-125 contrast-125 scale-[1.05]" alt="Bot" />
                                    </div>
                                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-accent-green rounded-full border-2 border-[#011913] shadow-[0_0_15px_#22c55e]"></div>
                                </motion.div>
                                <div>
                                    <h4 className="text-white font-black text-xl tracking-tight">Uzhavar Thunai – <span className="text-[#f59e0b]">Pasum AI</span></h4>
                                    <div className="flex items-center gap-2">
                                        <span className="w-2 h-2 bg-accent-green rounded-full animate-pulse"></span>
                                        <p className="text-[11px] text-accent-green font-black uppercase tracking-[0.2em]">Uzhavar Oli Active</p>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => setIsOpen(false)}
                                className="text-white/50 hover:text-white transition-all hover:bg-white/5 rounded-xl p-2 z-10"
                            >
                                <span className="text-xl">✕</span>
                            </button>
                        </div>

                        {/* Chat Window Container */}
                        <div className="flex-1 overflow-hidden relative bg-[#011913]">
                            {/* No Watermark - and Background Accent removed for cleaner look */}

                            <div className="h-full flex flex-col relative z-10">
                                <ChatWindow messages={messages} isLoading={isLoading} />
                            </div>
                        </div>

                        {/* Controls */}
                        <div className="p-3 bg-[#011913] border-t border-white/10">
                            <div className="flex flex-col gap-2">
                                <ChatInput
                                    onSendMessage={handleSendMessage}
                                    onVoiceCaptured={handleVoiceCaptured}
                                    disabled={isLoading}
                                />
                                <div className="text-[10px] text-white/20 font-bold uppercase tracking-[0.2em] text-center">
                                    Powered by Pasum AI Engine | Uzhavar Thunai – Uzhavar Oli🎙️
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Float Button with Animation */}
            <motion.button
                initial={false}
                onClick={() => setIsOpen(!isOpen)}
                className={`chatbot-toggle-btn ${isOpen ? "is-open" : "is-closed"}`}
            >
                <div className="absolute inset-0 bg-white/10 opacity-0 hover:opacity-100 transition-opacity"></div>

                <AnimatePresence mode="wait">
                    {isOpen ? (
                        <motion.div
                            key="close"
                            initial={{ opacity: 0, rotate: -90 }}
                            animate={{ opacity: 1, rotate: 0 }}
                            exit={{ opacity: 0, rotate: 90 }}
                            className="chatbot-toggle-close"
                        >
                            ✕
                        </motion.div>
                    ) : (
                        <motion.div
                            key="bot"
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{
                                opacity: 1,
                                scale: 1,
                                y: [0, -4, 0]
                            }}
                            transition={{
                                y: { duration: 2, repeat: Infinity, ease: "easeInOut" }
                            }}
                        >
                            <img src={logo} className="chatbot-toggle-logo" alt="Agent" />
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.button>
        </div>
    );
}
