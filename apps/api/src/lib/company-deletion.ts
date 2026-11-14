import type { ProposalStatus } from '@mangodb/shared';
import { rejectPendingProposals } from './listing';
import { prisma } from './prisma';

// US1-6 / US6-4. The write side of company.deletedAt (see the migration note
// on that column). Marks the account gone without deleting anything it owns —
// no cascade — so listings, proposals, projects, and reviews stay exactly
// where they are for the history that depends on them.
//
// A company's own deletion request and an administrator's deletion of a company
// both end here, so the two paths cannot drift on what "deleted" means.
// Eligibility — whether an ongoing project should block this, see
// projectEligibility — is each caller's own decision, made before this runs.
//
// Idempotent: the deletedAt: null guard means a second call matches no rows,
// so the first deletion timestamp is the one that sticks. The boolean tells the
// caller whether this call was the one that did it.
//
// The accountType guard is an invariant rather than eligibility, which is why
// it sits here and not with the caller: deleting an administrator is a one-way
// lockout, because requireAuth refuses a deleted account on every request and
// nothing in this codebase undoes a soft delete. Putting it in the where clause
// means no caller can skip it — the company's own deletion route, when it
// lands, is covered without having to remember this rule. A caller that wants
// to explain the refusal checks accountType itself first; here an
// administrator simply never matches, and the call is a no-op like any other.
//
// The one thing it does clean up (#263): pending proposals on the company's
// listings are rejected, with a notice to each sender, the way closing a job
// does. Nobody is left to answer them, so they would stay Pending forever.
// Only the call that did the delete rejects, in the same transaction.
export async function softDeleteCompany(companyId: number): Promise<boolean> {
    return prisma.$transaction(async (tx) => {
        const { count } = await tx.company.updateMany({
            where: {
                companyId,
                deletedAt: null,
                accountType: { not: 'ADMIN' },
            },
            data: { deletedAt: new Date() },
        });
        if (count === 0) return false;

        const listings = await tx.listing.findMany({
            where: {
                companyId,
                proposal: {
                    some: {
                        proposalStatus: 'PENDING' satisfies ProposalStatus,
                    },
                },
            },
            select: { listingId: true },
        });
        for (const { listingId } of listings) {
            await rejectPendingProposals(tx, listingId, companyId);
        }
        return true;
    });
}

// requireAuth's one question about the company row, asked on every request.
// A token is still cryptographically valid after any of these, so all three
// end the session: the row no longer exists, it is marked deleted, or the
// token was issued before the last username/email/password change.
//
// Whole seconds, because that is all iat holds. The token issued alongside
// the change shares its second and must survive, so only an older second
// fails; another token minted in that same second slips through.
export async function isSessionEnded(
    companyId: number,
    issuedAt: number,
): Promise<boolean> {
    const company = await prisma.company.findUnique({
        where: { companyId },
        select: { deletedAt: true, credentialsChangedAt: true },
    });
    if (!company || company.deletedAt !== null) return true;

    const changedAt = company.credentialsChangedAt;
    return (
        changedAt !== null && issuedAt < Math.floor(changedAt.getTime() / 1000)
    );
}
