import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, User, Repeat2, Heart } from "lucide-react";
import { communityApi } from "../services/communityApi";

interface EngagementModalProps {
    postId: string;
    onClose: () => void;
    onUserClick: (userId: string) => void;
}

export const EngagementModal = ({ postId, onClose, onUserClick }: EngagementModalProps) => {
    const [data, setData] = useState<{ reactions: any[], reposts: any[] } | null>(null);
    const [activeTab, setActiveTab] = useState<'reactions' | 'reposts'>('reactions');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetch = async () => {
            try {
                const result = await communityApi.getEngagement(postId);
                setData(result);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetch();
    }, [postId]);

    const items = activeTab === 'reactions' ? data?.reactions : data?.reposts;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl"
            >
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="font-black text-lg text-gray-900">Engagement</h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex p-2 gap-2 bg-gray-50 m-4 rounded-2xl">
                    <button
                        onClick={() => setActiveTab('reactions')}
                        className={`flex-1 py-2 rounded-xl text-sm font-black transition-all flex items-center justify-center gap-2 ${activeTab === 'reactions' ? 'bg-white shadow-sm text-emerald-600' : 'text-gray-400'}`}
                    >
                        <Heart size={16} /> Reactions
                    </button>
                    <button
                        onClick={() => setActiveTab('reposts')}
                        className={`flex-1 py-2 rounded-xl text-sm font-black transition-all flex items-center justify-center gap-2 ${activeTab === 'reposts' ? 'bg-white shadow-sm text-emerald-600' : 'text-gray-400'}`}
                    >
                        <Repeat2 size={16} /> Reposts
                    </button>
                </div>

                <div className="max-h-[400px] overflow-y-auto px-6 pb-6 space-y-4">
                    {loading ? (
                        <div className="py-20 text-center text-gray-400 font-bold animate-pulse uppercase text-xs tracking-widest">Loading engagement...</div>
                    ) : items && items.length > 0 ? (
                        items.map((item: any) => (
                            <div
                                key={item.id}
                                className="flex items-center justify-between group cursor-pointer hover:bg-gray-50 p-2 rounded-2xl transition-all"
                                onClick={() => onUserClick(item.userId.id || item.userId._id)}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 overflow-hidden">
                                        {item.userId.photo ? <img src={item.userId.photo} alt="" className="w-full h-full object-cover" /> : <User size={20} />}
                                    </div>
                                    <div>
                                        <p className="font-bold text-sm text-gray-900">{item.userId.fullName}</p>
                                        <p className="text-[10px] text-gray-400 uppercase font-black">{item.userId.role}</p>
                                    </div>
                                </div>
                                {activeTab === 'reactions' && (
                                    <span className="text-xl">{
                                        item.reactionType === 'love' ? '❤️' :
                                            item.reactionType === 'insightful' ? '💡' :
                                                item.reactionType === 'wow' ? '😮' :
                                                    item.reactionType === 'sad' ? '😢' : '👍'
                                    }</span>
                                )}
                            </div>
                        ))
                    ) : (
                        <div className="py-20 text-center text-gray-400 font-bold uppercase text-xs tracking-widest">No engagment yet</div>
                    )}
                </div>
            </motion.div>
        </div>
    );
};
