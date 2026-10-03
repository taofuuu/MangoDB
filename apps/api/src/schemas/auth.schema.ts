import { z } from 'zod';
import { companyFields } from './company.schema';

// The company columns come from companyFields, so registration and the profile
// edit cannot drift apart on what a valid phone number or username looks like.
export const registerSchema = z.object({
    companyName: companyFields.companyName,
    username: companyFields.username,
    email: companyFields.email,
    password: companyFields.password,
    phone: companyFields.phone,
    accountType: z.enum(['PROVIDER', 'RECEIVER', 'BOTH']),
    companyType: companyFields.companyType,
    // The three nullable columns. Optional here, since registration has nothing
    // to clear; the edit schema makes them nullable instead.
    companyDescription: companyFields.companyDescription.optional(),
    address: companyFields.address.optional(),
    website: companyFields.website.optional(),
    // US1-13. The ToS checkbox. Only `true` passes: an unchecked box, a
    // missing field, or `false` is a 400, so tos_accepted_at is only ever
    // written for a company that actually consented.
    tosAccepted: z.literal(true, {
        message: 'Accept the Terms of Service to register',
    }),
});

export type RegisterInput = z.infer<typeof registerSchema>;

// US1-2. Shape only — deliberately not register's password rules. A password
// failing min(8) here would return 400 VALIDATION_FAILED, which answers a
// credential question with the wrong status and hands an attacker the policy.
// A wrong credential is always 401, whatever it looks like.
// US1-1.9. The signup form's inline hint. Deliberately the same field rules
// registration uses, because a hint that answers a different question than the
// submit button is worse than no hint.
export const checkAvailabilitySchema = z.object({
    username: companyFields.username,
    email: companyFields.email,
});

export const loginSchema = z.object({
    email: companyFields.email,
    // passwordAttempt, not password: checking one is deliberately looser than
    // setting one. See its comment in company.schema.ts.
    password: companyFields.passwordAttempt,
});
