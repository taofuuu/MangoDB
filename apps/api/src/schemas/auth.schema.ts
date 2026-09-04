import { z } from 'zod';
import { companyFields } from './company.schema';

// The company columns come from companyFields, so registration and the profile
// edit cannot drift apart on what a valid phone number or username looks like.
export const registerSchema = z.object({
    company_name: companyFields.company_name,
    username: companyFields.username,
    email: companyFields.email,
    // bcrypt ignores everything past 72 bytes, so accepting more is a lie.
    password: z.string().min(8).max(72),
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
