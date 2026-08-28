export type UserRole = 'provider' | 'receiver' | 'admin';

export interface User {
    id: string;
    role: UserRole;
    email: string;
    // TODO: add more fields
}

// Claims carried by an access token issued at login.
export interface AuthTokenPayload {
    sub: string;
    role: UserRole;
}
