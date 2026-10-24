import type { Quotation, QuotationStatus } from '@mangodb/shared';
import type { Prisma } from '../generated/prisma/client';

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
