import { Router } from 'express';
import { login, logout, me, register } from '../controllers/auth.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { validateRequest } from '../middlewares/validate-request.middleware.js';
import { loginBodySchema, registerBodySchema } from '../validations/request.schemas.js';

const authRouter = Router();

authRouter.post('/register', validateRequest({ body: registerBodySchema }), register);
authRouter.post('/login', validateRequest({ body: loginBodySchema }), login);
authRouter.post('/logout', requireAuth, logout);
authRouter.get('/me', requireAuth, me);

export { authRouter };
