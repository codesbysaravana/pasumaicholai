import { Repeat2 } from "lucide-react";
import { communityApi } from "../services/communityApi";

interface RepostButtonProps {
    postId: string;
    repostCount: number;
}

export const RepostButton = ({ postId, repostCount }: RepostButtonProps) => {

    const handleClick = async () => {
        try {
            await communityApi.repost(postId);
        } catch (err) {
            console.error("Failed to repost", err);
        }
    };

    return (
        <button
            onClick={handleClick}
            className="flex items-center justify-center gap-2 hover:bg-gray-50 p-3 rounded-2xl transition-all text-gray-500 group"
        >
            <Repeat2 size={20} className="group-hover:rotate-12 transition-transform" />
            <span className="text-sm font-bold">{repostCount > 0 ? repostCount : "Repost"}</span>
        </button>
    );
};
