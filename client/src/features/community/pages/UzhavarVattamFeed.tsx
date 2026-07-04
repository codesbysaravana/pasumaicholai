import { useEffect, useState, useCallback, useMemo } from "react";
import { CreatePost } from "../components/CreatePost";
import { FeedPostCard } from "../components/FeedPostCard";
import { communityApi } from "../services/communityApi";
import type { CommunityPost } from "../types/community.types";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, TrendingUp, Zap } from "lucide-react";
import { DashboardLayout } from "../../../components/layout/DashboardLayout";
import { useAuth } from "../../../context/AuthContext";
import { CommunitySocketProvider, useCommunitySocket } from "../services/communitySocket.tsx";
import { Pagination } from "../../../components/ui/Pagination";

const ITEMS_PER_PAGE = 5;

const farmerItems = [
    { label: "Overview", href: "/dashboard/farmer" },
    { label: "Marketplace", href: "/dashboard/farmer/marketplace" },
    { label: "Consultation", href: "/dashboard/farmer/expert-consultation" },
    { label: "Chatbot", href: "/dashboard/farmer/chatbot" },
    { label: "Uzhavar Vattam", href: "/community" },
];

const FeedContent = () => {
    const { auth } = useAuth();
    const [posts, setPosts] = useState<CommunityPost[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);

    const fetchPosts = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await communityApi.getPosts();
            setPosts(data);
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPosts();
    }, [fetchPosts]);

    const totalPages = Math.ceil(posts.length / ITEMS_PER_PAGE);
    const paginatedPosts = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return posts.slice(start, start + ITEMS_PER_PAGE);
    }, [posts, currentPage]);

    const handleSocketMessage = useCallback((message: any) => {
        const { type, data } = message;

        switch (type) {
            case 'post_created':
                setPosts(prev => [data, ...prev]);
                setCurrentPage(1); // Reset to first page on new post
                break;
            case 'post_edited':
                setPosts(prev => prev.map(p => {
                    const pid = p.id || (p as any)._id;
                    const did = data.id || (data as any)._id;
                    return pid === did ? { ...p, ...data } : p;
                }));
                break;
            case 'post_deleted':
                setPosts(prev => prev.filter(p => {
                    const pid = p.id || (p as any)._id;
                    const did = data.postId || data.id;
                    return pid !== did;
                }));
                break;
            case 'reaction_added':
            case 'reaction_updated':
                setPosts(prev => prev.map(p => {
                    const matches = p.id === data.postId || (p as any)._id === data.postId;
                    if (matches) {
                        return {
                            ...p,
                            likeCount: data.likeCount,
                            reactions: data.reactions ? { ...data.reactions } : p.reactions
                        };
                    }
                    return p;
                }));
                break;
            case 'comment_added':
            case 'reply_added':
            case 'comment_deleted':
                setPosts(prev => prev.map(p => {
                    const matches = p.id === data.postId || (p as any)._id === data.postId;
                    if (matches) {
                        return {
                            ...p,
                            commentCount: data.commentCount !== undefined ? data.commentCount :
                                (type === 'comment_deleted' ? (p.commentCount || 1) - 1 : (p.commentCount || 0) + 1)
                        };
                    }
                    return p;
                }));
                break;
            case 'repost_created':
                setPosts(prev => {
                    // Update counts on the original post and any other instances
                    const updated = prev.filter(p => {
                        // If it's the specific repost being removed, filter it out
                        if (data.removed && (p as any).isRepost && (p.id === data.postId || (p as any)._id === data.postId) && ((p as any).reposter?.id === data.userId || (p as any).reposter?._id === data.userId)) {
                            return false;
                        }
                        return true;
                    }).map(p => {
                        const matches = p.id === data.postId || (p as any)._id === data.postId;
                        return matches ? { ...p, repostCount: data.repostCount } : p;
                    });

                    // Add the new repost entry at the top if it's a new repost
                    if (!data.removed && data.repostEntry) {
                        const reposterId = data.repostEntry.reposter?.id || data.repostEntry.reposter?._id;
                        const exists = updated.some(p => (p as any).isRepost && ((p as any).reposter?.id === reposterId || (p as any).reposter?._id === reposterId) && (p.id === data.postId || (p as any)._id === data.postId));
                        if (!exists) return [data.repostEntry, ...updated];
                    }
                    return updated;
                });
                break;
        }
    }, []);

    const { onlineUsers } = useCommunitySocket(handleSocketMessage);

    return (
        <div className="bg-transparent min-h-screen">
            <div className="max-w-[1400px] mx-auto px-4 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                    {/* Left Profile Sidebar */}
                    <div className="hidden lg:block lg:col-span-3">
                        <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="card sticky top-8" style={{ padding: 0, overflow: "hidden" }}>
                            <div className="h-24 bg-gradient-to-r from-emerald-600 to-teal-500" />
                            <div className="px-6 pb-8 -mt-10 relative z-10 text-center">
                                <div className="inline-block p-1 card mb-4" style={{ borderRadius: "50%", padding: "4px" }}>
                                    <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 text-3xl font-black">
                                        {auth?.name?.charAt(0)}
                                    </div>
                                </div>
                                <h2 className="font-black text-xl text-white">{auth?.name}</h2>
                                <p className="text-emerald-500 font-bold text-xs uppercase tracking-widest mt-1">{auth?.role}</p>

                                <div className="mt-8 pt-6 border-t border-white/5 text-left">
                                    <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-4 flex items-center justify-between">
                                        Online Farmers
                                        <span className="bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-full text-[9px]">{onlineUsers.size}</span>
                                    </p>
                                    <div className="space-y-3">
                                        {Array.from(onlineUsers).length > 0 ? (
                                            Array.from(onlineUsers)
                                                .filter(id => id !== auth?.userId)
                                                .slice(0, 10)
                                                .map(id => (
                                                    <div key={id} className="flex items-center gap-3 group cursor-pointer">
                                                        <div className="relative">
                                                            <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-[10px] font-black text-gray-400 group-hover:bg-emerald-500/10 group-hover:text-emerald-500 transition-colors">
                                                                {id.substring(0, 2).toUpperCase()}
                                                            </div>
                                                            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-[#121212] rounded-full" />
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-black text-white/80 group-hover:text-emerald-500 transition-colors">User {id.substring(0, 5)}</p>
                                                            <p className="text-[9px] font-bold text-emerald-500 uppercase tracking-tighter">Active Now</p>
                                                        </div>
                                                    </div>
                                                ))
                                        ) : (
                                            <p className="text-[10px] font-bold text-gray-500 italic">No other farmers online...</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>

                    {/* Feed */}
                    <main className="lg:col-span-6 space-y-6">
                        <CreatePost onPostCreated={fetchPosts} />

                        {isLoading && posts.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-32 gap-4">
                                <RefreshCw className="text-emerald-500 animate-spin" size={32} />
                                <p className="text-emerald-700 text-xs font-black uppercase tracking-widest">Sowing your feed...</p>
                            </div>
                        ) : (
                            <div className="stack">
                                <AnimatePresence mode="popLayout">
                                    {paginatedPosts.map((post: any) => (
                                        <FeedPostCard
                                            key={post.isRepost ? `${post.id}-${post.reposter?.id}` : post.id}
                                            post={post}
                                            isReposted={post.isRepost}
                                            reposterName={post.reposter?.fullName}
                                        />
                                    ))}
                                </AnimatePresence>
                                <Pagination
                                    currentPage={currentPage}
                                    totalPages={totalPages}
                                    onPageChange={(p) => {
                                        setCurrentPage(p);
                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                    }}
                                />
                            </div>
                        )}
                    </main>

                    {/* Trends Sidebar */}
                    <div className="hidden lg:block lg:col-span-3">
                        <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="card sticky top-8">
                            <h3 className="font-black text-lg text-white flex items-center gap-2 mb-6">
                                <TrendingUp size={20} className="text-emerald-500" />
                                Growth Trends
                            </h3>
                            <div className="space-y-4">
                                {['#HighYield2026', '#OrganicWealth', '#NammaOoruFarm'].map(tag => (
                                    <div key={tag} className="flex justify-between items-center group cursor-pointer">
                                        <p className="text-xs font-black text-gray-500 group-hover:text-emerald-500 transition-colors uppercase tracking-widest">{tag}</p>
                                        <Zap size={14} className="text-amber-400" />
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const UzhavarVattamFeed = () => {
    return (
        <DashboardLayout title="Uzhavar Vattam" items={farmerItems}>
            <CommunitySocketProvider>
                <FeedContent />
            </CommunitySocketProvider>
        </DashboardLayout>
    );
};
