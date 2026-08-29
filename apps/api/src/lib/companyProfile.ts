import type { AccountType, CompanyProfile } from '@mangodb/shared';

// The company columns the API returns. Naming them explicitly is what keeps
// the password hash out of every response — an omission cannot leak it.
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

// account_type is a plain VarChar in the schema, so Prisma hands it back as a
// string; the enum the request was validated against is what makes narrowing
// it safe.
export type CompanyProfileRow = Omit<
    CompanyProfile,
    'account_type' | 'company_type'
> & {
    account_type: string;
    company_type: { company_type: string }[];
};

// Flattens the company_type join rows to plain tags.
export function toCompanyProfile(company: CompanyProfileRow): CompanyProfile {
    return {
        ...company,
        account_type: company.account_type as AccountType,
        company_type: company.company_type.map((tag) => tag.company_type),
    };
}
