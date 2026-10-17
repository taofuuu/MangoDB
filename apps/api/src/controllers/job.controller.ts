import type { Request, Response } from 'express';
import type { Job, ListingStatus, Paginated } from '@mangodb/shared';
import type { Prisma } from '../generated/prisma/client';
import { prisma } from '../lib/prisma';
import { pageArgs, toPagination } from '../lib/pagination';
import { parseBody, parseParams, parseQuery } from '../middleware/validate';
import { ApiError } from '../lib/api-error';
import { assertCategoriesExist } from '../lib/category';
import { omitUndefined } from '../lib/objects';
import { fromDateOnly } from '../lib/dates';
import {
    assertBudgetRange,
    assertListingOwned,
    assertListingVisible,
    categoryCreate,
    categoryReplace,
    closeOpenListing,
    rejectPendingProposals,
} from '../lib/listing';
import {
    createJobSchema,
    jobIdParamSchema,
    jobListQuerySchema,
    MIN_BUDGET_EXCEEDS_MAX,
    updateJobSchema,
} from '../schemas/job.schema';
import { jobSearchWhere, jobSelect, toJob } from '../lib/job';

// US2-6. Create and publish a job posting.
// Validates body, verifies category existence, and creates listing + job atomically.
export async function createJob(req: Request, res: Response): Promise<void> {
    const body = parseBody(createJobSchema, req.body);
    const companyId = req.auth!.companyId;

    if (body.categoryIds) await assertCategoriesExist(body.categoryIds);

    const created = await prisma.listing.create({
        data: {
            companyId,
            listingTitle: body.listingTitle,
            listingDesc: body.listingDesc,
            minBudget: body.minBudget ?? null,
            maxBudget: body.maxBudget ?? null,
            listingStatus: 'OPEN',
            listingType: 'JOB',
            job: {
                create: {
                    locationPref: body.locationPref ?? null,
                    duration: body.duration ?? null,
                    deadline: body.deadline
                        ? fromDateOnly(body.deadline)
                        : null,
                },
            },
            listingCategory: categoryCreate(body.categoryIds ?? []),
        },
        select: jobSelect,
    });

    res.status(201).json(toJob(created));
}

// US2-7. List job postings filtered by status with visibility rules:
// - OPEN postings are visible to all authenticated companies.
// - CLOSED postings are visible ONLY to their creator/owner (companyId === req.auth.companyId).
export async function listJobs(req: Request, res: Response): Promise<void> {
    const { page, pageSize, status, companyId, q } = parseQuery(
        jobListQuerySchema,
        req.query,
    );
    const where = jobSearchWhere({ status, companyId, q }, req.auth!.companyId);
    const [totalItems, postings] = await prisma.$transaction([
        prisma.listing.count({ where }),
        prisma.listing.findMany({
            where,
            orderBy: [{ createdAt: 'desc' }, { listingId: 'desc' }],
            ...pageArgs({ page, pageSize }),
            select: jobSelect,
        }),
    ]);
    const body: Paginated<Job> = {
        items: postings.map(toJob),
        pagination: toPagination(totalItems, { page, pageSize }),
    };
    res.json(body);
}

//for own job posting
export async function listMyJobs(req: Request, res: Response): Promise<void> {
    const { page, pageSize, status } = parseQuery(
        jobListQuerySchema,
        req.query,
    );

    const companyId = req.auth!.companyId;

    const where: Prisma.ListingWhereInput = {
        listingType: 'JOB',
        companyId,
        ...(status ? { listingStatus: status } : {}),
    };

    const [totalItems, postings] = await prisma.$transaction([
        prisma.listing.count({ where }),
        prisma.listing.findMany({
            where,
            orderBy: [{ createdAt: 'desc' }, { listingId: 'desc' }],
            ...pageArgs({ page, pageSize }),
            select: jobSelect,
        }),
    ]);
    const body: Paginated<Job> = {
        items: postings.map(toJob),
        pagination: toPagination(totalItems, { page, pageSize }),
    };
    res.json(body);
}

// US2-7. Fetch a single job posting by ID with visibility rules:
// - OPEN postings are visible to all authenticated companies.
// - CLOSED postings are visible ONLY to their owner
//   (companyId === req.auth.companyId).
// - Anyone else gets 404 Not Found, the same as for a non-existent ID, a
//   service ID, or a soft-deleted company's posting.
export async function getJob(req: Request, res: Response): Promise<void> {
    const { jobId } = parseParams(jobIdParamSchema, req.params);

    // A soft-deleted company's postings stay in the table, still OPEN, so
    // the where hides them here, the same as in the list.
    const posting = await prisma.listing.findUnique({
        where: {
            listingId: jobId,
            listingType: 'JOB',
            company: { deletedAt: null },
        },
        select: jobSelect,
    });

    res.json(
        toJob(
            assertListingVisible(
                posting,
                req.auth!.companyId,
                'Job posting not found',
            ),
        ),
    );
}

// US2-13. Edit a job posting. Only the owner may, and only while it is Open.
// Send only the fields that change; categoryIds replaces the whole set.
export async function updateJob(req: Request, res: Response): Promise<void> {
    const { jobId } = parseParams(jobIdParamSchema, req.params);
    const body = parseBody(updateJobSchema, req.body);

    // 404 if no such posting, 403 if it is someone else's.
    const existing = await assertListingOwned(
        jobId,
        'JOB',
        req.auth!.companyId,
    );
    // Once closed, Providers' proposals were written against the old details.
    if (existing.listingStatus !== ('OPEN' satisfies ListingStatus)) {
        throw ApiError.conflict('Only an open job posting can be edited');
    }

    assertBudgetRange(existing, body, MIN_BUDGET_EXCEEDS_MAX);

    if (body.categoryIds) await assertCategoriesExist(body.categoryIds);

    // listing holds the scalars. job_requirement and listing_category are
    // child rows, written only when the body touches them.
    const { locationPref, duration, deadline, categoryIds, ...listingFields } =
        body;
    const requirement = omitUndefined({
        locationPref,
        duration,
        deadline: deadline == null ? deadline : fromDateOnly(deadline),
    });

    const updated = await prisma.listing.update({
        where: { listingId: jobId },
        data: {
            ...omitUndefined(listingFields),
            // upsert, not update: an older row may have no requirement row.
            ...(Object.keys(requirement).length > 0
                ? {
                      job: {
                          upsert: { create: requirement, update: requirement },
                      },
                  }
                : {}),
            ...(categoryIds
                ? { listingCategory: categoryReplace(categoryIds) }
                : {}),
        },
        select: jobSelect,
    });

    res.json(toJob(updated));
}

// US2-14. Close a job posting: it stops taking proposals, and every pending
// proposal on it is rejected, in one transaction. Only the owner may, and
// only while it is Open. Answers with the closed posting.
export async function closeJob(req: Request, res: Response): Promise<void> {
    const { jobId } = parseParams(jobIdParamSchema, req.params);

    // 404 if no such posting, 403 if it is someone else's.
    await assertListingOwned(jobId, 'JOB', req.auth!.companyId);

    const closed = await prisma.$transaction(async (tx) => {
        await closeOpenListing(
            tx,
            jobId,
            'Only an open job posting can be closed',
        );
        await rejectPendingProposals(tx, jobId);

        return tx.listing.findUniqueOrThrow({
            where: { listingId: jobId },
            select: jobSelect,
        });
    });

    res.json(toJob(closed));
}
