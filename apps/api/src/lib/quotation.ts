import type {
    ProjectRole,
    ProjectStatus,
    Quotation,
    QuotationStatus,
} from '@mangodb/shared';
import type { Prisma } from '../generated/prisma/client';
import { ApiError } from './api-error';
import { prisma } from './prisma';
import { projectParties } from './project';
import { BUCKETS, signStorageUrls } from './storage';

// US4-1, ADR 0017. A quotation PDF on a project.
export const quotationSelect = {
    quotationId: true,
    projectId: true,
    quotationFile: true,
    quotationStatus: true,
    createdAt: true,
} as const satisfies Prisma.QuotationSelect;

type QuotationRow = {
    quotationId: number;
    projectId: number;
    quotationFile: string;
    quotationStatus: string;
    createdAt: Date;
};

// Date does not survive JSON as the frontend expects, so createdAt becomes an
// ISO timestamp string per conventions §10. The status cast is safe because
// only QUOTATION_STATUSES values are written.
export function toQuotation(row: QuotationRow): Quotation {
    return {
        ...row,
        quotationStatus: row.quotationStatus as QuotationStatus,
        createdAt: row.createdAt.toISOString(),
    };
}

// How long a quotation link opens for: an hour, the same as a session.
const QUOTATION_LINK_SECONDS = 60 * 60;

// What every quotation endpoint answers with. The quotation bucket is private
// (a price sheet is the two parties' business), so quotationFile goes out as a
// signed link that expires instead of the stored URL, which does not open.
export async function toQuotations(rows: QuotationRow[]): Promise<Quotation[]> {
    const links = await signStorageUrls(
        rows.map((row) => row.quotationFile),
        BUCKETS.QUOTATION,
        QUOTATION_LINK_SECONDS,
    );
    return rows.map((row, i) => ({
        ...toQuotation(row),
        quotationFile: links[i]!,
    }));
}

export type QuotationParty = {
    projectId: number;
    proposalId: number;
    projectStatus: ProjectStatus;
    providerId: number;
    receiverId: number;
    myRole: ProjectRole;
};

const QUOTATION_NOT_FOUND = 'Quotation not found';

// Every /quotations/:quotationId endpoint starts here. Like assertProjectParty,
// a quotation does not exist to a company outside its project, so 404, not 403
// (conventions §4). Which party may act is the endpoint's own check against myRole.
export async function assertQuotationParty(
    quotationId: number,
    callerId: number,
): Promise<QuotationParty> {
    const quotation = await prisma.quotation.findUnique({
        where: { quotationId },
        select: {
            projectId: true,
            project: {
                select: {
                    proposalId: true,
                    projectStatus: true,
                    proposal: {
                        select: {
                            senderId: true,
                            listing: {
                                select: {
                                    listingType: true,
                                    companyId: true,
                                },
                            },
                        },
                    },
                },
            },
        },
    });
    if (!quotation) throw ApiError.notFound(QUOTATION_NOT_FOUND);

    const parties = projectParties(quotation.project.proposal);
    if (callerId !== parties.providerId && callerId !== parties.receiverId) {
        throw ApiError.notFound(QUOTATION_NOT_FOUND);
    }
    return {
        projectId: quotation.projectId,
        proposalId: quotation.project.proposalId,
        projectStatus: quotation.project.projectStatus as ProjectStatus,
        ...parties,
        myRole: callerId === parties.providerId ? 'provider' : 'receiver',
    };
}
