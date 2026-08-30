import type { AccountType, CompanyProfile } from '@mangodb/shared';

// The columns the API may return. Password is absent on purpose: it can't leak
// from a response if it was never fetched.
export const companyProfileSelect = {
    company_id: true,
    company_name: true,
    company_description: true,
    username: true,
    email: true,
    phone: true,
    address: true,
    website: true,
    account_type: true,
    company_type: { select: { company_type: true } },
} as const;

// What that select hands back, before toCompanyProfile tidies it.
export interface CompanyProfileRow {
    company_id: number;
    company_name: string;
    company_description: string | null;
    username: string;
    email: string;
    phone: string;
    address: string | null;
    website: string | null;
    // A VarChar column, so Prisma types it as string; registerSchema is what
    // guarantees it's one of the three account types.
    account_type: string;
    company_type: { company_type: string }[];
}

// Flattens the tag join rows to plain strings.
export function toCompanyProfile(company: CompanyProfileRow): CompanyProfile {
    return {
        ...company,
        account_type: company.account_type as AccountType,
        company_type: company.company_type.map((tag) => tag.company_type),
    };
}
