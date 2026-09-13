import type { AuthTokenClaims } from '@mangodb/shared';

// companyId is not a claim. `sub` is the claim, and it is a string because that
// is what JWT requires; companyId is the number every controller actually wants.
// requireAuth coerces it once and puts it here, rather than thirteen handlers
// each remembering to coerce it themselves.
export interface RequestAuth extends AuthTokenClaims {
    companyId: number;
}

declare module 'express-serve-static-core' {
    interface Request {
        auth?: RequestAuth;
    }
}
