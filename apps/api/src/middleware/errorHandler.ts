import type { NextFunction, Request, Response } from 'express';
import type { ApiErrorResponse } from '@mangodb/shared';
import { ApiError } from '../lib/ApiError';

// Mount last. Four arguments is how Express recognises error middleware, so
// `next` must stay even though the happy path never calls it.
export function errorHandler(
    err: unknown,
    _req: Request,
    res: Response,
    next: NextFunction,
): void {
    if (res.headersSent) {
        next(err);
        return;
    }

    if (err instanceof ApiError) {
        const body: ApiErrorResponse = {
            error: {
                code: err.code,
                message: err.message,
                ...(err.details ? { details: err.details } : {}),
            },
        };
        res.status(err.status).json(body);
        return;
    }

    // Unplanned: log the real error, return a body that leaks nothing.
    console.error('Unhandled error:', err);
    res.status(500).json({
        error: { code: 'INTERNAL', message: 'Internal server error' },
    } satisfies ApiErrorResponse);
}

// Mount just before errorHandler so unknown paths get the same envelope.
export function notFoundHandler(
    req: Request,
    _res: Response,
    next: NextFunction,
): void {
    next(ApiError.notFound(`Cannot ${req.method} ${req.path}`));
}
