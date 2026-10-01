import { z } from 'zod';

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

export const proposalParamsSchema = z.strictObject({
    jobPostingId: z.coerce.number().int().positive('Invalid job posting ID'),
});

export const proposalIdParamSchema = z.object({
    proposalId: z.coerce.number().int().positive().max(2147483647),
});
