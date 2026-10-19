import type { Request, Response } from 'express';
import type { CompanySummary, Paginated } from '@mangodb/shared';
import { assertCurrentPassword, hashPassword } from '../auth/password';
import { roleGrants } from '../auth/roles';
import { revokeToken } from '../auth/tokenDenylist';
import type { Prisma } from '../generated/prisma/client';
import { prisma } from '../lib/prisma';
import { pageArgs, toPagination } from '../lib/pagination';
import { ApiError } from '../lib/api-error';
import { softDeleteCompany } from '../lib/company-deletion';
import {
    companyProfileSelect,
    companyProfileUpdateData,
    companyTypeRepeat,
    editsProviderFields,
    publicCompanyProfileSelect,
    toCompanyProfile,
    toPublicCompanyProfile,
} from '../lib/company-profile';
import {
    assertCompanyIdentityAvailable,
    identityConflict,
} from '../lib/company-identity';
import {
    companyKeywordWhere,
    companySummarySelect,
    toCompanySummary,
} from '../lib/company-search';
import { omitUndefined } from '../lib/objects';
import { isRecordNotFound } from '../lib/prisma-errors';
import {
    hasOngoingProject,
    ONGOING_PROJECT_BLOCKS_DELETE,
} from '../lib/project-eligibility';
import { splitWords } from '../lib/search';
import { sendSession } from '../lib/session';
import { BUCKETS, removeFromStorageByUrl } from '../lib/storage';
import { saveWithUpload } from '../lib/upload';
import { requireFile } from '../middleware/upload';
import { parseBody, parseParams, parseQuery } from '../middleware/validate';
import {
    changeCredentialsSchema,
    companyIdParamSchema,
    companyListQuerySchema,
    updateCompanyProfileSchema,
} from '../schemas/company.schema';

// US1-4. Read fresh, not echoed from the claims: an edit in another session
// has to show up here.
export async function getMyProfile(req: Request, res: Response): Promise<void> {
    const company = await prisma.company.findUnique({
        where: { companyId: req.auth!.companyId },
        select: companyProfileSelect,
    });

    // Token verified, so the row existed once — a company deleted mid-session.
    if (!company) {
        throw ApiError.notFound('Company not found');
    }

    res.json(toCompanyProfile(company));
}

// Another company's profile, without the username and email it signs in with.
// Unknown, soft-deleted, and admin accounts all answer the same 404, so the
// route cannot tell a caller which of the three an id is.
export async function getCompanyProfile(
    req: Request,
    res: Response,
): Promise<void> {
    const { companyId } = parseParams(companyIdParamSchema, req.params);
    // findFirst, not findUnique: the two extra conditions are not part of a
    // unique key.
    const company = await prisma.company.findFirst({
        where: { companyId, deletedAt: null, accountType: { not: 'ADMIN' } },
        select: publicCompanyProfileSelect,
    });

    if (!company) {
        throw ApiError.notFound('Company not found');
    }

    res.json(toPublicCompanyProfile(company));
}

// US1-5. Partial by design: an absent field leaves its column alone, and null
// clears one that is nullable. Answers with the whole profile, in the shape
// getMyProfile returns, so the form can render the saved state without a
// second request.
export async function updateMyProfile(
    req: Request,
    res: Response,
): Promise<void> {
    const body = parseBody(updateCompanyProfileSchema, req.body);
    const companyId = req.auth!.companyId;

    // roleGrants rather than role === 'provider': a BOTH company is a provider
    // too, and owns the row these columns live on. US6-3's administrator edit
    // asks the same question of the *target* company instead, because an admin
    // token says nothing about the company being edited.
    if (
        editsProviderFields(body) &&
        !roleGrants(req.auth!.role).includes('provider')
    ) {
        throw ApiError.forbidden(
            'Only a provider company has service terms and a warranty policy',
        );
    }

    let company;
    try {
        company = await prisma.company.update({
            where: { companyId },
            data: companyProfileUpdateData(body),
            select: companyProfileSelect,
        });
    } catch (err) {
        const repeat = companyTypeRepeat(err);
        if (repeat) throw repeat;
        // The company was deleted mid-session — its token is still valid. A
        // missing provider row cannot land here any more: the nested write
        // upserts it.
        if (isRecordNotFound(err)) {
            throw ApiError.notFound('Company not found');
        }
        throw err;
    }

    res.json(toCompanyProfile(company));
}

// The three fields a company signs in with. Each of them is a way to take the
// account over — move the email and you own the login, change the password and
// the owner is locked out — so all three sit behind the current password rather
// than behind a token alone. Answers with a company and a fresh token, because
// it revokes the one it was called with.
export async function changeMyCredentials(
    req: Request,
    res: Response,
): Promise<void> {
    const body = parseBody(changeCredentialsSchema, req.body);
    const companyId = req.auth!.companyId;
    const { currentPassword, newPassword, ...identity } = body;

    await assertCurrentPassword(companyId, currentPassword);

    // Reports both collisions at once; an index only fails on the first. The
    // caller's own row is excluded, or resubmitting your own email would 409.
    await assertCompanyIdentityAvailable(identity, companyId);

    let company;
    try {
        company = await prisma.company.update({
            where: { companyId },
            data: {
                ...omitUndefined(identity),
                // Hashed on the way in. The plaintext reaches nothing else.
                ...(newPassword
                    ? { password: await hashPassword(newPassword) }
                    : {}),
            },
            select: companyProfileSelect,
        });
    } catch (err) {
        // Another company can take the name between the check and the write.
        const conflict = identityConflict(err);
        if (conflict) throw conflict;
        if (isRecordNotFound(err)) {
            throw ApiError.notFound('Company not found');
        }
        throw err;
    }

    // After the write, never before: a wrong password or a 409 must not cost
    // the caller its session. Revoking the presented jti is the only revocation
    // this codebase can do — there is no per-company token version — so it ends
    // any copy of this token and nothing else.
    await revokeToken(req.auth!.jti, req.auth!.exp);

    // Replaces the cookie as well as the body. The token just revoked is the
    // one the browser is holding, so skipping this would sign the caller out
    // the moment they changed their own email.
    sendSession(res, toCompanyProfile(company));
}

// US1-5, the photo half. Its own route rather than a field on PATCH /me,
// for the same reason /me/credentials is separate: that body is JSON, and a
// file cannot travel in one. Multipart would also cost /me its three-state
// body — absent, null, value — because every multipart field is a string.
//
// Answers with the whole profile, like PATCH /me, so the page can re-render
// from one response.
export async function updateMyPhoto(
    req: Request,
    res: Response,
): Promise<void> {
    const companyId = req.auth!.companyId;

    const file = requireFile(req.file, 'photo');

    // Read first, for the old URL to clean up afterwards and so a deleted
    // company is a plain 404 rather than a P2025 out of the update.
    const existing = await prisma.company.findUnique({
        where: { companyId },
        select: { companyPhoto: true },
    });

    if (!existing) {
        throw ApiError.notFound('Company not found');
    }

    // The new photo replaces the old one, and saveWithUpload removes
    // whichever file ends up unreferenced.
    const company = await saveWithUpload(
        file,
        BUCKETS.PROFILE,
        'companies',
        (companyPhoto) =>
            prisma.company.update({
                where: { companyId },
                data: { companyPhoto },
                select: companyProfileSelect,
            }),
        existing.companyPhoto,
    );

    res.json(toCompanyProfile(company));
}

// Clearing the photo, which the upload route cannot express: multipart has no
// way to send "no file" that is distinguishable from forgetting to attach one.
export async function deleteMyPhoto(
    req: Request,
    res: Response,
): Promise<void> {
    const companyId = req.auth!.companyId;

    const existing = await prisma.company.findUnique({
        where: { companyId },
        select: { companyPhoto: true },
    });

    if (!existing) {
        throw ApiError.notFound('Company not found');
    }

    const company = await prisma.company.update({
        where: { companyId },
        data: { companyPhoto: null },
        select: companyProfileSelect,
    });

    // Only after the column stopped pointing at it. Best-effort, matching the
    // certificate and portfolio deletes: the row is correct either way.
    if (existing.companyPhoto) {
        await removeFromStorageByUrl(existing.companyPhoto, BUCKETS.PROFILE);
    }

    res.json(toCompanyProfile(company));
}

// US1-6. Coordinates the existing eligibility and soft-delete layers without
// owning either rule. Session invalidation and deleted-account login blocking
// are integrated by their separately assigned US1-6 task.
export async function deleteMyAccount(
    req: Request,
    res: Response,
): Promise<void> {
    const companyId = req.auth!.companyId;

    if (await hasOngoingProject(companyId)) {
        throw ApiError.conflict(ONGOING_PROJECT_BLOCKS_DELETE);
    }

    await softDeleteCompany(companyId);
    res.status(204).end();
}

// T3.6.7. One page of companies for the search screen, Providers and Receivers
// alike. count and findMany run in one transaction so the pagination metadata
// describes the returned page.
export async function listCompanies(
    req: Request,
    res: Response,
): Promise<void> {
    const { q, orderBy, page, pageSize } = parseQuery(
        companyListQuerySchema,
        req.query,
    );
    // "flutter kotlin" finds a Provider whose stack has both, even though
    // they are two separate rows.
    const words = splitWords(q);
    // Every company but admins, same rule as GET /admin/companies. Search is
    // discovery, so soft-deleted companies stay hidden.
    const where: Prisma.CompanyWhereInput = {
        accountType: { not: 'ADMIN' },
        deletedAt: null,
        ...(words.length > 0 && { AND: words.map(companyKeywordWhere) }),
    };
    const [totalItems, companies] = await prisma.$transaction([
        prisma.company.count({ where }),
        prisma.company.findMany({
            where,
            ...pageArgs({ page, pageSize }),
            // companyId breaks ties, so two same-named companies never swap
            // places between pages.
            orderBy: [
                { companyName: orderBy === 'nameDesc' ? 'desc' : 'asc' },
                { companyId: orderBy === 'nameDesc' ? 'desc' : 'asc' },
            ],
            select: companySummarySelect,
        }),
    ]);

    const body: Paginated<CompanySummary> = {
        items: companies.map(toCompanySummary),
        pagination: toPagination(totalItems, { page, pageSize }),
    };

    res.json(body);
}
