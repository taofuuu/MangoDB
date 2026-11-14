import type {
    ListingType,
    ProjectStatus,
    ReviewSummary,
} from '@mangodb/shared';
import type { Prisma } from '../generated/prisma/client';

const COMPLETED = 'COMPLETED' satisfies ProjectStatus;

// One proposal's project review, if it has one.
export const reviewScoresSelect = {
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
export const ratingSelect = {
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

export interface ReviewScores {
    workQualityScore: number;
    serviceScore: number;
    valueForMoneyScore: number;
    deliveryTimeScore: number;
}

export interface ReviewScoresRow {
    project: { review: ReviewScores | null } | null;
}

export interface RatingSource {
    proposal: ReviewScoresRow[];
    listing: { proposal: ReviewScoresRow[] }[];
}

// The mean of every score in these reviews, to one decimal place, or null for
// none. A Provider's rating and one project's rating both use it (ADR 0018).
export function averageScore(reviews: ReviewScores[]): number | null {
    if (reviews.length === 0) return null;
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
    return Math.round((total / (reviews.length * 4)) * 10) / 10;
}

// A Provider's rating. ratingCount is the number of reviews, not of scores
// (ADR 0018, T5.1.3).
export function getRating(source: RatingSource): ReviewSummary {
    const reviews = [
        ...source.proposal,
        ...source.listing.flatMap((listing) => listing.proposal),
    ]
        .map(({ project }) => project?.review)
        .filter((review) => review != null);

    return {
        averageRating: averageScore(reviews),
        ratingCount: reviews.length,
    };
}
