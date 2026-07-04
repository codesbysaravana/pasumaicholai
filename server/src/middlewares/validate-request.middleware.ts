import type { NextFunction, Request, Response } from 'express';
import type { AnyZodObject, ZodTypeAny } from 'zod';
import { ApiError } from '../utils/api-error.js';

interface ValidateRequestSchema {
    body?: ZodTypeAny;
    params?: AnyZodObject;
    query?: AnyZodObject;
}

export function validateRequest(schema: ValidateRequestSchema) {
    return (req: Request, _res: Response, next: NextFunction): void => {
        if (schema.body) {
            const bodyResult = schema.body.safeParse(req.body);
            if (!bodyResult.success) {
                next(new ApiError(400, bodyResult.error.issues[0]?.message ?? 'Invalid request body'));
                return;
            }
            req.body = bodyResult.data;
        }

        if (schema.params) {
            const paramsResult = schema.params.safeParse(req.params);
            if (!paramsResult.success) {
                next(new ApiError(400, paramsResult.error.issues[0]?.message ?? 'Invalid route parameters'));
                return;
            }
            req.params = paramsResult.data;
        }

        if (schema.query) {
            const queryResult = schema.query.safeParse(req.query);
            if (!queryResult.success) {
                next(new ApiError(400, queryResult.error.issues[0]?.message ?? 'Invalid query parameters'));
                return;
            }
            req.query = queryResult.data;
        }

        next();
    };
}
