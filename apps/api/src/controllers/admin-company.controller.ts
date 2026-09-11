import type { Request, Response } from 'express';
import type { CompanyAccountListResponse } from '@mangodb/shared';
import { prisma } from '../lib/prisma';
import type { Prisma } from '../generated/prisma/client';
import { ApiError } from '../lib/ApiError';
import {
    adminCompanyDetailSelect,
    adminCompanyListSelect,
    toCompanyAccountDetail,
    toCompanyAccountSummary,
} from '../lib/adminCompany';
import { parseParams, parseQuery } from '../middleware/validate';
import {
    companyAccountIdParamSchema,
    companyAccountListQuerySchema,
} from '../schemas/admin-company.schema';

// US6-2. Fetch one stable, alphabetically ordered page. count and findMany run
// in one transaction so the pagination metadata describes the returned page.
export async function listCompanyAccounts(
    req: Request,
    res: Response,
): Promise<void> {
    const { page, pageSize, q, filter, includeDeleted } = parseQuery(
        companyAccountListQuerySchema,
        req.query,
    );
    const skip = (page - 1) * pageSize;
    // schema.prisma's rule for deleted_at: a discovery query filters it out.
    // includeDeleted is the opt-out, for an admin auditing removed accounts.
    const where: Prisma.companyWhereInput = {
        ...(q && {
            OR: [
                { company_name: { contains: q, mode: 'insensitive' } },
                { company_description: { contains: q, mode: 'insensitive' } },
                { phone: { contains: q, mode: 'insensitive' } },
                { email: { contains: q, mode: 'insensitive' } },
            ],
        }),
        ...(filter && {
            account_type: {
                in: [
                    filter,
                    ...(filter === 'PROVIDER' || filter === 'RECEIVER'
                        ? ['BOTH']
                        : []),
                ],
            },
        }),
        ...(!includeDeleted && {
            deleted_at: null,
        }),
    };
    const [totalItems, companies] = await prisma.$transaction([
        prisma.company.count({ where }),
        prisma.company.findMany({
            skip,
            where,
            take: pageSize,
            orderBy: [{ company_name: 'asc' }, { company_id: 'asc' }],
            select: adminCompanyListSelect,
        }),
    ]);

    const body: CompanyAccountListResponse = {
        items: companies.map(toCompanyAccountSummary),
        pagination: {
            page,
            page_size: pageSize,
            total_items: totalItems,
            total_pages: Math.ceil(totalItems / pageSize),
        },
    };

    res.json(body);
}

// US6-2. Private contact fields are fetched only for the selected account and
// only after adminRoutes has authenticated and authorized the caller.
export async function getCompanyAccountDetail(
    req: Request,
    res: Response,
): Promise<void> {
    const { companyId } = parseParams(companyAccountIdParamSchema, req.params);
    const company = await prisma.company.findUnique({
        where: { company_id: companyId },
        select: adminCompanyDetailSelect,
    });

    if (!company) {
        throw ApiError.notFound('Company account not found');
    }

    res.json(toCompanyAccountDetail(company));
}
