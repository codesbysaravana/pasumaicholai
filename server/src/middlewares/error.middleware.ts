import type { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import { ZodError } from 'zod';
import { ApiError } from '../utils/api-error.js';
import { logger } from '../utils/logger.js';

export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  let statusCode = 500;
  let message = 'Internal server error';

  if (error instanceof ApiError) {
    statusCode = error.statusCode;
    message = error.message;
  } else if (error instanceof ZodError) {
    statusCode = 400;
    message = 'Validation failed';
  } else if (error instanceof mongoose.Error.ValidationError) {
    statusCode = 400;
    message = error.message;
  } else if (error instanceof mongoose.Error.CastError) {
    statusCode = 400;
    message = 'Invalid resource identifier';
  } else if (error instanceof Error) {
    message = error.message;
  }

  logger.error('Request failed', {
    statusCode,
    message,
    error: error instanceof Error ? (error.stack ?? error.message) : 'Unknown error',
  });

  res.status(statusCode).json({
    success: false,
    message,
  });
}
