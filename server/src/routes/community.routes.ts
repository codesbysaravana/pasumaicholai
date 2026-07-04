import { Router } from 'express';
import {
  createPost,
  getPostById,
  getPosts,
  upvotePost,
} from '../controllers/community.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { validateRequest } from '../middlewares/validate-request.middleware.js';
import { createPostBodySchema, postIdParamsSchema } from '../validations/request.schemas.js';

const communityRouter = Router();

communityRouter.get('/', getPosts);
communityRouter.get('/:postId', validateRequest({ params: postIdParamsSchema }), getPostById);
communityRouter.post('/', requireAuth, validateRequest({ body: createPostBodySchema }), createPost);
communityRouter.post('/:postId/upvote', requireAuth, validateRequest({ params: postIdParamsSchema }), upvotePost);

export { communityRouter };
