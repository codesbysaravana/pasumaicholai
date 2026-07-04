import { useState, useEffect, useCallback } from "react";
import { MessageCircle, MoreVertical, Pencil, Trash } from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { communityApi } from "../services/communityApi";
import type { CommunityComment } from "../types/community.types";
import { ReplyInput } from "./ReplyInput";
import { useCommunitySocket } from "../services/communitySocket.tsx";
import { ReactionPicker } from "./ReactionPicker";
import { ReactionBar } from "./ReactionBar";
import { AnimatePresence } from "framer-motion";
import { OnlineStatusBadge } from "./OnlineStatusBadge";

// Removed unused CommentSectionProps

const CommentItem = ({ comment, onReply, onReact, onEdit, onDelete, currentUserId, postAuthorId, onlineUsers }: {
    comment: CommunityComment,
    onReply: (parentId: string, text: string, name: string) => Promise<void>,
    onReact: (commentId: string, reaction: string) => Promise<void>,
    onEdit: (commentId: string, newText: string) => Promise<void>,
    onDelete: (commentId: string) => Promise<void>,
    currentUserId?: string,
    postAuthorId?: string,
    onlineUsers: Set<string>
}) => {
    const [showReply, setShowReply] = useState(false);
    const [showPicker, setShowPicker] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editVal, setEditVal] = useState(comment.commentText);

    const commentUserId = typeof comment.userId === 'string' ? comment.userId : (comment.userId?.id || (comment.userId as any)?._id);
    const isOwner = commentUserId?.toString() === currentUserId?.toString();
    const isPostAuthor = commentUserId?.toString() === postAuthorId?.toString();
    const isOnline = onlineUsers.has(commentUserId?.toString() || "");

    return (
        <div className="space-y-3 relative group">
            <div className="flex gap-3 items-start relative">
                <div className="flex-shrink-0 relative">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-xs border border-emerald-50 shadow-sm mt-1">
                        {comment.userId.photo ? <img src={comment.userId.photo} className="w-full h-full object-cover rounded-full" /> : comment.userId.fullName.charAt(0)}
                    </div>
                    <OnlineStatusBadge isOnline={isOnline} size="sm" />
                </div>
                <div className="bg-gray-50 rounded-[1.5rem] p-4 flex-1 border border-gray-100/50">
                    <div className="flex justify-between items-center mb-1">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-black text-gray-900">{comment.userId.fullName}</span>
                            {isPostAuthor && (
                                <span className="bg-slate-600 text-white text-[9px] font-black px-2 py-0.5 rounded ml-1 uppercase tracking-wider">Author</span>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{new Date(comment.createdAt).toLocaleDateString()}</span>
                            {isOwner && (
                                <div className="relative">
                                    <button onClick={() => setShowMenu(!showMenu)} className="p-1 rounded-full hover:bg-gray-200 text-gray-400 transition-colors">
                                        <MoreVertical size={14} />
                                    </button>
                                    {showMenu && (
                                        <div className="absolute right-0 top-full mt-1 w-28 bg-white border border-gray-100 shadow-xl rounded-xl p-1 z-10 flex flex-col gap-1">
                                            <button
                                                onClick={() => { setIsEditing(true); setShowMenu(false); }}
                                                className="flex items-center gap-2 w-full text-left px-2 py-1.5 hover:bg-emerald-50 rounded-lg text-[10px] font-black uppercase tracking-widest text-emerald-600"
                                            >
                                                <Pencil size={12} /> Edit
                                            </button>
                                            <button
                                                onClick={() => { onDelete(comment.id); setShowMenu(false); }}
                                                className="flex items-center gap-2 w-full text-left px-2 py-1.5 hover:bg-red-50 rounded-lg text-[10px] font-black uppercase tracking-widest text-red-600"
                                            >
                                                <Trash size={12} /> Delete
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                    {isEditing ? (
                        <div className="mt-2">
                            <input
                                value={editVal}
                                onChange={(e) => setEditVal(e.target.value)}
                                className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-emerald-500/20"
                                autoFocus
                            />
                            <div className="flex justify-end gap-2 mt-2">
                                <button onClick={() => setIsEditing(false)} className="px-3 py-1 rounded-lg text-[10px] font-black uppercase text-gray-400 hover:bg-gray-200">Cancel</button>
                                <button onClick={async () => { await onEdit(comment.id, editVal); setIsEditing(false); }} className="px-3 py-1 rounded-lg text-[10px] font-black uppercase bg-emerald-100 text-emerald-700 hover:bg-emerald-200">Save</button>
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm text-gray-700 leading-relaxed font-medium mt-1">{comment.commentText}</p>
                    )}

                    <div className="flex items-center gap-3 mt-3 pt-2">
                        <div className="relative">
                            <button
                                onMouseEnter={() => setShowPicker(true)}
                                onMouseLeave={() => setShowPicker(false)}
                                onClick={() => onReact(comment.id, 'LIKE')}
                                className="text-[10px] font-black uppercase tracking-wider text-gray-500 hover:text-emerald-700 transition-colors"
                            >
                                React
                            </button>
                            <AnimatePresence>
                                {showPicker && (
                                    <div onMouseEnter={() => setShowPicker(true)} onMouseLeave={() => setShowPicker(false)}>
                                        <ReactionPicker onReact={(type) => onReact(comment.id, type)} onClose={() => setShowPicker(false)} />
                                    </div>
                                )}
                            </AnimatePresence>
                        </div>

                        {comment.likeCount > 0 && (
                            <>
                                <span className="text-gray-300 text-[10px]">•</span>
                                <ReactionBar counts={comment.reactions} total={comment.likeCount} mini />
                            </>
                        )}

                        <span className="text-gray-300 ml-1">|</span>

                        <button
                            onClick={() => setShowReply(!showReply)}
                            className="text-[10px] font-black uppercase tracking-wider text-gray-500 hover:text-emerald-700 transition-colors ml-1"
                        >
                            Reply
                        </button>

                        {comment.replies && comment.replies.length > 0 && (
                            <>
                                <span className="text-gray-300 text-[10px]">•</span>
                                <span className="text-[10px] font-bold text-gray-400">
                                    {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}
                                </span>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {showReply && (
                <div className="ml-11">
                    <ReplyInput onSend={async (text) => {
                        await onReply(comment.id, text, comment.userId.fullName);
                        setShowReply(false);
                    }} />
                </div>
            )}

            {comment.replies && comment.replies.length > 0 && (
                <div className="ml-5 sm:ml-8 space-y-4 border-l-2 border-emerald-50/50 pl-4 sm:pl-6 mt-4 relative">
                    {/* Visual Curve Connector for replies */}
                    <div className="absolute -left-[2px] top-0 w-4 h-6 border-l-2 border-b-2 border-emerald-50/50 rounded-bl-xl" />
                    {comment.replies.map(reply => (
                        <CommentItem
                            key={reply.id}
                            comment={reply}
                            onReply={onReply}
                            onReact={onReact}
                            onEdit={onEdit}
                            onDelete={onDelete}
                            currentUserId={currentUserId}
                            postAuthorId={postAuthorId}
                            onlineUsers={onlineUsers}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export const CommentSection = ({ postId, postAuthorId }: { postId: string, postAuthorId?: string }) => {
    const { auth } = useAuth();
    const [comments, setComments] = useState<CommunityComment[]>([]);
    const [newCommentText, setNewCommentText] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const fetchComments = useCallback(async () => {
        try {
            const data = await communityApi.getComments(postId);
            setComments(data);
        } catch (err) {
            console.error("Failed to fetch comments", err);
        }
    }, [postId]);

    useEffect(() => {
        fetchComments();
    }, [fetchComments]);

    const handleSocketMessage = useCallback((message: any) => {
        const { type, data } = message;

        const incomingPostId = data.postId?.toString();
        const currentPostId = postId?.toString();

        if (incomingPostId !== currentPostId) return;

        if (type === 'comment_added') {
            setComments(prev => {
                const newComment = data.comment;
                const newId = newComment.id?.toString() || newComment._id?.toString() || (newComment as any).id;
                if (prev.some(c => (c.id?.toString() || (c as any)._id?.toString() || (c as any).id) === newId)) return prev;

                // Ensure structured for tree
                const structuredComment = {
                    ...newComment,
                    id: newId,
                    replies: newComment.replies || []
                };
                return [...prev, structuredComment];
            });
        } else if (type === 'reply_added') {
            setComments(prev => {
                const updateReplies = (cms: CommunityComment[]): CommunityComment[] => {
                    return cms.map(c => {
                        const currentCId = c.id?.toString() || (c as any)._id?.toString() || (c as any).id;
                        const incomingParentId = data.parentId?.toString();

                        if (currentCId === incomingParentId) {
                            const replies = c.replies || [];
                            const newReply = data.reply;
                            const newReplyId = newReply.id?.toString() || newReply._id?.toString() || (newReply as any).id;

                            if (replies.some(r => (r.id?.toString() || (r as any)._id?.toString() || (r as any).id) === newReplyId)) return c;

                            const structuredReply = {
                                ...newReply,
                                id: newReplyId,
                                replies: newReply.replies || []
                            };
                            return { ...c, replies: [...replies, structuredReply] };
                        }
                        if (c.replies && c.replies.length >= 0) {
                            const updatedNested = updateReplies(c.replies);
                            if (updatedNested !== c.replies) {
                                return { ...c, replies: updatedNested };
                            }
                        }
                        return c;
                    });
                };
                return updateReplies(prev);
            });
        } else if (type === 'comment_reaction_added') {
            setComments(prev => {
                const updateTree = (cms: CommunityComment[]): CommunityComment[] => {
                    return cms.map(c => {
                        const currentCId = c.id?.toString() || (c as any)._id?.toString() || (c as any).id;
                        const incomingCommentId = data.commentId?.toString();

                        if (currentCId === incomingCommentId) {
                            return { ...c, likeCount: data.likeCount, reactions: data.reactions };
                        }
                        if (c.replies) {
                            return { ...c, replies: updateTree(c.replies) };
                        }
                        return c;
                    });
                };
                return updateTree(prev);
            });
        } else if (type === 'comment_edited') {
            setComments(prev => {
                const updateTree = (cms: CommunityComment[]): CommunityComment[] => {
                    return cms.map(c => {
                        const currentCId = c.id?.toString() || (c as any)._id?.toString() || (c as any).id;
                        const incomingCommentId = data.commentId?.toString();

                        if (currentCId === incomingCommentId) {
                            return { ...c, commentText: data.text };
                        }
                        if (c.replies) {
                            return { ...c, replies: updateTree(c.replies) };
                        }
                        return c;
                    });
                };
                return updateTree(prev);
            });
        } else if (type === 'comment_deleted') {
            setComments(prev => {
                const filterTree = (cms: CommunityComment[]): CommunityComment[] => {
                    return cms.filter(c => {
                        const currentCId = c.id?.toString() || (c as any)._id?.toString() || (c as any).id;
                        const incomingCommentId = data.commentId?.toString();
                        return currentCId !== incomingCommentId;
                    }).map(c => {
                        if (c.replies) {
                            return { ...c, replies: filterTree(c.replies) };
                        }
                        return c;
                    });
                };
                return filterTree(prev);
            });
        }
    }, [postId]);

    const { onlineUsers } = useCommunitySocket(handleSocketMessage);

    const handleAddComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCommentText.trim() || isLoading) return;
        setIsLoading(true);
        try {
            await communityApi.addComment(postId, newCommentText);
            setNewCommentText("");
        } catch (err) {
            console.error("Failed to add comment", err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleReply = async (parentId: string, text: string, parentName: string) => {
        try {
            const finalDoc = text.startsWith('@') ? text : `@${parentName} ${text}`;
            await communityApi.addReply(parentId, finalDoc);
        } catch (err) {
            console.error("Failed to add reply", err);
        }
    };

    const handleReactToComment = async (commentId: string, reaction: string) => {
        try {
            await communityApi.reactToComment(commentId, reaction);
        } catch (err) {
            console.error("Failed to react to comment", err);
        }
    };

    const handleEditComment = async (commentId: string, newText: string) => {
        try {
            if (!newText.trim()) return;
            await communityApi.editComment(commentId, newText);
        } catch (err) {
            console.error("Failed to edit comment", err);
        }
    };

    const handleDeleteComment = async (commentId: string) => {
        try {
            await communityApi.deleteComment(commentId);
        } catch (err) {
            console.error("Failed to delete comment", err);
        }
    };

    return (
        <div className="mt-8 pt-8 border-t border-gray-100">
            <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] mb-6 flex items-center gap-2">
                <MessageCircle size={14} />
                Discussions
            </h4>

            <div className="space-y-8 mb-8">
                {comments.map((comment) => (
                    <CommentItem
                        key={comment.id}
                        comment={comment}
                        onReply={handleReply}
                        onReact={handleReactToComment}
                        onEdit={handleEditComment}
                        onDelete={handleDeleteComment}
                        currentUserId={auth?.userId}
                        postAuthorId={postAuthorId}
                        onlineUsers={onlineUsers}
                    />
                ))}
                {comments.length === 0 && (
                    <div className="text-center py-8">
                        <p className="text-xs font-bold text-gray-300 uppercase tracking-widest">No opinions yet. Be the first!</p>
                    </div>
                )}
            </div>

            <form onSubmit={handleAddComment} className="flex gap-3 bg-white p-2.5 rounded-[1.5rem] border border-gray-100 shadow-sm focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all">
                <input
                    type="text"
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    placeholder="Contribute to the conversation..."
                    className="flex-1 bg-transparent border-none px-4 py-2 text-sm font-bold text-gray-700 placeholder-gray-300 focus:ring-0"
                />
                <button
                    disabled={!newCommentText.trim() || isLoading}
                    className="bg-[#0c2e25] text-white px-8 py-2.5 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-black transition-all disabled:opacity-50 shadow-lg shadow-emerald-900/10"
                >
                    Post
                </button>
            </form>
        </div>
    );
};
