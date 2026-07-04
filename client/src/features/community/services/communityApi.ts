import { http, API_BASE_URL } from "../../../api/http";
import type { CommunityPost, CommunityComment } from "../types/community.types";

export const communityApi = {
    getPosts: async (): Promise<CommunityPost[]> => {
        return await http<CommunityPost[]>('/community/posts');
    },

    createPost: async (formData: FormData): Promise<CommunityPost> => {
        const response = await fetch(`${API_BASE_URL}/community/posts`, {
            method: "POST",
            body: formData,
            credentials: "include",
        });
        const payload = await response.json();
        if (!response.ok || !payload.success) {
            throw new Error(payload.message || "Failed to create post");
        }
        return payload.data;
    },

    editPost: async (postId: string, description: string): Promise<CommunityPost> => {
        return await http<CommunityPost>(`/community/posts/${postId}`, {
            method: 'PUT',
            body: { description }
        });
    },

    deletePost: async (postId: string): Promise<void> => {
        return await http<void>(`/community/posts/${postId}`, {
            method: 'DELETE'
        });
    },

    react: async (postId: string, reaction: string): Promise<{ liked: boolean, reactionType?: string, likeCount: number, reactions: any }> => {
        return await http<{ liked: boolean, reactionType?: string, likeCount: number, reactions: any }>(`/community/posts/${postId}/react`, {
            method: 'POST',
            body: { reaction }
        });
    },

    getReactions: async (postId: string): Promise<{ reactions: any[], reposts: any[] }> => {
        return await http<{ reactions: any[], reposts: any[] }>(`/community/posts/${postId}/reactions`);
    },

    addComment: async (postId: string, text: string): Promise<CommunityComment> => {
        return await http<CommunityComment>(`/community/posts/${postId}/comment`, {
            method: 'POST',
            body: { text }
        });
    },

    addReply: async (commentId: string, text: string): Promise<CommunityComment> => {
        return await http<CommunityComment>(`/community/comments/${commentId}/reply`, {
            method: 'POST',
            body: { text }
        });
    },

    editComment: async (commentId: string, text: string): Promise<CommunityComment> => {
        return await http<CommunityComment>(`/community/comments/${commentId}`, {
            method: 'PUT',
            body: { text }
        });
    },

    deleteComment: async (commentId: string): Promise<void> => {
        return await http<void>(`/community/comments/${commentId}`, {
            method: 'DELETE'
        });
    },

    getComments: async (postId: string): Promise<CommunityComment[]> => {
        return await http<CommunityComment[]>(`/community/posts/${postId}/comments`);
    },

    repost: async (postId: string): Promise<{ repostCount: number }> => {
        return await http<{ repostCount: number }>(`/community/posts/${postId}/repost`, {
            method: 'POST'
        });
    },

    getEngagement: async (postId: string): Promise<{ reactions: any[], reposts: any[] }> => {
        return await http<{ reactions: any[], reposts: any[] }>(`/community/posts/${postId}/reactions`);
    },

    reactToComment: async (commentId: string, reaction: string): Promise<{ liked: boolean, reactionType?: string, likeCount: number, reactions: any }> => {
        return await http<{ liked: boolean, reactionType?: string, likeCount: number, reactions: any }>(`/community/comments/${commentId}/react`, {
            method: 'POST',
            body: { reaction }
        });
    },

    getUserProfile: async (userId: string): Promise<any> => {
        return await http<any>(`/community/users/${userId}/profile`);
    },

    updatePresence: async (status: 'online' | 'offline'): Promise<void> => {
        return await http<void>(`/community/presence/update`, {
            method: 'POST',
            body: { status }
        });
    }
};
