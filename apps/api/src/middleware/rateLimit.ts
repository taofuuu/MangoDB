import { rateLimit } from 'express-rate-limit';
import { ApiError } from '../lib/ApiError';

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;

// Stops password guessing: 10 failed sign-ins per email, then a 15 minute
// wait. Counted per email, not per IP, because every request reaches this
// server through the Next proxy, which does not pass the visitor's IP on.
// Per IP, one attacker would lock every user out at once.
//
// Both login doors share it, so a guess at either one counts. The count
// lives in memory: a restart clears it, and two API servers would each keep
// their own.
export const loginLimiter = rateLimit({
    windowMs: FIFTEEN_MINUTES_MS,
    limit: 10,
    // Only failures count. A correct password costs nothing.
    skipSuccessfulRequests: true,
    keyGenerator: (req) =>
        String(req.body?.email ?? '')
            .trim()
            .toLowerCase(),
    // RateLimit headers tell a client how long to wait.
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    // That check is about IP addresses, and this limit does not use them.
    validate: { xForwardedForHeader: false },
    // Through errorHandler, so the 429 has the same envelope as every error.
    handler: (_req, _res, next) => {
        next(
            ApiError.tooManyRequests(
                'Too many failed sign-in attempts. Try again in 15 minutes.',
            ),
        );
    },
});
