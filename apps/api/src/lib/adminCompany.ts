import type {
    AccountType,
    CompanyAccountDetail,
    CompanyAccountSummary,
} from '@mangodb/shared';
import { companyProfileSelect, toCompanyProfile } from './companyProfile';
import {
    companyRatingSelect,
    getCompanyRating,
    type CompanyRatingSource,
} from './companyRating';

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
    ...companyRatingSelect,
} as const;

export const adminCompanyDetailSelect = {
    ...companyProfileSelect,
    ...companyRatingSelect,
    deletedAt: true,
} as const;

interface CompanyAccountSummaryRow extends CompanyRatingSource {
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
        ...getCompanyRating(company),
    };
}

type CompanyAccountDetailRow = Parameters<typeof toCompanyProfile>[0] &
    CompanyRatingSource & { deletedAt: Date | null };

export function toCompanyAccountDetail(
    company: CompanyAccountDetailRow,
): CompanyAccountDetail {
    const { proposal, deletedAt, ...profile } = company;

    return {
        ...toCompanyProfile(profile),
        ...getCompanyRating({ proposal }),
        deletedAt: !deletedAt ? null : deletedAt.toISOString(),
    };
}
