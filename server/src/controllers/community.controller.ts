import type { Request, Response } from 'express';
import { z } from 'zod';
import { CommunityPostModel } from '../models/community-post.model.js';
import { ApiError } from '../utils/api-error.js';
import { asyncHandler } from '../utils/async-handler.js';

const createPostSchema = z.object({
  title: z.string().min(5),
  content: z.string().min(20),
});

export const getPosts = asyncHandler(async (_req: Request, res: Response) => {
  const posts = await CommunityPostModel.find().sort({ createdAt: -1 }).lean();

  res.status(200).json({
    success: true,
    data: posts.map((post) => ({
      ...post,
      id: String(post._id),
    })),
  });
});

export const getPostById = asyncHandler(async (req: Request, res: Response) => {
  const post = await CommunityPostModel.findById(req.params.postId).lean();
  if (!post) {
    throw new ApiError(404, 'Community post not found');
  }

  res.status(200).json({
    success: true,
    data: {
      ...post,
      id: String(post._id),
    },
  });
});

export const createPost = asyncHandler(async (req: Request, res: Response) => {
  const parsed = createPostSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ApiError(400, parsed.error.issues[0]?.message ?? 'Invalid post payload');
  }

  if (!req.user) {
    throw new ApiError(401, 'Authentication required');
  }

  const post = await CommunityPostModel.create({
    ...parsed.data,
    authorId: req.user.id,
    authorName: req.user.role === 'farmer' ? 'Farmer' : 'Customer',
  });

  res.status(201).json({
    success: true,
    message: 'Post created successfully',
    data: {
      ...post.toObject(),
      id: String(post._id),
    },
  });
});

export const upvotePost = asyncHandler(async (req: Request, res: Response) => {
  const post = await CommunityPostModel.findByIdAndUpdate(
    req.params.postId,
    { $inc: { upvotes: 1 } },
    { returnDocument: 'after' },
  ).lean();

  if (!post) {
    throw new ApiError(404, 'Community post not found');
  }

  res.status(200).json({
    success: true,
    message: 'Post upvoted successfully',
    data: {
      ...post,
      id: String(post._id),
    },
  });
});
