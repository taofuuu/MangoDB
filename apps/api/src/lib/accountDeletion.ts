import { prisma } from './prisma';

// US1-6 / US6-4. A company's own deletion request and an administrator's
// deletion of a company both end here, so the two paths cannot drift on what
// "deleted" means. Eligibility (active projects, dependency safeguards) is
// each caller's own decision, made before this runs — this module only
// performs the deletion and answers whether an account is subject to it.

// updateMany with a deleted_at: null guard, not update: a second delete of an
// already-deleted row must be a no-op, not a clobber of the original
// deleted_at timestamp. The boolean tells the caller whether this call was
// the one that did it.
export async function softDeleteCompany(companyId: number): Promise<boolean> {
    const { count } = await prisma.company.updateMany({
        where: { company_id: companyId, deleted_at: null },
        data: { deleted_at: new Date() },
    });
    return count > 0;
}

// A row that no longer exists and a row marked deleted both mean the same
// thing to a caller checking whether an account may act: no. Folding "not
// found" into "deleted" here means requireAuth gets one boolean instead of
// having to separately handle a company deleted out from under a live token.
export async function isCompanyDeleted(companyId: number): Promise<boolean> {
    const company = await prisma.company.findUnique({
        where: { company_id: companyId },
        select: { deleted_at: true },
    });
    return !company || company.deleted_at !== null;
}
