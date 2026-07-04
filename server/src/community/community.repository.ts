import { CommunityPostModel } from './post.model.js';
import { PostImageModel } from './postImage.model.js';
import { CommunityCommentModel } from './comment.model.js';
import { CommunityReactionModel } from './reaction.model.js';
import { CommunityRepostModel } from './repost.model.js';
import { UserPresenceModel } from './presence.model.js';
import mongoose from 'mongoose';

const generateId = () => new mongoose.Types.ObjectId().toHexString();

class CommunityRepository {
    // Posts
    async findAllPosts(userId?: string) {
        // Fetch original posts
        const originalPosts = await CommunityPostModel.find()
            .populate('userId', 'fullName photo role')
            .sort({ createdAt: -1 });

        const postsWithImages = await Promise.all(originalPosts.map(async (post) => {
            const images = await PostImageModel.find({ postId: post.id }).sort({ displayOrder: 1 });
            return { ...post.toObject(), images };
        }));

        // Fetch reposts
        const reposts = await CommunityRepostModel.find()
            .populate('userId', 'fullName photo role')
            .sort({ createdAt: -1 });

        const repostEntries = await Promise.all(reposts.map(async (rp) => {
            const originalPost = await this.findPostById(rp.postId);
            if (!originalPost) return null;
            return {
                ...originalPost,
                isRepost: true,
                reposter: rp.userId,
                repostCreatedAt: rp.createdAt,
                // Sort by repost date in the feed
                createdAt: rp.createdAt
            };
        }));

        const combined = [...postsWithImages, ...repostEntries.filter(r => r !== null)];
        return combined.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    async findPostById(id: string) {
        const post = await CommunityPostModel.findOne({ id }).populate('userId', 'fullName photo role');
        if (!post) return null;
        const images = await PostImageModel.find({ postId: id }).sort({ displayOrder: 1 });
        return { ...post.toObject(), images };
    }

    async createPost(data: any, imageUrls: string[] = []) {
        const postId = generateId();
        const post = await CommunityPostModel.create({
            id: postId,
            ...data
        });

        const imagePromises = imageUrls.map((url, index) =>
            PostImageModel.create({
                id: generateId(),
                postId: postId,
                imageUrl: url,
                displayOrder: index
            })
        );
        const images = await Promise.all(imagePromises);

        const populated = await post.populate('userId', 'fullName photo role');
        return { ...populated.toObject(), images: images.map(img => img.toObject ? img.toObject() : img) };
    }

    async editPost(postId: string, userId: string, description: string) {
        const post = await CommunityPostModel.findOneAndUpdate(
            { id: postId, userId },
            { description },
            { returnDocument: 'after' }
        ).populate('userId', 'fullName photo role');

        if (!post) return null;
        const images = await PostImageModel.find({ postId }).sort({ displayOrder: 1 });
        return { ...post.toObject(), images };
    }

    async deletePost(postId: string, userId: string): Promise<{ type: 'POST_DELETED' | 'REPOST_DELETED', postId: string, repostCount?: number } | null> {
        // 1. Try to find if user is the original post owner
        let post = await CommunityPostModel.findOne({ id: postId, userId });
        if (!post && mongoose.Types.ObjectId.isValid(postId)) {
            post = await CommunityPostModel.findOne({ _id: postId, userId });
        }

        if (post) {
            const actualId = post.id;
            // Delete main post
            await CommunityPostModel.deleteOne({ _id: post._id });
            // Cascade delete EVERYTHING associated with this post ID
            await PostImageModel.deleteMany({ postId: actualId });
            await CommunityCommentModel.deleteMany({ postId: actualId });
            await CommunityReactionModel.deleteMany({ postId: actualId });
            await CommunityRepostModel.deleteMany({ postId: actualId });

            return { type: 'POST_DELETED', postId: actualId };
        }

        // 2. If not original owner, check if user is trying to delete their own REPOST
        const repost = await CommunityRepostModel.findOne({ postId, userId });
        if (repost) {
            await CommunityRepostModel.deleteOne({ _id: repost._id });
            const targetPost = await this.updatePostCounts(postId, { $inc: { repostCount: -1 } });
            return {
                type: 'REPOST_DELETED',
                postId: postId,
                repostCount: targetPost?.repostCount || 0
            };
        }

        return null;
    }

    async updatePostCounts(id: string, updates: any) {
        let post = await CommunityPostModel.findOneAndUpdate({ id }, updates, { returnDocument: 'after' });
        if (!post && mongoose.Types.ObjectId.isValid(id)) {
            post = await CommunityPostModel.findOneAndUpdate({ _id: id }, updates, { returnDocument: 'after' });
        }
        return post;
    }

    async updateCommentCounts(id: string, updates: any) {
        let comment = await CommunityCommentModel.findOneAndUpdate({ id }, updates, { returnDocument: 'after' });
        if (!comment && mongoose.Types.ObjectId.isValid(id)) {
            comment = await CommunityCommentModel.findOneAndUpdate({ _id: id }, updates, { returnDocument: 'after' });
        }
        return comment;
    }

    // Reactions
    async toggleReaction(targetId: string, userId: string, reactionType: 'LIKE' | 'LOVE' | 'SUPPORT' | 'INSIGHTFUL' | 'CELEBRATE' = 'LIKE', targetType: 'post' | 'comment' = 'post') {
        const existing = await CommunityReactionModel.findOne({ postId: targetId, userId }); // We use postId as a general targetId in the model for simplicity

        const model = targetType === 'post' ? CommunityPostModel : CommunityCommentModel;
        const updateMethod = targetType === 'post' ? this.updatePostCounts.bind(this) : this.updateCommentCounts.bind(this);

        if (existing) {
            const oldType = existing.reactionType;

            if (oldType === reactionType) {
                // Remove reaction
                await CommunityReactionModel.deleteOne({ _id: existing._id });
                const decUpdate: any = { $inc: { likeCount: -1 } };
                decUpdate.$inc[`reactions.${oldType}`] = -1;
                const target = await updateMethod(targetId, decUpdate);
                return { liked: false, likeCount: target?.likeCount || 0, reactions: target?.reactions };
            } else {
                // Change reaction type
                existing.reactionType = reactionType;
                await existing.save();

                const switchUpdate: any = { $inc: {} };
                switchUpdate.$inc[`reactions.${oldType}`] = -1;
                switchUpdate.$inc[`reactions.${reactionType}`] = 1;
                const target = await updateMethod(targetId, switchUpdate);
                return { liked: true, reactionType, likeCount: target?.likeCount || 0, reactions: target?.reactions };
            }
        } else {
            // New reaction
            await CommunityReactionModel.create({
                id: generateId(),
                postId: targetId,
                userId,
                reactionType
            });

            const incUpdate: any = { $inc: { likeCount: 1 } };
            incUpdate.$inc[`reactions.${reactionType}`] = 1;
            const target = await updateMethod(targetId, incUpdate);
            return { liked: true, reactionType, likeCount: target?.likeCount || 0, reactions: target?.reactions };
        }
    }

    async getReactionsForPost(postId: string) {
        return CommunityReactionModel.find({ postId }).populate('userId', 'fullName photo role');
    }

    // Comments
    async addComment(postId: string, userId: string, commentText: string, parentCommentId: string | null = null) {
        const comment = await CommunityCommentModel.create({
            id: generateId(),
            postId,
            userId,
            commentText,
            parentCommentId
        });
        const post = await this.updatePostCounts(postId, { $inc: { commentCount: 1 } });
        const populated = await comment.populate('userId', 'fullName photo role');
        return {
            comment: populated,
            commentCount: post?.commentCount || 0
        };
    }

    async editComment(commentId: string, userId: string, commentText: string) {
        return CommunityCommentModel.findOneAndUpdate(
            { id: commentId, userId },
            { commentText },
            { returnDocument: 'after' }
        ).populate('userId', 'fullName photo role');
    }

    async deleteComment(commentId: string, userId: string) {
        const comment = await CommunityCommentModel.findOne({ id: commentId, userId });
        if (!comment) return null;

        // Find all replies recursively to get the total count of comments being deleted
        const getAllReplyIds = async (parentIds: string[]): Promise<string[]> => {
            const replies = await CommunityCommentModel.find({ parentCommentId: { $in: parentIds } });
            if (replies.length === 0) return [];
            const replyIds = replies.map(r => r.id);
            const nestedIds = await getAllReplyIds(replyIds);
            return [...replyIds, ...nestedIds];
        };

        const allDeletedIds = [commentId, ...(await getAllReplyIds([commentId]))];
        const deleteCount = allDeletedIds.length;

        await CommunityCommentModel.deleteMany({ id: { $in: allDeletedIds } });
        const post = await this.updatePostCounts(comment.postId, { $inc: { commentCount: -deleteCount } });

        return {
            postId: comment.postId,
            commentId,
            deletedCount: deleteCount,
            commentCount: post?.commentCount || 0
        };
    }

    async getCommentsByPost(postId: string) {
        return CommunityCommentModel.find({ postId })
            .populate('userId', 'fullName photo role')
            .sort({ createdAt: 1 });
    }

    // Reposts
    async createRepost(postId: string, userId: string) {
        const existing = await CommunityRepostModel.findOne({ postId, userId });

        if (existing) {
            // Un-repost logic
            await CommunityRepostModel.deleteOne({ _id: existing._id });
            const post = await this.updatePostCounts(postId, { $inc: { repostCount: -1 } });
            return {
                repostCount: post?.repostCount || 0,
                removed: true
            };
        } else {
            // New repost
            const repost = await CommunityRepostModel.create({
                id: generateId(),
                postId,
                userId
            });
            const post = await this.updatePostCounts(postId, { $inc: { repostCount: 1 } });
            const populatedRepost = await repost.populate('userId', 'fullName photo role');
            return {
                repostCount: post?.repostCount || 0,
                repost: populatedRepost,
                removed: false
            };
        }
    }

    async getRepostsForPost(postId: string) {
        return CommunityRepostModel.find({ postId }).populate('userId', 'fullName photo role');
    }

    // Presence
    async updatePresence(userId: string, status: 'online' | 'offline') {
        return UserPresenceModel.findOneAndUpdate(
            { userId },
            { status, lastSeen: new Date() },
            { upsert: true, new: true }
        );
    }

    async getAllOnlineUsers() {
        return UserPresenceModel.find({ status: 'online' }).select('userId');
    }
}

export const communityRepository = new CommunityRepository();
