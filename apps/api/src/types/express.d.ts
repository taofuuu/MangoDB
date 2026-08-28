import type { AuthTokenPayload } from '@mangodb/shared';

declare module 'express-serve-static-core' {
    interface Request {
        auth?: AuthTokenPayload;
    }
}
