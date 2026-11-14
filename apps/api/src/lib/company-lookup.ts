import type { Prisma } from '../generated/prisma/client';
import { ApiError } from './api-error';
import { prisma } from './prisma';

// Its own file, not company-profile.ts: that one has no database import, so
// the DTO tests can load it without a .env.

// Another company, as the public may see it. Unknown, soft-deleted and admin
// accounts all answer the same 404, so a caller cannot tell which an id is.
export async function findPublicCompany<S extends Prisma.CompanySelect>(
    companyId: number,
    select: S,
): Promise<Prisma.CompanyGetPayload<{ select: S }>> {
    // findFirst, not findUnique: the two extra conditions are not part of a
    // unique key.
    const company = await prisma.company.findFirst({
        where: { companyId, deletedAt: null, accountType: { not: 'ADMIN' } },
        select,
    });
    if (!company) throw ApiError.notFound('Company not found');
    return company;
}
