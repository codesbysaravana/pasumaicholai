import { Router } from 'express';
import {
  createGrievance,
  getGrievanceById,
  getMyGrievances,
} from '../controllers/grievance.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { validateRequest } from '../middlewares/validate-request.middleware.js';
import { createGrievanceBodySchema, grievanceIdParamsSchema } from '../validations/request.schemas.js';

const grievanceRouter = Router();

grievanceRouter.post('/', requireAuth, validateRequest({ body: createGrievanceBodySchema }), createGrievance);
grievanceRouter.get('/my', requireAuth, getMyGrievances);
grievanceRouter.get('/:grievanceId', requireAuth, validateRequest({ params: grievanceIdParamsSchema }), getGrievanceById);

export { grievanceRouter };
