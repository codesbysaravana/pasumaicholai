import { Router } from 'express';
import multer from 'multer';
import { requireAuth, requireRole } from '../middlewares/auth.middleware.js';
import {
  complaintTextToSpeech,
  createComplaint,
  getEscalatedComplaints,
  getFarmerComplaints,
  getTalukComplaints,
  transcribeComplaintVoice,
  updateComplaintStatus,
} from '../controllers/complaint.controller.js';

const attachmentUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const mime = (file.mimetype || '').toLowerCase();
    const isAllowed = mime.startsWith('image/') || mime.startsWith('audio/');
    if (!isAllowed) {
      cb(new Error('Only image/audio attachments are supported'));
      return;
    }
    cb(null, true);
  },
});
const memoryUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const complaintRouter = Router();

complaintRouter.post(
  '/farmer/complaints',
  requireAuth,
  requireRole('farmer'),
  attachmentUpload.single('attachment'),
  createComplaint,
);
complaintRouter.post('/farmer/complaints/transcribe-voice', requireAuth, requireRole('farmer'), memoryUpload.single('audio'), transcribeComplaintVoice);
complaintRouter.post('/farmer/complaints/tts', requireAuth, requireRole('farmer'), complaintTextToSpeech);
complaintRouter.get('/farmer/complaints', requireAuth, requireRole('farmer'), getFarmerComplaints);
complaintRouter.get('/taluk/complaints', requireAuth, requireRole('taluk_admin'), getTalukComplaints);
complaintRouter.put('/taluk/complaints/:id/status', requireAuth, requireRole('taluk_admin'), updateComplaintStatus);
complaintRouter.get('/admin/escalated-complaints', requireAuth, requireRole('admin'), getEscalatedComplaints);

export { complaintRouter };
