import { prisma } from './prisma';

// US1-6. The write side of company.deleted_at (see the migration note on that
// column). Marks the account gone without touching anything it owns — no
// cascade, no cleanup — so listings, proposals, projects, and reviews stay
// exactly where they are for the history that depends on them.
//
// Idempotent on purpose: a second call just re-stamps the timestamp, which
// matters because the eligibility check and the update cannot be one atomic
// step, so a caller may end up racing itself.
export async function softDeleteCompany(companyId: number): Promise<void> {
    await prisma.company.updateMany({
        where: { company_id: companyId, deleted_at: null },
        data: { deleted_at: new Date() },
    });
}
