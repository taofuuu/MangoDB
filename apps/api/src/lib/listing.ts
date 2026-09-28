// ASSUMPTION: schema.prisma has no free-form enum for listing_status, so this
// is the value a new listing starts with. Change it to whatever the rest of
// the app (browse filters, proposals) expects.
export const DEFAULT_LISTING_STATUS = 'ACTIVE';

// The columns a listing response may carry, reusable by GET later. `type` is
// not a column: a listing is a SERVICE when it has a service row and a JOB
// when it has a job_requirement row, so both relations are selected and
// toListing derives the type from them.
export const listingSelect = {
    listingId: true,
    companyId: true,
    listingTitle: true,
    listingDesc: true,
    minBudget: true,
    maxBudget: true,
    listingStatus: true,
    listingCategory: { select: { catId: true } },
    service: { select: { listingId: true } },
    jobRequirement: {
        select: { locationPref: true, duration: true, deadline: true },
    },
} as const;

type SelectedListing = {
    listingId: number;
    companyId: number | null;
    listingTitle: string;
    listingDesc: string;
    minBudget: number | null;
    maxBudget: number;
    listingStatus: string;
    listingCategory: { catId: number }[];
    service: { listingId: number } | null;
    jobRequirement: {
        locationPref: string | null;
        duration: string | null;
        deadline: Date | null;
    } | null;
};

// TODO: move to @mangodb/shared next to ServicePortfolio so the frontend can
// import it. Kept here until you decide where the wire types live.
export type Listing = {
    listingId: number;
    companyId: number | null;
    type: 'SERVICE' | 'JOB';
    listingTitle: string;
    listingDesc: string;
    minBudget: number | null;
    maxBudget: number;
    listingStatus: string;
    categoryIds: number[];
    jobRequirement?: {
        locationPref: string | null;
        duration: string | null;
        deadline: string | null;
    };
};

// deadline is @db.Date, so it comes back at UTC midnight and slicing the ISO
// string gives a plain YYYY-MM-DD, same as portfolio's developmentDate.
export function toListing(row: SelectedListing): Listing {
    const base = {
        listingId: row.listingId,
        companyId: row.companyId,
        listingTitle: row.listingTitle,
        listingDesc: row.listingDesc,
        minBudget: row.minBudget,
        maxBudget: row.maxBudget,
        listingStatus: row.listingStatus,
        categoryIds: row.listingCategory.map((c) => c.catId),
    };

    if (row.jobRequirement) {
        const { locationPref, duration, deadline } = row.jobRequirement;
        return {
            ...base,
            type: 'JOB',
            jobRequirement: {
                locationPref,
                duration,
                deadline: deadline?.toISOString().slice(0, 10) ?? null,
            },
        };
    }

    return { ...base, type: 'SERVICE' };
}
