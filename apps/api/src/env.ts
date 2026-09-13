import dotenv from 'dotenv';

// Keep first in any entry point: everything below reads process.env while being
// imported, so .env has to load before it.
dotenv.config({ quiet: true });

// Every process.env read in the app happens here. Before this, eight reads were
// spread across six files in three different dotenv styles, and five of them
// were lazy — inside a function rather than at module scope — purely to dodge
// an import-order problem that loading .env once, here, removes.
//
// The practical win is that a missing JWT_SECRET now fails at startup with a
// message naming the variable, instead of on the first login attempt.

function required(name: string): string {
    const value = process.env[name];
    if (!value) {
        throw new Error(
            `${name} is not set. Copy .env.example to .env and fill it in.`,
        );
    }
    return value;
}

function optional(name: string, fallback: string): string {
    return process.env[name] || fallback;
}

export const PORT = Number(process.env.PORT) || 4000;

export const NODE_ENV = optional('NODE_ENV', 'development');
export const IS_PRODUCTION = NODE_ENV === 'production';

export const JWT_SECRET = required('JWT_SECRET');

// One number for both the token and the cookie. They used to be set separately
// — '1h' in jwt.ts and 60 * 60 * 1000 in session.ts — and JWT_EXPIRES_IN moved
// only the first, so JWT_EXPIRES_IN=8h gave a cookie that expired seven hours
// before the token it carried. Seconds, because that is the unit jsonwebtoken
// takes; the cookie multiplies up to milliseconds.
export const SESSION_TTL_SECONDS = Number(
    optional('SESSION_TTL_SECONDS', '3600'),
);

export const DATABASE_URL = required('DATABASE_URL');

// Checked at first use rather than at startup, unlike the three above:
// everything except image upload works without storage keys, and refusing to
// boot would stop anyone who has not set them from running the app at all.
export function supabaseCredentials(): { url: string; key: string } {
    return {
        url: required('SUPABASE_URL'),
        key: required('SUPABASE_SECRET_KEY'),
    };
}

// Unset means "allow any origin", which is fine locally and is not fine
// deployed. app.ts decides what to do about that; this only reports the value.
export const FRONTEND_URL = process.env.FRONTEND_URL;
