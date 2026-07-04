import { useState } from "react";
import { MessageCircle, Share2, MoreVertical, Globe, MapPin, CheckCircle2, Pencil, Trash } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { communityApi } from "../services/communityApi";
import type { CommunityPost } from "../types/community.types";
import { CommentSection } from "./CommentSection";
import { RepostButton } from "./RepostButton";
import { ReactionPicker } from "./ReactionPicker";
import { ReactionBar } from "./ReactionBar";
import { ImageCarousel } from "./ImageCarousel";
import { OnlineStatusBadge } from "./OnlineStatusBadge";
import { useCommunitySocket } from "../services/communitySocket.tsx";
import { EngagementModal } from "./EngagementModal";
import { UserProfileModal } from "./UserProfileModal";
import { useAuth } from "../../../context/AuthContext";

interface FeedPostCardProps {
    post: CommunityPost;
    isReposted?: boolean;
    reposterName?: string;
}

export const FeedPostCard = ({ post, isReposted, reposterName }: FeedPostCardProps) => {
    const [showComments, setShowComments] = useState(false);
    const [showReactionPicker, setShowReactionPicker] = useState(false);
    const [showEngagement, setShowEngagement] = useState(false);
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [showMenu, setShowMenu] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editVal, setEditVal] = useState(post.description);
    const { onlineUsers } = useCommunitySocket(() => { });
    const { auth } = useAuth();

    // Check if current user is owner of the post OR the reposter
    const originalAuthorId = post.userId.id || (post.userId as any)._id;
    const reposterId = (post as any).reposter?.id || (post as any).reposter?._id;
    const isOwner = auth?.userId === originalAuthorId || (isReposted && auth?.userId === reposterId);
    const userIdStr = originalAuthorId; // Keep for presence check
    const isOnline = onlineUsers.has(userIdStr);

    const handleEdit = async () => {
        if (!editVal.trim()) return;
        try {
            await communityApi.editPost(post.id, editVal);
            setIsEditing(false);
            setShowMenu(false);
        } catch (err) {
            console.error(err);
        }
    };

    const handleDelete = async () => {
        if (confirm("Are you sure you want to delete this post?")) {
            try {
                await communityApi.deletePost(post.id);
            } catch (err) {
                console.error(err);
            }
        }
    };

    const handleReact = async (type: string) => {
        try {
            await communityApi.react(post.id, type);
        } catch (err) {
            console.error(err);
        }
    };

    const handleUserClick = async (userId: string) => {
        try {
            const profile = await communityApi.getUserProfile(userId);
            setSelectedUser(profile);
        } catch (err) {
            console.error(err);
        }
    };

    const handleShare = async () => {
        try {
            if (navigator.share) {
                await navigator.share({
                    title: "Farmer Community Post",
                    text: post.description,
                    url: `${window.location.origin}/community?postId=${post.id}`,
                });
            } else {
                navigator.clipboard.writeText(`${window.location.origin}/community?postId=${post.id}`);
                alert("Post link copied to clipboard!");
            }
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-[2.5rem] shadow-xl shadow-emerald-500/5 border border-emerald-50 overflow-hidden"
        >
            {isReposted && (
                <div className="px-8 pt-4 pb-0 flex items-center gap-2 text-gray-400 font-black text-[10px] uppercase tracking-widest border-b border-gray-50 pb-2">
                    <Share2 size={12} />
                    {reposterName} reposted this
                </div>
            )}

            <div className="p-8">
                {/* Header */}
                <div className="flex justify-between items-start mb-6">
                    <div className="flex gap-4 items-center">
                        <div className="relative group cursor-pointer" onClick={() => handleUserClick(userIdStr)}>
                            <div className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-700 text-xl font-black shadow-inner overflow-hidden border-2 border-white transform group-hover:scale-105 transition-transform">
                                {post.userId.photo ? <img src={post.userId.photo} className="w-full h-full object-cover" /> : post.userId.fullName.charAt(0)}
                            </div>
                            <OnlineStatusBadge isOnline={isOnline} />
                        </div>
                        <div>
                            <div className="flex items-center gap-1.5 cursor-pointer" onClick={() => handleUserClick(userIdStr)}>
                                <h3 className="font-black text-gray-900 leading-none hover:text-emerald-600 transition-colors">{post.userId.fullName}</h3>
                                <CheckCircle2 size={14} className="text-blue-500" />
                            </div>
                            <div className="flex items-center gap-2 mt-1.5">
                                <span className="text-emerald-600 font-bold text-[10px] uppercase tracking-widest">{post.userId.role}</span>
                                <span className="w-1 h-1 bg-gray-300 rounded-full" />
                                <div className="flex items-center gap-1 text-gray-400 text-[10px] font-bold">
                                    <Globe size={10} />
                                    <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                                    {post.location && (
                                        <>
                                            <span className="w-1 h-1 bg-gray-300 rounded-full mx-1" />
                                            <MapPin size={10} className="text-amber-500" />
                                            <span>{post.location.name}</span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                    {isOwner && (
                        <div className="relative">
                            <button
                                onClick={() => setShowMenu(!showMenu)}
                                className="p-2 hover:bg-gray-50 rounded-xl transition-colors text-gray-400"
                            >
                                <MoreVertical size={20} />
                            </button>
                            {showMenu && (
                                <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-100 shadow-xl rounded-2xl p-2 z-20 flex flex-col gap-1">
                                    {auth?.userId === originalAuthorId && (
                                        <button
                                            onClick={() => { setIsEditing(true); setShowMenu(false); }}
                                            className="flex items-center gap-3 w-full text-left px-4 py-2.5 hover:bg-emerald-50 rounded-xl text-sm font-bold text-gray-700 transition-colors"
                                        >
                                            <Pencil size={16} className="text-emerald-500" /> Edit Post
                                        </button>
                                    )}
                                    <button
                                        onClick={handleDelete}
                                        className="flex items-center gap-3 w-full text-left px-4 py-2.5 hover:bg-red-50 rounded-xl text-sm font-bold text-red-600 transition-colors"
                                    >
                                        <Trash size={16} className="text-red-500" /> {isReposted && auth?.userId === reposterId ? 'Remove Repost' : 'Delete Post'}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Content */}
                <div className="space-y-4">
                    {isEditing ? (
                        <div className="space-y-3 bg-gray-50/50 p-4 rounded-3xl border border-emerald-50">
                            <textarea
                                value={editVal}
                                onChange={(e) => setEditVal(e.target.value)}
                                className="w-full bg-white border border-gray-100 rounded-2xl p-4 text-gray-700 text-lg font-medium focus:ring-2 focus:ring-emerald-500/20 transition-all min-h-[120px] shadow-inner"
                                autoFocus
                            />
                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => { setIsEditing(false); setEditVal(post.description); }}
                                    className="px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest text-gray-400 hover:bg-gray-100 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleEdit}
                                    className="px-8 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest bg-emerald-600 text-white shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all active:scale-95"
                                >
                                    Save Changes
                                </button>
                            </div>
                        </div>
                    ) : (
                        <p className="text-gray-800 text-lg leading-relaxed font-medium">
                            {post.description}
                        </p>
                    )}

                    <ImageCarousel images={post.images} />
                </div>

                {/* Reaction Summary Bar */}
                <ReactionBar
                    counts={post.reactions}
                    total={post.likeCount}
                    onClick={() => setShowEngagement(true)}
                />

                {/* Main Action Buttons */}
                <div className="grid grid-cols-4 gap-2 mt-4 pt-4 border-t border-gray-50">
                    <div className="relative">
                        <button
                            onMouseEnter={() => setShowReactionPicker(true)}
                            onMouseLeave={() => setShowReactionPicker(false)}
                            onClick={() => handleReact('LIKE')}
                            className="w-full flex items-center justify-center gap-2 hover:bg-gray-50 p-3 rounded-2xl transition-all text-gray-500 group"
                        >
                            <span className="text-xl group-hover:scale-125 transition-transform">👍</span>
                            <span className="text-sm font-bold">React</span>
                        </button>

                        <AnimatePresence>
                            {showReactionPicker && (
                                <div
                                    onMouseEnter={() => setShowReactionPicker(true)}
                                    onMouseLeave={() => setShowReactionPicker(false)}
                                >
                                    <ReactionPicker
                                        onReact={handleReact}
                                        onClose={() => setShowReactionPicker(false)}
                                    />
                                </div>
                            )}
                        </AnimatePresence>
                    </div>

                    <button
                        onClick={() => setShowComments(!showComments)}
                        className={`flex items-center justify-center gap-2 p-3 rounded-2xl transition-all ${showComments ? 'bg-emerald-50 text-emerald-600 shadow-inner' : 'hover:bg-gray-50 text-gray-500'}`}
                    >
                        <MessageCircle size={20} />
                        <span className="text-sm font-bold">
                            {post.commentCount > 1 ? `${post.commentCount} Comments` : post.commentCount === 1 ? "1 Comment" : "Comment"}
                        </span>
                    </button>

                    <RepostButton postId={post.id} repostCount={post.repostCount} />

                    <button
                        onClick={handleShare}
                        className="flex items-center justify-center gap-2 hover:bg-gray-50 p-3 rounded-2xl transition-all text-gray-500"
                    >
                        <Share2 size={20} />
                        <span className="text-sm font-bold">Share</span>
                    </button>
                </div>

                {/* Comments Section */}
                <AnimatePresence>
                    {showComments && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                        >
                            <CommentSection
                                postId={post.id}
                                postAuthorId={userIdStr}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {showEngagement && (
                <EngagementModal
                    postId={post.id}
                    onClose={() => setShowEngagement(false)}
                    onUserClick={handleUserClick}
                />
            )}

            {selectedUser && (
                <UserProfileModal
                    user={selectedUser}
                    onClose={() => setSelectedUser(null)}
                />
            )}
        </motion.div>
    );
};
