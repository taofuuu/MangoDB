export type UserRole = 'provider' | 'receiver' | 'admin';

export interface User {
    id: string;
    role: UserRole;
    email: string;
    // TODO: add more fields
}

// Claims the caller supplies when issuing an access token at login.
export interface AuthTokenPayload {
    sub: string;
    role: UserRole;
}

// What a verified token carries back. jti identifies the individual token so
// logout can revoke it; exp bounds how long that revocation must be remembered.
export interface AuthTokenClaims extends AuthTokenPayload {
    jti: string;
    exp: number;
}

// The frontend switches on these; a rename is a breaking change for both sides.
export type ApiErrorCode =
    | 'BAD_REQUEST'
    | 'VALIDATION_FAILED'
    | 'UNAUTHORIZED'
    | 'FORBIDDEN'
    | 'NOT_FOUND'
    | 'CONFLICT'
    | 'INTERNAL';

// One per bad field, so a form can show each message beside its own input.
export interface ApiErrorDetail {
    field: string;
    message: string;
}

// Body of every non-2xx response. Success responses return the resource itself.
export interface ApiErrorResponse {
    error: {
        code: ApiErrorCode;
        message: string;
        details?: ApiErrorDetail[];
    };
}
