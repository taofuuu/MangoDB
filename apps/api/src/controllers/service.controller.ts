import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { ApiError } from '../lib/ApiError';
import { parseParams } from '../middleware/validate';
import { deleteServiceParamsSchema } from '../schemas/service.schema';

// US1-9. A service is a specialised listing. Keep the row and its relationships
// for history, but mark the parent listing as deleted so read endpoints can hide
// it with `deleted_at: null`.
export async function deleteService(
    req: Request,
    res: Response,
): Promise<void> {
    const { listingId } = parseParams(deleteServiceParamsSchema, req.params);
    const companyId = Number(req.auth!.sub);

    // Include ownership, subtype, and active state in the update itself. This
    // is atomic and gives the same 404 for a missing, already-deleted, or
    // another company's service, so the endpoint reveals no foreign IDs.
    const result = await prisma.listing.updateMany({
        where: {
            listing_id: listingId,
            company_id: companyId,
            service: { isNot: null },
            deleted_at: null,
        },
        data: {
            deleted_at: new Date(),
        },
    });

    if (result.count === 0) {
        throw ApiError.notFound('Service not found');
    }

    res.status(204).send();
}
