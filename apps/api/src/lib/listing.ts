// What services and jobs share. Both are rows of one `listing` table
// (conventions §7), so the checks and writes that do not care which kind a
// row is live here once, instead of a copy in lib/service.ts and lib/job.ts.
import type {
    ListingStatus,
    ListingType,
    ProposalStatus,
} from '@mangodb/shared';
import type { Prisma } from '../generated/prisma/client';
import { minBudgetDoesNotExceedMax } from '../schemas/common.schema';
import { ApiError } from './api-error';
import { omitUndefined } from './objects';
import { prisma } from './prisma';

type Budgets = { minBudget: number | null; maxBudget: number | null };

// The errors that name a listing: one wording, with each kind's own noun
// (ADR 0020). Every handler that answers one of these reads it from here.
export const LISTING_MESSAGES: Record<
    ListingType,
    { notFound: string; forbidden: string }
> = {
    SERVICE: {
        notFound: 'Service not found',
        forbidden: 'This service belongs to another company',
    },
    JOB: {
        notFound: 'Job not found',
        forbidden: 'This job belongs to another company',
    },
};

// Checked before any write: 404 for an id that doesn't exist or is the other
// kind of listing, 403 for one that exists but belongs to another company.
// An open listing is discoverable anyway, so keeping 403 apart hides nothing.
// Hands back the row it read, so an edit can check the status and budgets
// without a second query.
export async function assertListingOwned(
    listingId: number,
    listingType: ListingType,
    companyId: number,
): Promise<Budgets & { listingStatus: string }> {
    const listing = await prisma.listing.findUnique({
        where: { listingId },
        select: {
            companyId: true,
            listingType: true,
            listingStatus: true,
            minBudget: true,
            maxBudget: true,
        },
    });

    const messages = LISTING_MESSAGES[listingType];
    if (!listing || listing.listingType !== listingType) {
        throw ApiError.notFound(messages.notFound);
    }
    if (listing.companyId !== companyId) {
        throw ApiError.forbidden(messages.forbidden);
    }

    return listing;
}

// GET of one listing. Anyone may read an OPEN one; a non-open one is private
// to its owner, so to anyone else it does not exist: 404, not 403
// (conventions §4). The caller's query has already hidden soft-deleted
// companies, the same way the search does.
export function assertListingVisible<
    T extends { listingStatus: string; companyId: number | null },
>(listing: T | null, callerId: number, listingType: ListingType): T {
    if (
        !listing ||
        (listing.listingStatus !== ('OPEN' satisfies ListingStatus) &&
            listing.companyId !== callerId)
    ) {
        throw ApiError.notFound(LISTING_MESSAGES[listingType].notFound);
    }
    return listing;
}

// A PATCH may send one budget only, so the rule is checked against the stored
// row with the body laid over it. Only when a budget is sent, so a row saved
// with bad budgets can still have its other fields edited. The error names
// the budget that was sent, so the form shows it under that input.
export function assertBudgetRange(
    stored: Budgets,
    body: {
        minBudget?: number | null | undefined;
        maxBudget?: number | null | undefined;
    },
    message: string,
): void {
    const { minBudget, maxBudget } = body;
    if (minBudget === undefined && maxBudget === undefined) return;

    if (
        !minBudgetDoesNotExceedMax({
            ...stored,
            ...omitUndefined({ minBudget, maxBudget }),
        })
    ) {
        const field = minBudget === undefined ? 'maxBudget' : 'minBudget';
        throw ApiError.validationFailed([{ field, message }]);
    }
}

// The listing_category rows for a new listing. A repeated id is written once.
export function categoryCreate(categoryIds: number[]) {
    return {
        create: [...new Set(categoryIds)].map((categoryId) => ({
            categoryId,
        })),
    };
}

// The same, replacing the whole set on an edit: [] clears it.
export function categoryReplace(categoryIds: number[]) {
    return { deleteMany: {}, ...categoryCreate(categoryIds) };
}

// US3-2 / US3-4. Two names find listings with either (OR). Case is ignored.
export function categoryNameWhere(names: string[]): Prisma.ListingWhereInput {
    return {
        listingCategory: {
            some: {
                category: { categoryName: { in: names, mode: 'insensitive' } },
            },
        },
    };
}

// US3-2 / US3-5. Keeps a listing whose budget range overlaps the filter range,
// so a deal is possible somewhere inside both. A one-sided range is open-ended
// only on its missing side; an unpriced listing cannot match a filter.
export function listingBudgetWhere(filter: {
    minBudget?: number | undefined;
    maxBudget?: number | undefined;
}): Prisma.ListingWhereInput[] {
    const where: Prisma.ListingWhereInput[] = [];
    if (filter.maxBudget !== undefined) {
        where.push({ minBudget: { lte: filter.maxBudget } });
    }
    if (filter.minBudget !== undefined) {
        where.push({
            OR: [
                { maxBudget: { gte: filter.minBudget } },
                {
                    AND: [{ minBudget: { not: null } }, { maxBudget: null }],
                },
            ],
        });
    }
    return where;
}

// Closes a listing that is still OPEN, inside the caller's transaction. The
// status in the where is the check: if it is closed already, or another
// request closed it a moment ago, nothing matches and the answer is a 409.
export async function closeOpenListing(
    tx: Prisma.TransactionClient,
    listingId: number,
    conflictMessage: string,
): Promise<void> {
    const { count } = await tx.listing.updateMany({
        where: {
            listingId,
            listingStatus: 'OPEN' satisfies ListingStatus,
        },
        data: { listingStatus: 'CLOSED' satisfies ListingStatus },
    });
    if (count === 0) {
        throw ApiError.conflict(conflictMessage);
    }
}

// Rejects every PENDING proposal on a listing, inside the caller's
// transaction. Accepting one passes its id, so only the others are rejected.
export async function rejectPendingProposals(
    tx: Prisma.TransactionClient,
    listingId: number,
    exceptProposalId?: number,
): Promise<void> {
    await tx.proposal.updateMany({
        where: {
            listingId,
            ...(exceptProposalId !== undefined && {
                proposalId: { not: exceptProposalId },
            }),
            proposalStatus: 'PENDING' satisfies ProposalStatus,
        },
        data: { proposalStatus: 'REJECTED' satisfies ProposalStatus },
    });
}
