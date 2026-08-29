import { z } from 'zod';

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
    // bcrypt ignores everything past 72 bytes, so accepting more is a lie.
    password: z.string().min(8).max(72),
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
