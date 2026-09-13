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
    averageRating: number | null;
    ratingCount: number;
} {
    const scores = source.proposal.flatMap(
        ({ project }) =>
            project?.rating.map(({ ratingScore }) => Number(ratingScore)) ?? [],
    );

    if (scores.length === 0) {
        return { averageRating: null, ratingCount: 0 };
    }

    const average =
        scores.reduce((sum, score) => sum + score, 0) / scores.length;

    return {
        averageRating: Math.round(average * 10) / 10,
        ratingCount: scores.length,
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
    const { proposal, deletedAt, ...profile } = company;

    return {
        ...toCompanyProfile(profile),
        ...getRating({ proposal }),
        deletedAt: !deletedAt ? null : deletedAt.toISOString(),
    };
}
