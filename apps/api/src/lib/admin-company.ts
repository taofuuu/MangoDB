import type {
    AccountType,
    CompanyAccountDetail,
    CompanyAccountSummary,
} from '@mangodb/shared';
import { companyProfileSelect, toCompanyProfile } from './company-profile';
import type { Prisma } from '../generated/prisma/client';
import { getRating, ratingSelect, type RatingSource } from './rating';

export { getRating, ratingSelect, type RatingSource };

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
