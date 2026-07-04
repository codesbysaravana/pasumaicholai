import type { UserRole } from '../models/user.model.js';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: UserRole;
      };
      rawBody?: Buffer;
    }
  }
}

export {};
