import { z } from 'zod';
import { int4Id, pageQueryFields } from './common.schema';

export const projectIdParamSchema = z.object({
    projectId: int4Id,
});

// US4-9. GET /projects/mine: the same paging as every list.
export const projectListQuerySchema = z.object(pageQueryFields);
