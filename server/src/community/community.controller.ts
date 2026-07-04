import { Request, Response } from 'express';
import { communityService } from './community.service.js';
import { asyncHandler } from '../utils/async-handler.js';
import { ApiError } from '../utils/api-error.js';
import { broadcastToCommunity } from './realtime.gateway.js';

export const getPosts = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const posts = await communityService.getFeed(userId);
    res.status(200).json({
        success: true,
        data: posts,
    });
});

export const createPost = asyncHandler(async (req: Request, res: Response) => {
    const { description, visibility, location } = req.body;
    const files = req.files as Express.Multer.File[];

    if (!description && (!files || files.length === 0)) {
        throw new ApiError(400, 'Description or image is required');
    }

    if (!req.user?.id) {
        throw new ApiError(401, 'Unauthorized');
    }

    const imageUrls = files?.map(file => `/uploads/${file.filename}`) || [];
    const post = await communityService.createPost(req.user.id, description, visibility, imageUrls, location ? JSON.parse(location) : undefined);

    broadcastToCommunity('post_created', post);

    res.status(201).json({
        success: true,
        data: post,
    });
});

export const editPost = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { description } = req.body;

    if (!id) throw new ApiError(400, 'Post ID is required');
    if (!description) throw new ApiError(400, 'Description is required');
    if (!req.user?.id) throw new ApiError(401, 'Unauthorized');

    const post = await communityService.editPost(id, req.user.id, description);
    if (!post) throw new ApiError(404, 'Post not found or unauthorized');

    broadcastToCommunity('post_edited', post);

    res.status(200).json({
        success: true,
        data: post,
    });
});

export const deletePost = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    if (!id) throw new ApiError(400, 'Post ID is required');
    if (!req.user?.id) throw new ApiError(401, 'Unauthorized');

    const result = await communityService.deletePost(id, req.user.id);
    if (!result) throw new ApiError(404, 'Post not found or unauthorized');

    if (result.type === 'POST_DELETED') {
        broadcastToCommunity('post_deleted', { postId: result.postId });
    } else if (result.type === 'REPOST_DELETED') {
        // Use repost_created with removed:true to notify clients to remove this specific user's share
        broadcastToCommunity('repost_created', {
            postId: result.postId,
            userId: req.user.id,
            repostCount: result.repostCount,
            removed: true
        });
    }

    res.status(200).json({
        success: true,
        data: null,
    });
});

export const toggleReaction = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { reaction } = req.body; // Use 'reaction' as requested in spec

    if (!id) throw new ApiError(400, 'Post ID is required');
    if (!req.user?.id) throw new ApiError(401, 'Unauthorized');

    const result = await communityService.toggleReaction(id, req.user.id, reaction);

    broadcastToCommunity('reaction_added', {
        postId: id,
        userId: req.user.id,
        liked: result.liked,
        reactionType: result.reactionType,
        likeCount: result.likeCount,
        reactions: result.reactions
    });

    res.status(200).json({
        success: true,
        data: result,
    });
});

export const toggleCommentReaction = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { reaction } = req.body;

    if (!id) throw new ApiError(400, 'Comment ID is required');
    if (!req.user?.id) throw new ApiError(401, 'Unauthorized');

    const result = await communityService.toggleReaction(id, req.user.id, reaction, 'comment');

    const { CommunityCommentModel } = await import('./comment.model.js');
    const comment = await CommunityCommentModel.findOne({ id });

    broadcastToCommunity('comment_reaction_added', {
        postId: comment?.postId,
        commentId: id,
        userId: req.user.id,
        liked: result.liked,
        reactionType: result.reactionType,
        likeCount: result.likeCount,
        reactions: result.reactions
    });

    res.status(200).json({
        success: true,
        data: result,
    });
});

export const getUserProfile = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) throw new ApiError(400, 'User ID is required');

    const profile = await communityService.getUserProfile(id);
    res.status(200).json({
        success: true,
        data: profile,
    });
});

export const getEngagement = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) throw new ApiError(400, 'Post ID is required');

    const data = await communityService.getEngagement(id);
    res.status(200).json({
        success: true,
        data,
    });
});

export const addComment = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params; // Post ID
    const { text } = req.body;

    if (!id) throw new ApiError(400, 'Post ID is required');
    if (!text) throw new ApiError(400, 'Text is required');
    if (!req.user?.id) throw new ApiError(401, 'Unauthorized');

    const result = await communityService.postComment(id, req.user.id, text);

    broadcastToCommunity('comment_added', {
        postId: id,
        comment: result.comment,
        commentCount: result.commentCount
    });

    res.status(201).json({
        success: true,
        data: result.comment,
    });
});

export const addReply = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params; // Parent Comment ID
    const { text } = req.body;

    if (!id) throw new ApiError(400, 'Comment ID is required');
    if (!text) throw new ApiError(400, 'Text is required');
    if (!req.user?.id) throw new ApiError(401, 'Unauthorized');

    const { CommunityCommentModel } = await import('./comment.model.js');
    const parent = await CommunityCommentModel.findOne({ id });
    if (!parent) throw new ApiError(404, 'Comment not found');

    const result = await communityService.postComment(parent.postId, req.user.id, text, id);

    broadcastToCommunity('reply_added', {
        postId: parent.postId,
        parentId: id,
        reply: result.comment,
        commentCount: result.commentCount
    });

    res.status(201).json({
        success: true,
        data: result.comment,
    });
});

export const getComments = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params; // Post ID
    if (!id) throw new ApiError(400, 'Post ID is required');

    const comments = await communityService.getComments(id);
    res.status(200).json({
        success: true,
        data: comments,
    });
});

export const editComment = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params; // Comment ID
    const { text } = req.body;

    if (!id) throw new ApiError(400, 'Comment ID is required');
    if (!text) throw new ApiError(400, 'Text is required');
    if (!req.user?.id) throw new ApiError(401, 'Unauthorized');

    const comment = await communityService.editComment(id, req.user.id, text);
    if (!comment) throw new ApiError(404, 'Comment not found or unauthorized');

    broadcastToCommunity('comment_edited', { postId: comment.postId, commentId: id, text });

    res.status(200).json({
        success: true,
        data: comment,
    });
});

export const deleteComment = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params; // Comment ID

    if (!id) throw new ApiError(400, 'Comment ID is required');
    if (!req.user?.id) throw new ApiError(401, 'Unauthorized');

    const result = await communityService.deleteComment(id, req.user.id);
    if (!result) throw new ApiError(404, 'Comment not found or unauthorized');

    broadcastToCommunity('comment_deleted', {
        postId: result.postId,
        commentId: id,
        commentCount: result.commentCount
    });

    res.status(200).json({
        success: true,
        data: null,
    });
});

export const repost = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) throw new ApiError(400, 'Post ID is required');
    if (!req.user?.id) throw new ApiError(401, 'Unauthorized');

    const result = await communityService.repost(id, req.user.id);
    const originalPost = await communityService.getPostById(id);

    broadcastToCommunity('repost_created', {
        postId: id,
        userId: req.user.id,
        repostCount: result.repostCount,
        removed: result.removed,
        repostEntry: result.removed ? null : {
            ...originalPost,
            isRepost: true,
            reposter: result.repost?.userId,
            createdAt: result.repost?.createdAt,
            repostCreatedAt: result.repost?.createdAt
        }
    });

    res.status(201).json({
        success: true,
        data: result,
    });
});

export const updatePresence = asyncHandler(async (req: Request, res: Response) => {
    const { status } = req.body;
    if (!req.user?.id) throw new ApiError(401, 'Unauthorized');

    await communityService.updatePresence(req.user.id, status);
    broadcastToCommunity('presence_update', { userId: req.user.id, status });

    res.status(200).json({ success: true });
});
