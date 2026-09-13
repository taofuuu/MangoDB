import type { Response } from 'express';
import type { CompanyProfile, SessionResponse } from '@mangodb/shared';
import { signAccessToken } from '../auth/jwt';
import { accountTypeToRole } from '../auth/roles';

// Mirrors the 1 h token expiry: a cookie outliving its token would just make
// requests 401 instead of asking the user to sign in again.
const COOKIE_MAX_AGE_MS = 60 * 60 * 1000;

// httpOnly keeps the token out of reach of JS, so an injected script cannot
// read it. sameSite 'lax' is what stops CSRF: the browser attaches this cookie
// to normal navigation but not to a cross-site POST.
const COOKIE_OPTIONS = {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: COOKIE_MAX_AGE_MS,
    path: '/',
} as const;

// Register, login, and a credential change all hand back a company and a token
// to act as it. One place decides what that pair looks like, so the three
// cannot drift on the claims they mint.
export function issueSession(company: CompanyProfile): SessionResponse {
    const accessToken = signAccessToken({
        sub: String(company.companyId),
        role: accountTypeToRole(company.accountType),
    });

    return { company, accessToken };
}

// The only way to hand out a session. Those same three endpoints all have to
// set the cookie the browser authenticates with, and routing them through here
// is what stops one of them forgetting — which is exactly how login shipped
// without storing anything at all. The token stays in the body too, for callers
// that are not a browser: curl, Postman, the dev session page.
export function sendSession(
    res: Response,
    company: CompanyProfile,
    status = 200,
): void {
    const session = issueSession(company);
    res.cookie('access_token', session.accessToken, COOKIE_OPTIONS);
    res.status(status).json(session);
}
