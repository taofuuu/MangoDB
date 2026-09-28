import type { Request, Response } from 'express';
import type { ProviderListResponse } from '@mangodb/shared';
import type { Prisma } from '../generated/prisma/client';
import { prisma } from '../lib/prisma';
import { providerSummarySelect, toProviderSummary } from '../lib/provider';
import { parseQuery } from '../middleware/validate';
import { providerListQuerySchema } from '../schemas/provider.schema';

// T3.1.8. One word matches the company, one of its services, or its tech
// stack, ignoring case. Job postings are left out: they say what the company
// wants to hire, not what it offers.
function matchesKeyword(word: string): Prisma.CompanyWhereInput {
    // Prisma passes % and _ through as LIKE wildcards, so "%" alone would
    // match every Provider. The backslash makes them plain characters.
    const literal = word.replace(/[\\%_]/g, '\\$&');
    const contains = { contains: literal, mode: 'insensitive' } as const;
    return {
        OR: [
            { companyName: contains },
            { companyDescription: contains },
            {
                listing: {
                    some: {
                        service: { isNot: null },
                        OR: [
                            { listingTitle: contains },
                            { listingDesc: contains },
                            {
                                listingCategory: {
                                    some: { category: { catName: contains } },
                                },
                            },
                        ],
                    },
                },
            },
            {
                provider: {
                    providerTechStack: { some: { techStackName: contains } },
                },
            },
        ],
    };
}

// US3-1. One page of Providers for the search screen. count and findMany run
// in one transaction so the pagination metadata describes the returned page.
export async function listProviders(
    req: Request,
    res: Response,
): Promise<void> {
    const { q, page, pageSize } = parseQuery(
        providerListQuerySchema,
        req.query,
    );
    // Each word is matched on its own, so "flutter kotlin" finds a Provider
    // whose stack has both, even though they are two separate rows.
    const words = q?.split(/\s+/).filter(Boolean) ?? [];
    // Same rule as ownsProviderRow, by accountType rather than "has a provider
    // row": the shared DB has an ADMIN company that owns one anyway.
    // Search is discovery, so soft-deleted companies stay hidden.
    const where: Prisma.CompanyWhereInput = {
        accountType: { in: ['PROVIDER', 'BOTH'] },
        deletedAt: null,
        ...(words.length > 0 && { AND: words.map(matchesKeyword) }),
    };
    const [totalItems, companies] = await prisma.$transaction([
        prisma.company.count({ where }),
        prisma.company.findMany({
            where,
            skip: (page - 1) * pageSize,
            take: pageSize,
            // companyId breaks ties, so two same-named companies never swap
            // places between pages.
            orderBy: [{ companyName: 'asc' }, { companyId: 'asc' }],
            select: providerSummarySelect,
        }),
    ]);

    const body: ProviderListResponse = {
        items: companies.map(toProviderSummary),
        pagination: {
            page,
            pageSize,
            totalItems,
            totalPages: Math.ceil(totalItems / pageSize),
        },
    };

    res.json(body);
}
