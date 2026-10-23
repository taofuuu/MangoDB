import { z } from 'zod';
import { int4Id, pageQueryFields } from './common.schema';

export const projectIdParamSchema = z.object({
    projectId: int4Id,
});

// US4-9. GET /projects/mine: the same paging as every list.
export const projectListQuerySchema = z.object(pageQueryFields);

// US2-5. Paging for a Provider's completed work on its public profile.
export const completedProjectListQuerySchema = z.object(pageQueryFields);

export type CompletedProjectListQuery = z.infer<
    typeof completedProjectListQuerySchema
>;

// US4-10. POST /projects/:projectId/updates. Same 10000 cap as proposal terms
// and listing descriptions. strictObject, so a misspelt field is a 400.
export const createProjectUpdateSchema = z.strictObject({
    updateText: z
        .string()
        .trim()
        .min(1, 'Update text is required')
        .max(10000, 'Update text cannot exceed 10000 characters'),
});
