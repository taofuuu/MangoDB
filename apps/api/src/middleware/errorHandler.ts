import type { NextFunction, Request, Response } from 'express';
import type { ApiErrorResponse } from '@mangodb/shared';
import { ApiError } from '../lib/ApiError';

// express.json() rejects a body before any route runs: broken JSON, or more
// than its 100kb limit. Both are the caller's mistake, so 400, not 500.
function bodyParserError(err: unknown): ApiError | null {
    const type = (err as { type?: unknown } | null)?.type;
    if (type === 'entity.parse.failed') {
        return ApiError.badRequest('Request body is not valid JSON');
    }
    if (type === 'entity.too.large') {
        return ApiError.badRequest('Request body is too large');
    }
    return null;
}

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

    const apiError = err instanceof ApiError ? err : bodyParserError(err);
    if (apiError) {
        const body: ApiErrorResponse = {
            error: {
                code: apiError.code,
                message: apiError.message,
                ...(apiError.details ? { details: apiError.details } : {}),
            },
        };
        res.status(apiError.status).json(body);
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
