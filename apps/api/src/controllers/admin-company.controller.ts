import type { Request, Response } from 'express';
import type { CompanyAccountSummary, Paginated } from '@mangodb/shared';
import { assertCurrentPassword } from '../auth/password';
import { ownsProviderRow } from '../auth/roles';
import { prisma } from '../lib/prisma';
import { pageArgs, toPagination } from '../lib/pagination';
import type { Prisma } from '../generated/prisma/client';
import { ApiError } from '../lib/api-error';
import {
    adminCompanyDetailSelect,
    adminCompanyListSelect,
    toCompanyAccountDetail,
    toCompanyAccountSummary,
} from '../lib/admin-company';
import { softDeleteCompany } from '../lib/company-deletion';
import {
    PROVIDER_PROFILE_FIELDS,
    companyProfileUpdateData,
    companyTypeRepeat,
} from '../lib/company-profile';
import { isRecordNotFound } from '../lib/prisma-errors';
import {
    hasOngoingProject,
    ONGOING_PROJECT_BLOCKS_DELETE,
} from '../lib/project-eligibility';
import { escapeLike } from '../lib/search';
import { parseBody, parseParams, parseQuery } from '../middleware/validate';
import {
    companyAccountIdParamSchema,
    companyAccountListQuerySchema,
    deleteCompanyAccountBodySchema,
} from '../schemas/admin-company.schema';
import { updateCompanyProfileSchema } from '../schemas/company.schema';

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
    const keyword = q ? escapeLike(q) : undefined;
    // schema.prisma's rule for deletedAt: a discovery query filters it out.
    // includeDeleted is the opt-out, for an admin auditing removed accounts.
    const where: Prisma.CompanyWhereInput = {
        ...(keyword && {
            OR: [
                { companyName: { contains: keyword, mode: 'insensitive' } },
                {
                    companyDescription: {
                        contains: keyword,
                        mode: 'insensitive',
                    },
                },
                { phone: { contains: keyword, mode: 'insensitive' } },
                { email: { contains: keyword, mode: 'insensitive' } },
            ],
        }),
        accountType: filter
            ? {
                  in: [
                      filter,
                      ...(filter === 'PROVIDER' || filter === 'RECEIVER'
                          ? ['BOTH']
                          : []),
                  ],
              }
            : { not: 'ADMIN' },
        ...(!includeDeleted && {
            deletedAt: null,
        }),
    };
    const [totalItems, companies] = await prisma.$transaction([
        prisma.company.count({ where }),
        prisma.company.findMany({
            ...pageArgs({ page, pageSize }),
            where,
            orderBy: [{ companyName: 'asc' }, { companyId: 'asc' }],
            select: adminCompanyListSelect,
        }),
    ]);

    const body: Paginated<CompanyAccountSummary> = {
        items: companies.map(toCompanyAccountSummary),
        pagination: toPagination(totalItems, { page, pageSize }),
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
        where: { companyId },
        select: adminCompanyDetailSelect,
    });

    if (!company) {
        throw ApiError.notFound('Company account not found');
    }

    res.json(toCompanyAccountDetail(company));
}

// US6-3. An administrator edits another company's account. Profile columns
// only, the same field set PATCH /companies/me accepts: username, email, and
// password are how a company signs in, and each of them is a way to take the
// account over, so handing all three to an administrator would be a takeover
// with no password check anywhere in it. Answers with the same body
// GET /admin/companies/:companyId returns, so the list and the detail panel
// re-render from the response instead of fetching again.
export async function updateCompanyAccount(
    req: Request,
    res: Response,
): Promise<void> {
    // Params before body, like updatePortfolio: a request with both a bad id
    // and a bad body should report the id, or you debug the wrong half.
    const { companyId } = parseParams(companyAccountIdParamSchema, req.params);
    const body = parseBody(updateCompanyProfileSchema, req.body);

    // Read before writing, so an unknown id is a plain 404 rather than a Prisma
    // P2025 surfacing from the middle of the update. It is also the only way to
    // learn the target's accountType, which the next check needs.
    const target = await prisma.company.findUnique({
        where: { companyId },
        select: { accountType: true, deletedAt: true },
    });

    if (!target) {
        throw ApiError.notFound('Company account not found');
    }

    // A soft-deleted account is read-only. 409 rather than the 404
    // deleteCompanyAccount gives: an administrator can still open this row
    // through GET /admin/companies/:companyId, so "not found" would contradict
    // what they are looking at. The row exists; its state forbids the edit.
    if (target.deletedAt !== null) {
        throw ApiError.conflict('Deleted company accounts cannot be edited');
    }

    // The names, not just a yes/no like editsProviderFields: the error below
    // reports one details entry per field the caller actually sent.
    const providerEdits = PROVIDER_PROFILE_FIELDS.filter(
        (field) => field in body,
    );

    // PATCH /companies/me puts this question to roleGrants, which reads the
    // caller's own token. Here the caller is an administrator and that token
    // says nothing about the company being edited, so the question goes to the
    // target row instead. A 400 rather than a 403 because the caller is not
    // refused anything — the two columns simply do not exist on this account,
    // which is a fact about the target, not about the administrator.
    if (providerEdits.length > 0 && !ownsProviderRow(target.accountType)) {
        throw ApiError.badRequest(
            `${target.accountType} companies have no provider details`,
            providerEdits.map((field) => ({
                field,
                message: 'Only a provider company has this field',
            })),
        );
    }

    let company;
    try {
        company = await prisma.company.update({
            // deletedAt again here, not only in the read above: a delete that
            // lands between the two would otherwise be edited anyway.
            where: { companyId, deletedAt: null },
            data: companyProfileUpdateData(body),
            select: adminCompanyDetailSelect,
        });
    } catch (err) {
        const repeat = companyTypeRepeat(err);
        if (repeat) throw repeat;
        // The company was soft-deleted between the lookup above and this
        // write, so the where clause no longer matches. That is the only way
        // to get here: no request path hard-deletes a company, the check
        // above refuses the account types that own no provider row, and the
        // nested write upserts the row for the ones that do but are missing it.
        if (isRecordNotFound(err)) {
            throw ApiError.conflict(
                'Deleted company accounts cannot be edited',
            );
        }
        throw err;
    }

    res.json(toCompanyAccountDetail(company));
}

export async function deleteCompanyAccount(
    req: Request,
    res: Response,
): Promise<void> {
    // Params before body, like updateCompanyAccount: a bad id should report
    // the id, not the password.
    const { companyId } = parseParams(companyAccountIdParamSchema, req.params);

    // US6-4 re-auth: the confirm modal collects the admin's own password to
    // prove intent before an irreversible delete. Checked against req.auth's
    // own row, not the target's — this is "is it really the admin", not
    // anything about the account being removed.
    const { currentPassword } = parseBody(
        deleteCompanyAccountBodySchema,
        req.body,
    );
    await assertCurrentPassword(req.auth!.companyId, currentPassword);

    // Step 1: does the company exist? Same pattern as getCompanyAccountDetail —
    // findUnique, throw ApiError.notFound if null.
    const company = await prisma.company.findUnique({
        where: { companyId },
        select: {
            accountType: true,
            deletedAt: true,
        },
    });

    // Same "deleted = gone" convention as isCompanyDeleted: an already-deleted
    // company 404s here instead of falling through to the eligibility check.
    if (!company || company.deletedAt !== null) {
        throw ApiError.notFound('Company account not found');
    }

    // softDeleteCompany refuses an administrator on its own, so this check is
    // here to explain the refusal, not to enforce it — without it an admin
    // target would fall through to the no-op path below and report a confusing
    // 404. A 400 rather than a 403 for the same reason the provider check above
    // uses one: this is a fact about the target, not a permission the caller is
    // missing.
    if (company.accountType === 'ADMIN') {
        throw ApiError.badRequest('Administrator accounts cannot be deleted');
    }

    // Step 2: is it on an ongoing project? projectEligibility owns that rule
    // and the definition of "ongoing" (not COMPLETED or CANCELLED).
    if (await hasOngoingProject(companyId)) {
        throw ApiError.conflict(ONGOING_PROJECT_BLOCKS_DELETE);
    }

    // Step 3 + 4: soft-delete it, then respond. softDeleteCompany's guard
    // means `false` here only means "already gone" (never existed, or was
    // deleted between Step 1 and here) — Step 1 already ruled out the first
    // case, so this is the race-condition case, reported the same way.
    const wasDeleted = await softDeleteCompany(companyId);
    if (wasDeleted) {
        res.status(204).end();
    } else {
        throw ApiError.notFound('Company account not found');
    }
}
