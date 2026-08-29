import type { AuthTokenClaims } from '@mangodb/shared';

declare module 'express-serve-static-core' {
    interface Request {
        auth?: AuthTokenClaims;
    }
}
