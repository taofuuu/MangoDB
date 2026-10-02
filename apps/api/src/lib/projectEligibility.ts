import { prisma } from './prisma';
import type { ProjectStatus } from '@mangodb/shared';

// US1-6. project.status is a free-text column (see schema.prisma) with no
// enum or check constraint behind it; ProjectStatus in packages/shared is the
// only enforcement (docs/conventions.md §6). "Ongoing" means ACTIVE —
// COMPLETED and CANCELLED projects do not block deleting a company.
const ONGOING_STATUS = 'ACTIVE' satisfies ProjectStatus;

// A company sits on a project either as the provider who sent the winning
// proposal (proposal.senderId) or as the receiver who posted the listing
// that proposal answers (proposal.listing.companyId) — an accountType of
// BOTH can be either, so both paths are checked.
export async function hasOngoingProject(companyId: number): Promise<boolean> {
    const ongoingProject = await prisma.project.findFirst({
        where: {
            status: ONGOING_STATUS,
            proposal: {
                OR: [{ senderId: companyId }, { listing: { companyId } }],
            },
        },
        select: { projId: true },
    });

    return ongoingProject !== null;
}
