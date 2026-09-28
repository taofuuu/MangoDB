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

// US3-2. Picking two names in one group finds Providers with either of them,
// so Web + Mobile widens the list. Each group used narrows it. Case is ignored:
// tech stack is free text, and one Provider types "react", another "React".
function matchesFilters(
    category: string[],
    techStack: string[],
): Prisma.CompanyWhereInput[] {
    const filters: Prisma.CompanyWhereInput[] = [];
    if (category.length > 0) {
        filters.push({
            listing: {
                some: {
                    // Same rule as the result card: job postings don't count.
                    service: { isNot: null },
                    listingCategory: {
                        some: {
                            category: {
                                catName: { in: category, mode: 'insensitive' },
                            },
                        },
                    },
                },
            },
        });
    }
    if (techStack.length > 0) {
        filters.push({
            provider: {
                providerTechStack: {
                    some: {
                        techStackName: { in: techStack, mode: 'insensitive' },
                    },
                },
            },
        });
    }
    return filters;
}

// US3-1. One page of Providers for the search screen. count and findMany run
// in one transaction so the pagination metadata describes the returned page.
export async function listProviders(
    req: Request,
    res: Response,
): Promise<void> {
    const {
        q,
        category = [],
        techStack = [],
        page,
        pageSize,
    } = parseQuery(providerListQuerySchema, req.query);
    // Each word is matched on its own, so "flutter kotlin" finds a Provider
    // whose stack has both, even though they are two separate rows.
    const words = q?.split(/\s+/).filter(Boolean) ?? [];
    // Same rule as ownsProviderRow, by accountType rather than "has a provider
    // row": the shared DB has an ADMIN company that owns one anyway.
    // Search is discovery, so soft-deleted companies stay hidden.
    const where: Prisma.CompanyWhereInput = {
        accountType: { in: ['PROVIDER', 'BOTH'] },
        deletedAt: null,
        // T3.2.6. Keyword words and filters share one AND list, so a Provider
        // must pass all of them. Two AND keys would let one replace the other.
        AND: [
            ...words.map(matchesKeyword),
            ...matchesFilters(category, techStack),
        ],
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
