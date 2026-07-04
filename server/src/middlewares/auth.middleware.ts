import type { NextFunction, Request, Response } from 'express';
import { ApiError } from '../utils/api-error.js';
import { getAuthCookieName, verifyAccessToken } from '../utils/auth-token.js';
import type { UserRole } from '../models/user.model.js';

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = req.cookies?.[getAuthCookieName()];

  if (!token) {
    next(new ApiError(401, 'Authentication required'));
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = {
      id: payload.sub,
      role: payload.role,
    };
    next();
  } catch {
    next(new ApiError(401, 'Invalid or expired authentication token'));
  }
}

export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new ApiError(401, 'Authentication required'));
      return;
    }

    if (!roles.includes(req.user.role)) {
      next(new ApiError(403, 'Insufficient permissions'));
      return;
    }

    next();
  };
}
