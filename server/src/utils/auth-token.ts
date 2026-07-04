import type { Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.config.js';
import type { UserRole } from '../models/user.model.js';

interface JwtPayload {
  sub: string;
  role: UserRole;
}

const AUTH_COOKIE_NAME = 'ascend_access_token';

export function signAccessToken(userId: string, role: UserRole): string {
  const payload: JwtPayload = {
    sub: userId,
    role,
  };

  const expiresIn = env.JWT_EXPIRES_IN as Exclude<jwt.SignOptions['expiresIn'], undefined>;

  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn,
  });
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
}

export function setAuthCookie(res: Response, token: string): void {
  const isProduction = env.NODE_ENV === 'production';

  res.cookie(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

export function clearAuthCookie(res: Response): void {
  const isProduction = env.NODE_ENV === 'production';

  res.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
  });
}

export function getAuthCookieName(): string {
  return AUTH_COOKIE_NAME;
}
