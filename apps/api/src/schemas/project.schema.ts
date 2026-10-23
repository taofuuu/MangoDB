import { z } from 'zod';
import { int4Id } from './common.schema';

export const projectIdParamSchema = z.object({
    projectId: int4Id,
});
