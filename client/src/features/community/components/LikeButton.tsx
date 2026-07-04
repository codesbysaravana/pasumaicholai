import { useState } from "react";
import { Heart } from "lucide-react";
import { motion } from "framer-motion";

interface LikeButtonProps {
    initialLikes: number;
    onToggle: () => Promise<{ liked: boolean }>;
}

export const LikeButton = ({ initialLikes, onToggle }: LikeButtonProps) => {
    const [likes, setLikes] = useState(initialLikes);
    const [isLiked, setIsLiked] = useState(false);

    const handleLike = async () => {
        try {
            const result = await onToggle();
            setLikes(prev => result.liked ? prev + 1 : prev - 1);
            setIsLiked(result.liked);
        } catch (err) {
            console.error("Failed to toggle like", err);
        }
    };

    return (
        <div className="flex items-center gap-2">
            <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleLike}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-colors ${isLiked ? "text-red-500 bg-red-50" : "text-gray-500 hover:bg-gray-100"
                    }`}
            >
                <Heart size={20} fill={isLiked ? "currentColor" : "none"} />
                <span className="text-sm font-semibold">{likes}</span>
            </motion.button>
        </div>
    );
};
