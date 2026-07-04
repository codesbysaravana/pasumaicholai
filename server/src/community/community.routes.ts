import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { requireAuth } from '../middlewares/auth.middleware.js';
import * as communityController from './community.controller.js';

const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (_req: any, _file: any, cb: any) => {
        cb(null, uploadDir);
    },
    filename: (_req: any, file: any, cb: any) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, `community-${uniqueSuffix}${path.extname(file.originalname)}`);
    },
});

const upload = multer({ storage });

const communityRoutes = Router();

// Feed & Posts
communityRoutes.get('/posts', getPosts);
communityRoutes.post('/posts', requireAuth, upload.array('images', 10), createPost);
communityRoutes.put('/posts/:id', requireAuth, editPost);
communityRoutes.delete('/posts/:id', requireAuth, deletePost);

// Social Actions
communityRoutes.post('/posts/:id/react', requireAuth, toggleReaction);
communityRoutes.post('/posts/:id/repost', requireAuth, repost);
communityRoutes.get('/posts/:id/reactions', getEngagement);

// Comments & Replies
communityRoutes.get('/posts/:id/comments', getComments);
communityRoutes.post('/posts/:id/comment', requireAuth, addComment);
communityRoutes.post('/comments/:id/reply', requireAuth, addReply);
communityRoutes.post('/comments/:id/react', requireAuth, toggleCommentReaction);
communityRoutes.put('/comments/:id', requireAuth, editComment);
communityRoutes.delete('/comments/:id', requireAuth, deleteComment);

// Users
communityRoutes.get('/users/:id/profile', getUserProfile);

// Presence
communityRoutes.post('/presence/update', requireAuth, updatePresence);

function getPosts(req: any, res: any, next: any) { return communityController.getPosts(req, res, next); }
function createPost(req: any, res: any, next: any) { return communityController.createPost(req, res, next); }
function editPost(req: any, res: any, next: any) { return communityController.editPost(req, res, next); }
function deletePost(req: any, res: any, next: any) { return communityController.deletePost(req, res, next); }
function toggleReaction(req: any, res: any, next: any) { return communityController.toggleReaction(req, res, next); }
function toggleCommentReaction(req: any, res: any, next: any) { return communityController.toggleCommentReaction(req, res, next); }
function getUserProfile(req: any, res: any, next: any) { return communityController.getUserProfile(req, res, next); }
function repost(req: any, res: any, next: any) { return communityController.repost(req, res, next); }
function getEngagement(req: any, res: any, next: any) { return communityController.getEngagement(req, res, next); }
function getComments(req: any, res: any, next: any) { return communityController.getComments(req, res, next); }
function addComment(req: any, res: any, next: any) { return communityController.addComment(req, res, next); }
function addReply(req: any, res: any, next: any) { return communityController.addReply(req, res, next); }
function editComment(req: any, res: any, next: any) { return communityController.editComment(req, res, next); }
function deleteComment(req: any, res: any, next: any) { return communityController.deleteComment(req, res, next); }
function updatePresence(req: any, res: any, next: any) { return communityController.updatePresence(req, res, next); }

export { communityRoutes };
export default communityRoutes;
