import type {
    CompanyBrief,
    CompanyReview,
    ListingType,
    Review,
} from '@mangodb/shared';
import type { Prisma } from '../generated/prisma/client';
import { companyBriefSelect, toCompanyBrief } from './company-profile';

// US5-1, ADR 0018. A completed project's review.
export const reviewSelect = {
    reviewId: true,
    projectId: true,
    workQualityScore: true,
    serviceScore: true,
    valueForMoneyScore: true,
    deliveryTimeScore: true,
    comment: true,
    createdAt: true,
} as const satisfies Prisma.ReviewSelect;

export type ReviewRow = {
    reviewId: number;
    projectId: number;
    workQualityScore: number;
    serviceScore: number;
    valueForMoneyScore: number;
    deliveryTimeScore: number;
    comment: string | null;
    createdAt: Date;
};

// Date does not survive JSON as the frontend expects, so createdAt is converted
// to an ISO timestamp string per conventions section 10.
export function toReview(row: ReviewRow): Review {
    return {
        reviewId: row.reviewId,
        projectId: row.projectId,
        workQualityScore: row.workQualityScore,
        serviceScore: row.serviceScore,
        valueForMoneyScore: row.valueForMoneyScore,
        deliveryTimeScore: row.deliveryTimeScore,
        comment: row.comment,
        createdAt: row.createdAt.toISOString(),
    };
}

// US5-2. Reviews on a Provider's completed projects, with the Receiver that
// wrote each one.
export const companyReviewSelect = {
    ...reviewSelect,
    project: {
        select: {
            proposal: {
                select: {
                    senderId: true,
                    sender: { select: companyBriefSelect },
                    listing: {
                        select: {
                            listingType: true,
                            companyId: true,
                            company: { select: companyBriefSelect },
                        },
                    },
                },
            },
        },
    },
} as const satisfies Prisma.ReviewSelect;

export type CompanyReviewRow = ReviewRow & {
    project: {
        proposal: {
            senderId: number;
            sender: CompanyBrief;
            listing: {
                listingType: string;
                companyId: number | null;
                company: CompanyBrief | null;
            };
        };
    };
};

// Maps a review and identifies the Receiver: on a Job the Receiver is the
// listing owner; on a Service the Receiver is the proposal sender (ADR 0016).
export function toCompanyReview(row: CompanyReviewRow): CompanyReview {
    const { project, ...review } = row;
    const isJob =
        project.proposal.listing.listingType === ('JOB' satisfies ListingType);
    const receiverRow = isJob
        ? project.proposal.listing.company
        : project.proposal.sender;

    return {
        ...toReview(review),
        receiver: toCompanyBrief(receiverRow),
    };
}
