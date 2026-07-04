import { Router } from 'express';
import multer from 'multer';
import { transcribeVoiceListing } from '../controllers/voiceController.js';
import { requireAuth, requireRole } from '../middlewares/auth.middleware.js';

const upload = multer({ storage: multer.memoryStorage() });
const voiceRouter = Router();

voiceRouter.post('/transcribe', requireAuth, requireRole('farmer'), upload.single('audio'), transcribeVoiceListing);

export { voiceRouter };

