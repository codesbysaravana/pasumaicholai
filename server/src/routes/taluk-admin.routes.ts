import { Router } from 'express';
import {
  createTalukAdmin,
  deleteTalukAdmin,
  getTalukAdmins,
  updateTalukAdmin,
} from '../controllers/taluk-admin.controller.js';
import { requireAuth, requireRole } from '../middlewares/auth.middleware.js';

const talukAdminRouter = Router();

talukAdminRouter.use(requireAuth, requireRole('admin'));

talukAdminRouter.post('/', createTalukAdmin);
talukAdminRouter.get('/', getTalukAdmins);
talukAdminRouter.put('/:id', updateTalukAdmin);
talukAdminRouter.delete('/:id', deleteTalukAdmin);

export { talukAdminRouter };
