import { REACTION_TYPES } from "./ReactionPicker";

interface ReactionBarProps {
    counts?: { [key: string]: number };
    total: number;
    onClick?: () => void;
    mini?: boolean;
}

export const ReactionBar = ({ counts, total, onClick, mini }: ReactionBarProps) => {
    if (total === 0) return null;

    // Get top 3 emoji types that have counts
    const topReactions = REACTION_TYPES.filter(r => (counts?.[r.id] || 0) > 0)
        .sort((a, b) => (counts?.[b.id] || 0) - (counts?.[a.id] || 0))
        .slice(0, 3);

    if (mini) {
        return (
            <div className="flex items-center gap-1 bg-white shadow-sm border border-gray-100 rounded-full px-1.5 py-0.5 ml-auto">
                <div className="flex -space-x-1">
                    {topReactions.map(r => (
                        <span key={r.id} className="text-[10px]">{r.emoji}</span>
                    ))}
                </div>
                <span className="text-[10px] font-black text-gray-400">
                    {total}
                </span>
            </div>
        );
    }

    return (
        <div
            onClick={onClick}
            className="flex items-center gap-2 py-4 border-t border-gray-50 cursor-pointer hover:bg-emerald-50/10 transition-colors group"
        >
            <div className="flex -space-x-1.5">
                {topReactions.map(r => (
                    <div key={r.id} className="w-5 h-5 rounded-full bg-white border border-gray-100 flex items-center justify-center text-[10px] shadow-sm transform group-hover:scale-110 transition-transform">
                        {r.emoji}
                    </div>
                ))}
            </div>
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest group-hover:text-emerald-600 transition-colors">
                {total} {total === 1 ? 'perception' : 'perceptions'}
            </span>
        </div>
    );
};
