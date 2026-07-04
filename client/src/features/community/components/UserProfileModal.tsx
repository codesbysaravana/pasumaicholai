import { motion } from "framer-motion";
import { X, User, MapPin, Calendar, Share2, Award, Zap } from "lucide-react";

interface UserProfileModalProps {
    user: any;
    onClose: () => void;
}

export const UserProfileModal = ({ user, onClose }: UserProfileModalProps) => {
    if (!user) return null;

    const handleShareProfile = () => {
        const url = `${window.location.origin}/community?userId=${user.id || user._id}`;
        navigator.clipboard.writeText(url);
        alert("Profile link copied to clipboard!");
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="bg-white rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl relative"
            >
                <div className="h-32 bg-gradient-to-r from-emerald-600 to-teal-500" />

                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full transition-colors z-10"
                >
                    <X size={20} />
                </button>

                <div className="px-8 pb-8 -mt-12 text-center">
                    <div className="inline-block p-1.5 bg-white rounded-[2rem] shadow-xl mb-4 relative">
                        <div className="w-24 h-24 rounded-[1.5rem] bg-gradient-to-br from-emerald-100 to-emerald-200 flex items-center justify-center text-emerald-700 text-4xl font-black overflow-hidden">
                            {user.photo ? <img src={user.photo} alt="" className="w-full h-full object-cover" /> : user.fullName?.charAt(0)}
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-emerald-500 border-4 border-white rounded-full flex items-center justify-center">
                            < Award size={14} className="text-white" />
                        </div>
                    </div>

                    <h2 className="text-2xl font-black text-gray-900 leading-tight">{user.fullName}</h2>
                    <div className="flex items-center justify-center gap-2 mt-1">
                        <span className="text-emerald-600 font-bold text-xs uppercase tracking-widest">{user.role}</span>
                        <span className="w-1 h-1 bg-gray-300 rounded-full" />
                        <div className="flex items-center gap-1 text-gray-400 text-xs font-bold">
                            <MapPin size={12} />
                            {user.location || "Tamil Nadu, India"}
                        </div>
                    </div>

                    <div className="mt-8 grid grid-cols-3 gap-4 border-y border-gray-100 py-6">
                        <div>
                            <p className="text-[10px] uppercase font-black text-gray-400">Posts</p>
                            <p className="text-xl font-black text-gray-900">42</p>
                        </div>
                        <div>
                            <p className="text-[10px] uppercase font-black text-gray-400">Karma</p>
                            <p className="text-xl font-black text-emerald-600">1.2k</p>
                        </div>
                        <div>
                            <p className="text-[10px] uppercase font-black text-gray-400">Network</p>
                            <p className="text-xl font-black text-gray-900">258</p>
                        </div>
                    </div>

                    <div className="mt-8 space-y-4">
                        <div className="flex items-start gap-4 text-left bg-emerald-50/50 p-4 rounded-2xl">
                            <div className="p-2 bg-emerald-100 rounded-xl text-emerald-600">
                                <Zap size={18} />
                            </div>
                            <div>
                                <p className="text-sm font-black text-gray-900 capitalize">Expertise</p>
                                <p className="text-xs text-gray-500 font-medium mt-0.5">Specialized in Organic Farming & Soil Restoration techniques.</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <button
                                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black py-4 rounded-2xl transition-all shadow-lg shadow-emerald-200"
                            >
                                Connect Now
                            </button>
                            <button
                                onClick={handleShareProfile}
                                className="p-4 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-2xl transition-all"
                            >
                                <Share2 size={20} />
                            </button>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};
