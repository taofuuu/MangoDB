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
});

export type RegisterInput = z.infer<typeof registerSchema>;

// US1-2. Shape only — deliberately not register's password rules. A password
// failing min(8) here would return 400 VALIDATION_FAILED, which answers a
// credential question with the wrong status and hands an attacker the policy.
// A wrong credential is always 401, whatever it looks like.
export const loginSchema = z.object({
    email: companyFields.email,
    // passwordAttempt, not password: checking one is deliberately looser than
    // setting one. See its comment in company.schema.ts.
    password: companyFields.passwordAttempt,
});

export type LoginInput = z.infer<typeof loginSchema>;
