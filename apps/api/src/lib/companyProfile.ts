import type { AccountType, CompanyProfile } from '@mangodb/shared';
import type { Prisma } from '../generated/prisma/client';
import type { UpdateCompanyProfileInput } from '../schemas/company.schema';
import { omitUndefined } from './objects';

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

// The two profile columns that live on `provider` rather than on `company`.
// Named once so the schema, the write, and the error that reports them cannot
// disagree about which fields are provider-only.
export const PROVIDER_PROFILE_FIELDS = [
    'service_term',
    'warranty_policy',
] as const;

// `in`, not a truthiness check: zod drops absent keys, so this is the one way
// to tell "left alone" from an explicit null that means "clear it".
export function editsProviderFields(body: UpdateCompanyProfileInput): boolean {
    return PROVIDER_PROFILE_FIELDS.some((field) => field in body);
}

// US1-5 and US6-3 write the same columns — a company editing itself, and an
// administrator editing that company — so the shape of the write lives here
// rather than being copied into a second controller. It builds the `data` and
// stops there: each caller picks its own select, because the two answer with
// different bodies.
//
// Whether the caller is *allowed* to send the provider fields is deliberately
// not decided here: US1-5 asks the caller's token, US6-3 asks the target row,
// and those are two different questions with two different answers.
export function companyProfileUpdateData(
    body: UpdateCompanyProfileInput,
): Prisma.companyUpdateInput {
    const { company_type, service_term, warranty_policy, ...columns } = body;

    return {
        // omitUndefined, not a plain spread: exactOptionalPropertyTypes is on
        // and Prisma's update input declares its columns without `| undefined`.
        ...omitUndefined(columns),
        // Tags are a set, not a list to append to: the request carries the
        // whole set, so the rows it replaces go. A nested write is one
        // transaction, so the company is never left untagged.
        ...(company_type && {
            company_type: {
                deleteMany: {},
                create: company_type.map((tag) => ({
                    company_type: tag,
                })),
            },
        }),
        // A second table, same transaction. omitUndefined keeps a body that
        // sent only one of the two from clearing the other.
        ...(editsProviderFields(body) && {
            provider: {
                update: omitUndefined({
                    service_term,
                    warranty_policy,
                }),
            },
        }),
    };
}
