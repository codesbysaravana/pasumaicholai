import { motion } from "framer-motion";

interface ReactionPickerProps {
    onReact: (type: string) => void;
    onClose: () => void;
}

export const REACTION_TYPES = [
    { id: 'LIKE', emoji: '👍', label: 'Like' },
    { id: 'LOVE', emoji: '❤️', label: 'Love' },
    { id: 'SUPPORT', emoji: '💪', label: 'Support' },
    { id: 'INSIGHTFUL', emoji: '💡', label: 'Insightful' },
    { id: 'CELEBRATE', emoji: '🎉', label: 'Celebrate' },
];

export const ReactionPicker = ({ onReact, onClose }: ReactionPickerProps) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.8 }}
            animate={{ opacity: 1, y: -45, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.8 }}
            className="absolute left-0 bottom-full mb-2 bg-white shadow-2xl rounded-full p-2 flex gap-1 border border-gray-100 z-50 origin-bottom"
        >
            {REACTION_TYPES.map((r) => (
                <motion.button
                    key={r.id}
                    whileHover={{ scale: 1.3, y: -5 }}
                    onClick={() => {
                        onReact(r.id);
                        onClose();
                    }}
                    className="w-10 h-10 flex items-center justify-center hover:bg-gray-50 rounded-full transition-colors relative group/emoji"
                >
                    <span className="text-2xl">{r.emoji}</span>
                    <span className="absolute -top-8 bg-gray-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover/emoji:opacity-100 transition-opacity">
                        {r.label}
                    </span>
                </motion.button>
            ))}
        </motion.div>
    );
};
