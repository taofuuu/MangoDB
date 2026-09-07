import { z } from 'zod';

// One definition per editable column, shared by registration (US1-1) and the
// profile edit (US1-5) so a fix to a rule is one edit rather than two. Sizes
// match the columns in prisma/schema.prisma; anything longer would be a
// database error rather than a validation message.
export const companyFields = {
    company_name: z.string().trim().min(1).max(255),
    // Lowercased because the unique index is case-sensitive: without this,
    // "CodeCrafters" would sit alongside "codecrafters".
    username: z
        .string()
        .trim()
        .toLowerCase()
        .min(3)
        .max(50)
        .regex(/^[a-z0-9_]+$/, 'Use letters, numbers, and underscores only'),
    email: z.email().max(100).toLowerCase(),
    phone: z
        .string()
        .trim()
        .min(6)
        .max(20)
        .regex(/^[0-9+\-\s()]+$/, 'Use digits and + - ( ) only'),
    // Industry tags — SME, Software House, FinTech. Every seeded company has at
    // least one, so a company can never be left without any.
    company_type: z.array(z.string().trim().min(1).max(100)).min(1).max(10),
    company_description: z.string().trim().max(2000),
    address: z.string().trim().max(500),
    website: z.url().max(255),
} as const;

// The columns a unique index can reject. prismaErrors uses this to decide which
// constraint names are worth reporting back to the caller.
export const COMPANY_UNIQUE_FIELDS = ['username', 'email'] as const;

// US1-5. Every field is optional: an absent one leaves the column alone, and
// null clears one that is nullable. password is not here — changing it needs
// the current password — and neither is account_type, which would have to add
// or remove the provider/receiver rows and restamp the token's role claim.
export const updateCompanyProfileSchema = z
    .object({
        company_name: companyFields.company_name,
        username: companyFields.username,
        email: companyFields.email,
        phone: companyFields.phone,
        company_type: companyFields.company_type,
        company_description: companyFields.company_description.nullable(),
        address: companyFields.address.nullable(),
        website: companyFields.website.nullable(),
    })
    .partial()
    // An empty body is a client bug, not a no-op worth a 200.
    .refine((body) => Object.keys(body).length > 0, {
        message: 'Provide at least one field to update',
    });

export type UpdateCompanyProfileInput = z.infer<
    typeof updateCompanyProfileSchema
>;
