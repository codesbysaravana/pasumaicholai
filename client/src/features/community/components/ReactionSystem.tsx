import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ThumbsUp, Heart, Lightbulb, Zap, Smile } from "lucide-react";
import { communityApi } from "../services/communityApi";

interface ReactionSystemProps {
    postId: string;
    initialLikeCount: number;
    reactions?: {
        like: number;
        love: number;
        insightful: number;
        wow: number;
        sad: number;
    };
    onShowEngagement: () => void;
}

const REACTION_TYPES = [
    { id: 'like', icon: <ThumbsUp size={18} className="text-blue-500" />, label: 'Like', emoji: '👍' },
    { id: 'love', icon: <Heart size={18} className="text-red-500" />, label: 'Love', emoji: '❤️' },
    { id: 'insightful', icon: <Lightbulb size={18} className="text-amber-500" />, label: 'Insightful', emoji: '💡' },
    { id: 'wow', icon: <Zap size={18} className="text-purple-500" />, label: 'Wow', emoji: '😮' },
    { id: 'sad', icon: <Smile size={18} className="text-gray-500" />, label: 'Sad', emoji: '😢' },
];

export const ReactionSystem = ({ postId, initialLikeCount, reactions, onShowEngagement }: ReactionSystemProps) => {
    const [showEmojis, setShowEmojis] = useState(false);
    const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const handleMouseEnter = () => {
        hoverTimeoutRef.current = setTimeout(() => setShowEmojis(true), 500);
    };

    const handleMouseLeave = () => {
        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
        setShowEmojis(false);
    };

    const handleToggleLike = async (reactionType: string = 'like') => {
        try {
            await communityApi.toggleLike(postId, reactionType);
            setShowEmojis(false);
        } catch (err) {
            console.error("Failed to reaction", err);
        }
    };

    const totalReactions = Object.values(reactions || {}).reduce((a, b) => a + b, 0) || initialLikeCount;

    return (
        <div className="relative group">
            <div
                className="flex items-center gap-1.5"
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
            >
                <button
                    onClick={() => handleToggleLike('like')}
                    className="flex items-center gap-2 hover:bg-gray-50 p-2 rounded-xl transition-colors text-gray-500 group"
                >
                    <ThumbsUp size={20} className="group-hover:scale-110 transition-transform" />
                    <span className="text-sm font-bold">{totalReactions > 0 ? totalReactions : "Like"}</span>
                </button>

                {totalReactions > 0 && (
                    <div
                        onClick={onShowEngagement}
                        className="flex -space-x-1 cursor-pointer hover:bg-emerald-50 p-1 rounded-lg transition-colors"
                    >
                        {reactions?.love ? <span className="text-xs">❤️</span> : null}
                        {reactions?.like ? <span className="text-xs">👍</span> : null}
                        {reactions?.insightful ? <span className="text-xs">💡</span> : null}
                    </div>
                )}

                <AnimatePresence>
                    {showEmojis && (
                        <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.8 }}
                            animate={{ opacity: 1, y: -45, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.8 }}
                            className="absolute left-0 bottom-full mb-2 bg-white shadow-2xl rounded-full p-1.5 flex gap-1 border border-gray-100 z-50 origin-bottom"
                            onMouseEnter={() => setShowEmojis(true)}
                            onMouseLeave={() => setShowEmojis(false)}
                        >
                            {REACTION_TYPES.map((r) => (
                                <motion.button
                                    key={r.id}
                                    whileHover={{ scale: 1.3, y: -5 }}
                                    onClick={() => handleToggleLike(r.id)}
                                    className="w-10 h-10 flex items-center justify-center hover:bg-gray-50 rounded-full transition-colors relative group/emoji"
                                >
                                    <span className="text-2xl">{r.emoji}</span>
                                    <span className="absolute -top-8 bg-gray-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover/emoji:opacity-100 transition-opacity">
                                        {r.label}
                                    </span>
                                </motion.button>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};
