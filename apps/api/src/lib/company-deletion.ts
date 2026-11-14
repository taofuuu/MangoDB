import type { NotificationType, ProposalStatus } from '@mangodb/shared';
import { prisma } from './prisma';

// US1-6 / US6-4. The write side of company.deletedAt (see the migration note
// on that column). Marks the account gone without touching anything it owns —
// no cascade, no cleanup — so listings, proposals, projects, and reviews stay
// exactly where they are for the history that depends on them. Pending
// proposals are the one exception, explained below.
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
// The one exception to "touches nothing else" is PENDING proposals and hire
// requests, rejected in the same transaction. Accepted and rejected ones are
// history and stay as they are.
// - The ones it sent (#262): otherwise a listing owner could accept one and
//   open a project with a party that can never sign in again. No notice: the
//   listing owner just sees it as Rejected, and there is no notice type for
//   "the sender left".
// - The ones on its listings (#263): otherwise their senders wait on Pending
//   forever. Each sender gets a PROPOSAL_REJECTED notice from the deleted
//   company, the same notice rejectPendingProposals gives when a job closes.
//   One query for all its listings, instead of rejectPendingProposals once
//   per listing.
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

        await tx.proposal.updateMany({
            where: {
                senderId: companyId,
                proposalStatus: 'PENDING' satisfies ProposalStatus,
            },
            data: { proposalStatus: 'REJECTED' satisfies ProposalStatus },
        });

        const rejected = await tx.proposal.updateManyAndReturn({
            where: {
                listing: { companyId },
                proposalStatus: 'PENDING' satisfies ProposalStatus,
            },
            data: { proposalStatus: 'REJECTED' satisfies ProposalStatus },
            select: { proposalId: true, senderId: true },
        });
        await tx.notification.createMany({
            data: rejected.map((proposal) => ({
                proposalId: proposal.proposalId,
                senderId: companyId,
                recipientId: proposal.senderId,
                notificationType:
                    'PROPOSAL_REJECTED' satisfies NotificationType,
            })),
        });
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
