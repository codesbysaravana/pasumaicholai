import { Router } from 'express';
import {
  createScheme,
  getSchemeById,
  getSchemes,
  upvoteScheme,
} from '../controllers/scheme.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { validateRequest } from '../middlewares/validate-request.middleware.js';
import { createSchemeBodySchema, schemeIdParamsSchema } from '../validations/request.schemas.js';

const schemeRouter = Router();

schemeRouter.get('/', getSchemes);
schemeRouter.get('/:schemeId', validateRequest({ params: schemeIdParamsSchema }), getSchemeById);
schemeRouter.post('/', requireAuth, validateRequest({ body: createSchemeBodySchema }), createScheme);
schemeRouter.post('/:schemeId/upvote', requireAuth, validateRequest({ params: schemeIdParamsSchema }), upvoteScheme);

export { schemeRouter };
