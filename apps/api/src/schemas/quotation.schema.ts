import { z } from 'zod';
import { int4Id } from './common.schema';

export const quotationIdParamSchema = z.object({
    quotationId: int4Id,
});
