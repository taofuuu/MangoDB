import type {
    AccountType,
    CompanyAccountDetail,
    CompanyAccountSummary,
    ListingType,
    ProjectStatus,
} from '@mangodb/shared';
import { companyProfileSelect, toCompanyProfile } from './company-profile';
import type { Prisma } from '../generated/prisma/client';

const COMPLETED = 'COMPLETED' satisfies ProjectStatus;

// One proposal's project review, if it has one.
const reviewScoresSelect = {
    project: {
        select: {
            review: {
                select: {
                    workQualityScore: true,
                    serviceScore: true,
                    valueForMoneyScore: true,
                    deliveryTimeScore: true,
                },
            },
        },
    },
} as const satisfies Prisma.ProposalSelect;

// ADR 0018. Reviews rate the Provider, on COMPLETED projects only. A company
// is the Provider on a job it sent a proposal to, and on its own service when
// it gets a hire request (ADR 0016), so both paths are read.
const ratingSelect = {
    proposal: {
        where: {
            listing: { listingType: 'JOB' satisfies ListingType },
            project: { projectStatus: COMPLETED },
        },
        select: reviewScoresSelect,
    },
    listing: {
        where: { listingType: 'SERVICE' satisfies ListingType },
        select: {
            proposal: {
                where: { project: { projectStatus: COMPLETED } },
                select: reviewScoresSelect,
            },
        },
    },
} as const satisfies Prisma.CompanySelect;

// A strict subset of companyProfileSelect, derived rather than restated: the
// list card shows less than the detail panel, and picking the columns out by
// name is what keeps the two from disagreeing about what a column is called.
const { companyId, companyName, companyDescription, phone, accountType } =
    companyProfileSelect;

export const adminCompanyListSelect = {
    companyId,
    companyName,
    companyDescription,
    phone,
    accountType,
    deletedAt: true,
    ...ratingSelect,
} as const satisfies Prisma.CompanySelect;

export const adminCompanyDetailSelect = {
    ...companyProfileSelect,
    ...ratingSelect,
    deletedAt: true,
} as const satisfies Prisma.CompanySelect;

interface ReviewScoresRow {
    project: {
        review: {
            workQualityScore: number;
            serviceScore: number;
            valueForMoneyScore: number;
            deliveryTimeScore: number;
        } | null;
    } | null;
}

interface RatingSource {
    proposal: ReviewScoresRow[];
    listing: { proposal: ReviewScoresRow[] }[];
}

// The mean of every score in the Provider's reviews, to one decimal place.
// ratingCount is the number of reviews, not of scores.
export function getRating(source: RatingSource): {
    averageRating: number | null;
    ratingCount: number;
} {
    const reviews = [
        ...source.proposal,
        ...source.listing.flatMap((listing) => listing.proposal),
    ]
        .map(({ project }) => project?.review)
        .filter((review) => review != null);

    if (reviews.length === 0) {
        return { averageRating: null, ratingCount: 0 };
    }

    const total = reviews.reduce(
        (sum, review) =>
            sum +
            review.workQualityScore +
            review.serviceScore +
            review.valueForMoneyScore +
            review.deliveryTimeScore,
        0,
    );
    // Every review has the same four scores (ADR 0018).
    const average = total / (reviews.length * 4);

    return {
        averageRating: Math.round(average * 10) / 10,
        ratingCount: reviews.length,
    };
}

interface CompanyAccountSummaryRow extends RatingSource {
    companyId: number;
    companyName: string;
    companyDescription: string | null;
    phone: string;
    accountType: string;
    deletedAt: Date | null;
}

export function toCompanyAccountSummary(
    company: CompanyAccountSummaryRow,
): CompanyAccountSummary {
    return {
        companyId: company.companyId,
        companyName: company.companyName,
        companyDescription: company.companyDescription,
        phone: company.phone,
        accountType: company.accountType as AccountType,
        deletedAt: !company.deletedAt ? null : company.deletedAt.toISOString(),
        ...getRating(company),
    };
}

type CompanyAccountDetailRow = Parameters<typeof toCompanyProfile>[0] &
    RatingSource & { deletedAt: Date | null };

export function toCompanyAccountDetail(
    company: CompanyAccountDetailRow,
): CompanyAccountDetail {
    const { proposal, listing, deletedAt, ...profile } = company;

    return {
        ...toCompanyProfile(profile),
        ...getRating({ proposal, listing }),
        deletedAt: !deletedAt ? null : deletedAt.toISOString(),
    };
}
