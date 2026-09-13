import { prisma } from './prisma';

// US1-6. project.status is a free-text column (see schema.prisma) with no
// enum or check constraint behind it. The product only defines one terminal
// value today — Delivered — so "ongoing" means "not yet Delivered" rather
// than an allowlist of the other values (Waiting, Deposit, In Progress).
// That keeps the read side correct even if another in-progress status is
// introduced later without this file being updated.
const DELIVERED_STATUS = 'Delivered';

// A company sits on a project either as the provider who sent the winning
// proposal (proposal.senderId) or as the receiver who posted the listing
// that proposal answers (proposal.listing.companyId) — an accountType of
// BOTH can be either, so both paths are checked.
export async function hasOngoingProject(companyId: number): Promise<boolean> {
    const ongoingProject = await prisma.project.findFirst({
        where: {
            status: { not: DELIVERED_STATUS },
            proposal: {
                OR: [{ senderId: companyId }, { listing: { companyId } }],
            },
        },
        select: { projId: true },
    });

    return ongoingProject !== null;
}
