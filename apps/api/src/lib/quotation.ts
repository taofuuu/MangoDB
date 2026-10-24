import type { ProjectRole, Quotation, QuotationStatus } from '@mangodb/shared';
import type { Prisma } from '../generated/prisma/client';
import { ApiError } from './api-error';
import { prisma } from './prisma';
import { projectParties } from './project';

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

export type QuotationParty = {
    quotationId: number;
    projectId: number;
    quotationStatus: QuotationStatus;
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
            quotationId: true,
            projectId: true,
            quotationStatus: true,
            project: {
                select: {
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
        quotationId: quotation.quotationId,
        projectId: quotation.projectId,
        quotationStatus: quotation.quotationStatus as QuotationStatus,
        myRole: callerId === parties.providerId ? 'provider' : 'receiver',
    };
}
