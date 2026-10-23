import { prisma } from './prisma';
import type { ProjectStatus } from '@mangodb/shared';

// US1-6. project.status is a free-text column (see schema.prisma) with no
// enum or check constraint behind it; ProjectStatus in packages/shared is the
// only enforcement (docs/conventions.md §6). Only a finished project stops
// blocking deletion; every other status is ongoing (ADR 0015).
const FINISHED_STATUSES = ['COMPLETED', 'CANCELLED'] satisfies ProjectStatus[];

// A company sits on a project either as the sender of the accepted proposal
// or as the owner of the listing it answers. On a job the sender is the
// Provider, on a service the Receiver (ADR 0016), so both paths are checked.
export async function hasOngoingProject(companyId: number): Promise<boolean> {
    const ongoingProject = await prisma.project.findFirst({
        where: {
            projectStatus: { notIn: FINISHED_STATUSES },
            proposal: {
                OR: [{ senderId: companyId }, { listing: { companyId } }],
            },
        },
        select: { projectId: true },
    });

    return ongoingProject !== null;
}

// The one answer for both doors that delete a company: the company itself
// and an admin. A state conflict, so 409 (conventions §4).
export const ONGOING_PROJECT_BLOCKS_DELETE =
    'A company with an ongoing project cannot be deleted';
