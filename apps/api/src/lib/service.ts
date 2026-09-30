// listing_status is a plain VarChar(50) column with no DB enum, so this is the
// single source of truth for its values. Browse filters and proposal logic
// should import from here instead of hardcoding strings.
import type { ListingStatus } from '@mangodb/shared';
import { LISTING_STATUSES } from '@mangodb/shared';

export const DEFAULT_LISTING_STATUS: ListingStatus = LISTING_STATUSES[1];

// The columns a service listing response may carry.
export const listingSelect = {
    listingId: true,
    companyId: true,
    listingTitle: true,
    listingDesc: true,
    minBudget: true,
    maxBudget: true,
    listingStatus: true,
    listingCategory: { select: { catId: true } },
} as const;

type SelectedListing = {
    listingId: number;
    companyId: number | null;
    listingTitle: string;
    listingDesc: string;
    minBudget: number | null;
    maxBudget: number | null;
    listingStatus: string;
    listingCategory: { catId: number }[];
};

// TODO: move to @mangodb/shared next to ServicePortfolio so the frontend can
// import it. Kept here until you decide where the wire types live.
export type Listing = {
    listingId: number;
    companyId: number | null;
    type: 'SERVICE';
    listingTitle: string;
    listingDesc: string;
    minBudget: number | null;
    maxBudget: number | null;
    listingStatus: string;
    categoryIds: number[];
};

export function toListing(row: SelectedListing): Listing {
    return {
        listingId: row.listingId,
        companyId: row.companyId,
        type: 'SERVICE',
        listingTitle: row.listingTitle,
        listingDesc: row.listingDesc,
        minBudget: row.minBudget,
        maxBudget: row.maxBudget,
        listingStatus: row.listingStatus,
        categoryIds: row.listingCategory.map((c) => c.catId),
    };
}
