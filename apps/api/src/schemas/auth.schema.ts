import { z } from 'zod';
import { companyFields } from './company.schema';

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

// The company columns come from companyFields, so registration and the profile
// edit cannot drift apart on what a valid phone number or username looks like.
export const registerSchema = z.object({
    company_name: companyFields.company_name,
    username: companyFields.username,
    email: companyFields.email,
    // A byte cap, not `.max(72)`: see BCRYPT_MAX_BYTES. This is the one that
    // matters, because it decides what actually gets hashed at signup.
    password: z.string().min(8).refine(fitsBcryptLimit, TOO_LONG_MESSAGE),
    phone: companyFields.phone,
    account_type: z.enum(['PROVIDER', 'RECEIVER', 'BOTH']),
    company_type: companyFields.company_type,
    // The three nullable columns. Optional here, since registration has nothing
    // to clear; the edit schema makes them nullable instead.
    company_description: companyFields.company_description.optional(),
    address: companyFields.address.optional(),
    website: companyFields.website.optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;

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

