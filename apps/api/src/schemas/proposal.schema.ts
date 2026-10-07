import { z } from 'zod';
import { PROPOSAL_STATUSES } from '@mangodb/shared';

export const proposalFields = {
    proposalBudget: z.coerce
        .number({ message: 'Proposal budget is required' })
        .positive('Proposal budget must be greater than zero')
        .max(9999999999.99, 'Proposal budget exceeds maximum allowed'),
    proposalTerms: z
        .string({ message: 'Proposal terms are required' })
        .trim()
        .min(1, 'Proposal terms are required')
        .max(10000, 'Proposal terms cannot exceed 10000 characters'),
    duration: z.coerce
        .number({ message: 'Duration is required' })
        .positive('Duration must be greater than zero')
        .max(120, 'Duration cannot exceed 120 months')
        .refine((val) => val % 0.5 === 0, {
            message:
                'Duration must be in half-month increments (e.g. 0.5, 1, 1.5)',
        }),
} as const;

export const createProposalSchema = z.strictObject(proposalFields);

export const proposalIdParamSchema = z.object({
    proposalId: z.coerce.number().int().positive().max(2147483647),
});

function emptyOrTrim(val: unknown): unknown {
    if (typeof val === 'string') {
        const trimmed = val.trim();
        return trimmed === '' ? undefined : trimmed;
    }
    return val;
}

// US2-9. Query parameters for GET /proposals/mine.
// Defaults pageSize to 6 proposals per page (supporting limit as alias).
// Preprocesses empty or whitespace-only strings to undefined so blank query params (e.g. ?status= or ?page= ) do not fail validation.
export const proposalListQuerySchema = z
    .object({
        page: z.preprocess(
            emptyOrTrim,
            z.coerce.number().int().positive().default(1),
        ),
        pageSize: z.preprocess(
            emptyOrTrim,
            z.coerce.number().int().min(1).max(50).optional(),
        ),
        limit: z.preprocess(
            emptyOrTrim,
            z.coerce.number().int().min(1).max(50).optional(),
        ),
        status: z.preprocess(emptyOrTrim, z.enum(PROPOSAL_STATUSES).optional()),
    })
    .transform((data) => ({
        page: data.page,
        pageSize: data.pageSize ?? data.limit ?? 6,
        status: data.status,
    }));

export type ProposalListQuery = z.infer<typeof proposalListQuerySchema>;
