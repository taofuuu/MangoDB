import type {
    AccountType,
    CompanyAccountDetail,
    CompanyAccountSummary,
} from '@mangodb/shared';
import { companyProfileSelect, toCompanyProfile } from './companyProfile';

const ratingSelect = {
    proposal: {
        select: {
            project: {
                select: {
                    rating: { select: { rating_score: true } },
                },
            },
        },
    },
} as const;

export const adminCompanyListSelect = {
    company_id: true,
    company_name: true,
    company_description: true,
    phone: true,
    account_type: true,
    deleted_at: true,
    ...ratingSelect,
} as const;

export const adminCompanyDetailSelect = {
    ...companyProfileSelect,
    ...ratingSelect,
    deleted_at: true,
} as const;

interface RatingSource {
    proposal: {
        project: {
            rating: { rating_score: unknown }[];
        } | null;
    }[];
}

function getRating(source: RatingSource): {
    average_rating: number | null;
    rating_count: number;
} {
    const scores = source.proposal.flatMap(
        ({ project }) =>
            project?.rating.map(({ rating_score }) => Number(rating_score)) ??
            [],
    );

    if (scores.length === 0) {
        return { average_rating: null, rating_count: 0 };
    }

    const average =
        scores.reduce((sum, score) => sum + score, 0) / scores.length;

    return {
        average_rating: Math.round(average * 10) / 10,
        rating_count: scores.length,
    };
}

interface CompanyAccountSummaryRow extends RatingSource {
    company_id: number;
    company_name: string;
    company_description: string | null;
    phone: string;
    account_type: string;
    deleted_at: Date | null;
}

export function toCompanyAccountSummary(
    company: CompanyAccountSummaryRow,
): CompanyAccountSummary {
    return {
        company_id: company.company_id,
        company_name: company.company_name,
        company_description: company.company_description,
        phone: company.phone,
        account_type: company.account_type as AccountType,
        deleted_at: !company.deleted_at
            ? null
            : company.deleted_at.toISOString(),
        ...getRating(company),
    };
}

type CompanyAccountDetailRow = Parameters<typeof toCompanyProfile>[0] &
    RatingSource & { deleted_at: Date | null };

export function toCompanyAccountDetail(
    company: CompanyAccountDetailRow,
): CompanyAccountDetail {
    const { proposal, deleted_at, ...profile } = company;

    return {
        ...toCompanyProfile(profile),
        ...getRating({ proposal }),
        deleted_at: !deleted_at ? null : deleted_at.toISOString(),
    };
}
