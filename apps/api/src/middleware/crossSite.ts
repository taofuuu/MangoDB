import type { NextFunction, Request, Response } from 'express';
import { ApiError } from '../lib/api-error';

// Reads change nothing, so only writes are checked.
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

// CSRF: a page on another site making the visitor's browser send a write.
// SameSite=Lax on the cookie already stops that; this is the second layer the
// server owns. Browsers stamp every request with Sec-Fetch-Site, and only a
// request started from another site says 'cross-site'. curl and Postman send
// no such header, so they pass, and the Next proxy forwards the browser's.
export function refuseCrossSiteWrites(
    req: Request,
    _res: Response,
    next: NextFunction,
): void {
    if (
        !SAFE_METHODS.has(req.method) &&
        req.get('sec-fetch-site') === 'cross-site'
    ) {
        next(ApiError.forbidden('Cross-site requests are not allowed'));
        return;
    }
    next();
}
