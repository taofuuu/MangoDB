import type { AccountType, CompanyProfile } from '@mangodb/shared';

// The columns the API may return. Password is absent on purpose: it can't leak
// from a response if it was never fetched.
export const companyProfileSelect = {
    company_id: true,
    company_name: true,
    company_description: true,
    username: true,
    email: true,
    contact_email: true,
    phone: true,
    address: true,
    website: true,
    account_type: true,
    company_type: { select: { company_type: true } },
    // Null for a RECEIVER company, which owns no provider row.
    provider: { select: { service_term: true, warranty_policy: true } },
} as const;

// What that select hands back, before toCompanyProfile tidies it.
export interface CompanyProfileRow {
    company_id: number;
    company_name: string;
    company_description: string | null;
    username: string;
    email: string;
    contact_email: string | null;
    phone: string;
    address: string | null;
    website: string | null;
    // A VarChar column, so Prisma types it as string; registerSchema is what
    // guarantees it's one of the three account types.
    account_type: string;
    company_type: { company_type: string }[];
    provider: {
        service_term: string | null;
        warranty_policy: string | null;
    } | null;
}

// Flattens the tag join rows to plain strings and the provider row to two
// columns, so callers get one flat object rather than a shape to walk.
export function toCompanyProfile(company: CompanyProfileRow): CompanyProfile {
    // provider is pulled out of the spread on purpose: leaving it in would put
    // the nested row in the response alongside the flattened columns.
    const { provider, ...rest } = company;

    return {
        ...rest,
        account_type: company.account_type as AccountType,
        company_type: company.company_type.map((tag) => tag.company_type),
        service_term: provider?.service_term ?? null,
        warranty_policy: provider?.warranty_policy ?? null,
    };
}
