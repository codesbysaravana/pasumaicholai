import { communityRepository } from './community.repository.js';

class CommunityService {
    async getFeed(userId?: string) {
        let posts = await communityRepository.findAllPosts(userId);

        // Basic visibility filtering (could be more complex like checking followers)
        // If it's PRIVATE, only owner can see. If it's FOLLOWERS, only owner or followers.
        // For simplicity in this demo, we'll filters PRIVATE ones from non-owners.
        if (userId) {
            posts = posts.filter(post => {
                if (post.visibility === 'PRIVATE') return post.userId._id.toString() === userId;
                return true;
            });
        } else {
            posts = posts.filter(post => post.visibility === 'PUBLIC');
        }

        return posts;
    }

    async createPost(userId: string, description: string, visibility: string = 'PUBLIC', imageUrls: string[] = [], location?: any) {
        return communityRepository.createPost({
            userId,
            description,
            visibility,
            location
        }, imageUrls);
    }

    async editPost(postId: string, userId: string, description: string) {
        return communityRepository.editPost(postId, userId, description);
    }

    async deletePost(postId: string, userId: string) {
        return communityRepository.deletePost(postId, userId);
    }

    async toggleReaction(targetId: string, userId: string, reactionType: any = 'LIKE', targetType: 'post' | 'comment' = 'post') {
        return communityRepository.toggleReaction(targetId, userId, reactionType, targetType);
    }

    async getPostById(postId: string) {
        return communityRepository.findPostById(postId);
    }

    async getUserProfile(userId: string) {
        const { UserModel } = await import('../models/user.model.js');
        return UserModel.findById(userId).select('fullName photo role location bio');
    }

    async getEngagement(postId: string) {
        const reactions = await communityRepository.getReactionsForPost(postId);
        const reposts = await communityRepository.getRepostsForPost(postId);
        return { reactions, reposts };
    }

    async postComment(postId: string, userId: string, text: string, parentCommentId: string | null = null) {
        return communityRepository.addComment(postId, userId, text, parentCommentId);
    }

    async editComment(commentId: string, userId: string, text: string) {
        return communityRepository.editComment(commentId, userId, text);
    }

    async deleteComment(commentId: string, userId: string) {
        return communityRepository.deleteComment(commentId, userId);
    }

    async getComments(postId: string) {
        const allComments = await communityRepository.getCommentsByPost(postId);

        const commentMap = new Map();
        const rootComments: any[] = [];

        // First pass: create map and identify roots
        allComments.forEach((c: any) => {
            const commentJson = c.toJSON();
            const id = c.id?.toString() || c._id?.toString();
            commentJson.id = id; // Ensure string id
            commentJson.replies = [];
            commentMap.set(id, commentJson);

            if (!c.parentCommentId) {
                rootComments.push(commentJson);
            }
        });

        // Second pass: build hierarchy
        allComments.forEach((c: any) => {
            if (c.parentCommentId) {
                const parentId = c.parentCommentId.toString();
                const parent = commentMap.get(parentId);
                if (parent) {
                    const currentId = c.id?.toString() || c._id?.toString();
                    parent.replies.push(commentMap.get(currentId));
                }
            }
        });

        return rootComments;
    }

    async repost(postId: string, userId: string) {
        return communityRepository.createRepost(postId, userId);
    }

    async updatePresence(userId: string, status: 'online' | 'offline') {
        return communityRepository.updatePresence(userId, status);
    }
}

export const communityService = new CommunityService();
