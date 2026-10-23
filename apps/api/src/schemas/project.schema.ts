import { z } from 'zod';
import { int4Id, pageQueryFields } from './common.schema';

export const projectIdParamSchema = z.object({
    projectId: int4Id,
});

// US2-5. Paging for a Provider's completed work on its public profile.
export const completedProjectListQuerySchema = z.object({
    ...pageQueryFields,
});

export type CompletedProjectListQuery = z.infer<
    typeof completedProjectListQuerySchema
>;
