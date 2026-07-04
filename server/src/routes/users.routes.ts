import { Router } from 'express';
import { getUserById, getUsers } from '../controllers/user.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { validateRequest } from '../middlewares/validate-request.middleware.js';
import { userIdParamsSchema } from '../validations/request.schemas.js';

const usersRouter = Router();

usersRouter.get('/', requireAuth, getUsers);
usersRouter.get('/:userId', requireAuth, validateRequest({ params: userIdParamsSchema }), getUserById);

export { usersRouter };
