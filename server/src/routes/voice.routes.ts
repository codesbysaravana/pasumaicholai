import { Router } from 'express';
import multer from 'multer';
import { parseVoiceListing } from '../controllers/voice.controller.js';
import { requireAuth, requireRole } from '../middlewares/auth.middleware.js';

const upload = multer({ storage: multer.memoryStorage() });
const voiceRouter = Router();

voiceRouter.post('/parse-listing', requireAuth, requireRole('farmer'), upload.single('audio'), parseVoiceListing);

export { voiceRouter };
