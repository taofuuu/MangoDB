import type { AccountType, CompanyProfile } from '@mangodb/shared';
import type { Prisma } from '../generated/prisma/client';
import type { UpdateCompanyProfileInput } from '../schemas/company.schema';
import { omitUndefined } from './objects';

// The columns the API may return. Password is absent on purpose: it can't leak
// from a response if it was never fetched.
export const companyProfileSelect = {
    companyId: true,
    companyName: true,
    companyDescription: true,
    username: true,
    email: true,
    contactEmail: true,
    phone: true,
    address: true,
    website: true,
    accountType: true,
    companyType: { select: { companyType: true } },
    // Null for a RECEIVER company, which owns no provider row.
    provider: { select: { serviceTerm: true, warrantyPolicy: true } },
} as const;

// What that select hands back, before toCompanyProfile tidies it.
export interface CompanyProfileRow {
    companyId: number;
    companyName: string;
    companyDescription: string | null;
    username: string;
    email: string;
    contactEmail: string | null;
    phone: string;
    address: string | null;
    website: string | null;
    // A VarChar column, so Prisma types it as string; registerSchema is what
    // guarantees it's one of the three account types.
    accountType: string;
    companyType: { companyType: string }[];
    provider: {
        serviceTerm: string | null;
        warrantyPolicy: string | null;
    } | null;
}

// Flattens the tag join rows to plain strings and the provider row to two
// columns, so callers get one flat object rather than a shape to walk.
export function toCompanyProfile(company: CompanyProfileRow): CompanyProfile {
    const { provider } = company;

    return {
        company_id: company.companyId,
        company_name: company.companyName,
        company_description: company.companyDescription,
        username: company.username,
        email: company.email,
        contact_email: company.contactEmail,
        phone: company.phone,
        address: company.address,
        website: company.website,
        account_type: company.accountType as AccountType,
        company_type: company.companyType.map((tag) => tag.companyType),
        service_term: provider?.serviceTerm ?? null,
        warranty_policy: provider?.warrantyPolicy ?? null,
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
): Prisma.CompanyUpdateInput {
    const { company_type, service_term, warranty_policy } = body;

    return {
        // Listed rather than spread, because the request body is still
        // snake_case and Prisma is now camelCase. This block disappears in the
        // commit that flips the wire — after that a spread works again.
        // omitUndefined, not a plain object: exactOptionalPropertyTypes is on
        // and Prisma's update input declares its columns without `| undefined`.
        ...omitUndefined({
            companyName: body.company_name,
            companyDescription: body.company_description,
            phone: body.phone,
            address: body.address,
            website: body.website,
            contactEmail: body.contact_email,
        }),
        // Tags are a set, not a list to append to: the request carries the
        // whole set, so the rows it replaces go. A nested write is one
        // transaction, so the company is never left untagged.
        ...(company_type && {
            companyType: {
                deleteMany: {},
                create: company_type.map((tag) => ({
                    companyType: tag,
                })),
            },
        }),
        // A second table, same transaction. omitUndefined keeps a body that
        // sent only one of the two from clearing the other.
        //
        // upsert, not update: accountType says the company owns a provider
        // row, but no constraint enforces it, so an imported or hand-edited
        // company can be missing one. update would throw P2025 there, which
        // both callers translate into "not found" for a company that plainly
        // exists. Creating the row is the repair.
        ...(editsProviderFields(body) && {
            provider: {
                upsert: {
                    create: omitUndefined({
                        serviceTerm: service_term,
                        warrantyPolicy: warranty_policy,
                    }),
                    update: omitUndefined({
                        serviceTerm: service_term,
                        warrantyPolicy: warranty_policy,
                    }),
                },
            },
        }),
    };
}
