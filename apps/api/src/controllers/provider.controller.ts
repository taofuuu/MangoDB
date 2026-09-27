import type { Request, Response } from 'express';
import type { ProviderListResponse } from '@mangodb/shared';
import type { Prisma } from '../generated/prisma/client';
import { prisma } from '../lib/prisma';
import { providerSummarySelect, toProviderSummary } from '../lib/provider';
import { parseQuery } from '../middleware/validate';
import { providerListQuerySchema } from '../schemas/provider.schema';

// US3-1. One page of Providers for the search screen. count and findMany run
// in one transaction so the pagination metadata describes the returned page.
export async function listProviders(
    req: Request,
    res: Response,
): Promise<void> {
    const { page, pageSize } = parseQuery(providerListQuerySchema, req.query);
    // Same rule as ownsProviderRow, by accountType rather than "has a provider
    // row": the shared DB has an ADMIN company that owns one anyway.
    // Search is discovery, so soft-deleted companies stay hidden.
    const where: Prisma.CompanyWhereInput = {
        accountType: { in: ['PROVIDER', 'BOTH'] },
        deletedAt: null,
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
