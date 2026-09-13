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
                    rating: { select: { ratingScore: true } },
                },
            },
        },
    },
} as const;

export const adminCompanyListSelect = {
    companyId: true,
    companyName: true,
    companyDescription: true,
    phone: true,
    accountType: true,
    deletedAt: true,
    ...ratingSelect,
} as const;

export const adminCompanyDetailSelect = {
    ...companyProfileSelect,
    ...ratingSelect,
    deletedAt: true,
} as const;

interface RatingSource {
    proposal: {
        project: {
            rating: { ratingScore: unknown }[];
        } | null;
    }[];
}

function getRating(source: RatingSource): {
    average_rating: number | null;
    rating_count: number;
} {
    const scores = source.proposal.flatMap(
        ({ project }) =>
            project?.rating.map(({ ratingScore }) => Number(ratingScore)) ?? [],
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
        company_id: company.companyId,
        company_name: company.companyName,
        company_description: company.companyDescription,
        phone: company.phone,
        account_type: company.accountType as AccountType,
        deleted_at: !company.deletedAt ? null : company.deletedAt.toISOString(),
        ...getRating(company),
    };
}

type CompanyAccountDetailRow = Parameters<typeof toCompanyProfile>[0] &
    RatingSource & { deletedAt: Date | null };

export function toCompanyAccountDetail(
    company: CompanyAccountDetailRow,
): CompanyAccountDetail {
    const { proposal, deletedAt, ...profile } = company;

    return {
        ...toCompanyProfile(profile),
        ...getRating({ proposal }),
        deleted_at: !deletedAt ? null : deletedAt.toISOString(),
    };
}
