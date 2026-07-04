export interface CommunityUser {
    id: string;
    fullName: string;
    photo?: string;
    role: string;
    location?: string;
}

export interface CommunityImage {
    id: string;
    postId: string;
    imageUrl: string;
    displayOrder: number;
}

export interface CommunityComment {
    id: string;
    postId: string;
    userId: CommunityUser;
    parentCommentId: string | null;
    commentText: string;
    createdAt: string;
    likeCount: number;
    reactions?: {
        LIKE: number;
        LOVE: number;
        SUPPORT: number;
        INSIGHTFUL: number;
        CELEBRATE: number;
    };
    replies?: CommunityComment[];
}

export interface CommunityPost {
    id: string;
    userId: CommunityUser;
    description: string;
    images: CommunityImage[];
    visibility: 'PUBLIC' | 'FOLLOWERS' | 'PRIVATE';
    likeCount: number;
    commentCount: number;
    repostCount: number;
    shareCount: number;
    location?: {
        name: string;
        coordinates: number[];
    };
    reactions?: {
        LIKE: number;
        LOVE: number;
        SUPPORT: number;
        INSIGHTFUL: number;
        CELEBRATE: number;
    };
    createdAt: string;
    updatedAt: string;
}
