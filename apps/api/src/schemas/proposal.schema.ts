import { z } from 'zod';

export const proposalIdParamSchema = z.object({
    proposalId: z.coerce.number().int().positive().max(2147483647),
});
