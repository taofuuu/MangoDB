export interface User {
    id: string;
    role: 'provider' | 'receiver' | 'admin';
    email: string;
    // TODO: add more fields
}
