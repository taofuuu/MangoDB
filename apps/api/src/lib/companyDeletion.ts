import { prisma } from './prisma';

// US1-6 / US6-4. The write side of company.deleted_at (see the migration note
// on that column). Marks the account gone without touching anything it owns —
// no cascade, no cleanup — so listings, proposals, projects, and reviews stay
// exactly where they are for the history that depends on them.
//
// A company's own deletion request and an administrator's deletion of a company
// both end here, so the two paths cannot drift on what "deleted" means.
// Eligibility — whether an ongoing project should block this, see
// projectEligibility — is each caller's own decision, made before this runs.
//
// Idempotent: the deleted_at: null guard means a second call matches no rows,
// so the first deletion timestamp is the one that sticks. The boolean tells the
// caller whether this call was the one that did it.
//
// The account_type guard is an invariant rather than eligibility, which is why
// it sits here and not with the caller: deleting an administrator is a one-way
// lockout, because requireAuth refuses a deleted account on every request and
// nothing in this codebase undoes a soft delete. Putting it in the where clause
// means no caller can skip it — the company's own deletion route, when it
// lands, is covered without having to remember this rule. A caller that wants
// to explain the refusal checks account_type itself first; here an
// administrator simply never matches, and the call is a no-op like any other.
export async function softDeleteCompany(companyId: number): Promise<boolean> {
    const { count } = await prisma.company.updateMany({
        where: {
            company_id: companyId,
            deleted_at: null,
            account_type: { not: 'ADMIN' },
        },
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
