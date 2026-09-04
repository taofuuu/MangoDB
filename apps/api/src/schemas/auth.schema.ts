import { z } from 'zod';

// bcrypt reads only the first 72 bytes of a password and ignores the rest, so
// the cap has to be counted in bytes. `.max(72)` counts characters instead —
// the same thing in ASCII, but a Thai character is 3 bytes, so a 30-character
// Thai password is 90 bytes and everything past the 24th character would be
// dropped silently, letting two different passwords open one account.
const BCRYPT_MAX_BYTES = 72;

const TOO_LONG_MESSAGE = `Password must be at most ${BCRYPT_MAX_BYTES} bytes (a Thai character counts as 3)`;

function fitsBcryptLimit(password: string): boolean {
    return Buffer.byteLength(password, 'utf8') <= BCRYPT_MAX_BYTES;
}

// Sizes match the columns in prisma/schema.prisma; anything longer would be a
// database error rather than a validation message.
export const registerSchema = z.object({
    company_name: z.string().trim().min(1).max(255),
    // Lowercased because the unique index is case-sensitive: without this,
    // "CodeCrafters" would register alongside "codecrafters".
    username: z
        .string()
        .trim()
        .toLowerCase()
        .min(3)
        .max(50)
        .regex(/^[a-z0-9_]+$/, 'Use letters, numbers, and underscores only'),
    email: z.email().max(100).toLowerCase(),
    // A byte cap, not `.max(72)`: see BCRYPT_MAX_BYTES. This is the one that
    // matters, because it decides what actually gets hashed at signup.
    password: z.string().min(8).refine(fitsBcryptLimit, TOO_LONG_MESSAGE),
    phone: z
        .string()
        .trim()
        .min(6)
        .max(20)
        .regex(/^[0-9+\-\s()]+$/, 'Use digits and + - ( ) only'),
    account_type: z.enum(['PROVIDER', 'RECEIVER', 'BOTH']),
    // Industry tags — SME, Software House, FinTech. Every seeded company has
    // at least one, so registration requires one too.
    company_type: z.array(z.string().trim().min(1).max(100)).min(1).max(10),
    company_description: z.string().trim().max(2000).optional(),
    address: z.string().trim().max(500).optional(),
    website: z.url().max(255).optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;

// The columns a registration can collide on. prismaErrors uses this to decide
// which constraint names are worth reporting back to the caller.
export const REGISTER_UNIQUE_FIELDS = ['username', 'email'] as const;

// US1-2. Shape only — deliberately not register's password rules. A password
// failing min(8) here would return 400 VALIDATION_FAILED, which answers a
// credential question with the wrong status and hands an attacker the policy.
// A wrong credential is always 401, whatever it looks like.
export const loginSchema = z.object({
    // Lowercased to match how register stores it. The unique index is
    // case-sensitive, so "Aong@X.com" would otherwise miss the row entirely.
    email: z.email().max(100).toLowerCase(),
    // Still a character cap here, deliberately. Anyone who registered before
    // fitsBcryptLimit existed may hold a password longer than 72 bytes; bcrypt
    // truncates it to the same 72 bytes it hashed back then, so they still
    // authenticate. Rejecting it here would lock them out, and would answer a
    // credential question with a 400 instead of a 401.
    password: z.string().min(1).max(72),
});

export type LoginInput = z.infer<typeof loginSchema>;
