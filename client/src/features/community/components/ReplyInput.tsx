import { useState } from "react";
import { Send } from "lucide-react";
import { motion } from "framer-motion";

interface ReplyInputProps {
    onSend: (text: string) => Promise<void>;
    placeholder?: string;
}

export const ReplyInput = ({ onSend, placeholder = "Write a reply..." }: ReplyInputProps) => {
    const [text, setText] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!text.trim() || isLoading) return;

        setIsLoading(true);
        try {
            await onSend(text);
            setText("");
        } catch (err) {
            console.error("Failed to send reply", err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="flex gap-2 mt-3 bg-emerald-50/50 p-1.5 rounded-xl border border-emerald-100/50">
            <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={placeholder}
                className="flex-1 bg-transparent border-none px-3 py-1 text-xs font-bold text-gray-600 placeholder-gray-300 focus:ring-0"
            />
            <motion.button
                whileTap={{ scale: 0.9 }}
                disabled={!text.trim() || isLoading}
                className="bg-white p-1.5 rounded-lg text-emerald-600 shadow-sm border border-emerald-50 disabled:opacity-50 transition-all hover:bg-emerald-600 hover:text-white"
            >
                <Send size={14} />
            </motion.button>
        </form>
    );
};
