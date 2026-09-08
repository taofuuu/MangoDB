import { z } from 'zod';

export const deleteServiceParamsSchema = z.object({
    listingId: z.coerce
        .number()
        .int('Service ID must be an integer')
        .positive('Service ID must be positive'),
});
