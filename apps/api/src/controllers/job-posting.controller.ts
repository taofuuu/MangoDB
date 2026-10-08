import type { Request, Response } from 'express';
import type {
    ListingStatus,
    ProposalStatus,
    JobPostingListResponse,
} from '@mangodb/shared';
import type { Prisma } from '../generated/prisma/client';
import { prisma } from '../lib/prisma';
import { parseBody, parseParams, parseQuery } from '../middleware/validate';
import { ApiError } from '../lib/ApiError';
import { omitUndefined } from '../lib/objects';
import {
    createJobPostingSchema,
    jobPostingIdParamSchema,
    jobPostingListQuerySchema,
    MIN_BUDGET_EXCEEDS_MAX,
    minBudgetDoesNotExceedMax,
    updateJobPostingSchema,
} from '../schemas/job-posting.schema';
import {
    assertCategoriesExist,
    assertJobPostingOwned,
    jobPostingSelect,
    toJobPosting,
} from '../lib/jobPosting';

// US2-6. Create and publish a job posting.
// Validates body, verifies category existence, and creates listing + jobRequirement atomically.
export async function createJobPosting(
    req: Request,
    res: Response,
): Promise<void> {
    const body = parseBody(createJobPostingSchema, req.body);
    const companyId = req.auth!.companyId;

    if (body.categoryIds) await assertCategoriesExist(body.categoryIds);

    const created = await prisma.listing.create({
        data: {
            companyId,
            listingTitle: body.listingTitle,
            listingDesc: body.listingDesc,
            minBudget: body.minBudget ?? null,
            maxBudget: body.maxBudget,
            listingStatus: 'OPEN',
            listingType: 'JOB',
            jobRequirement: {
                create: {
                    locationPref: body.locationPref ?? null,
                    duration: body.duration ?? null,
                    deadline: body.deadline
                        ? new Date(`${body.deadline}T00:00:00Z`)
                        : null,
                },
            },
            ...(body.categoryIds && body.categoryIds.length > 0
                ? {
                      listingCategory: {
                          create: [...new Set(body.categoryIds)].map(
                              (catId) => ({
                                  catId,
                              }),
                          ),
                      },
                  }
                : {}),
        },
        select: jobPostingSelect,
    });

    res.status(201).json(toJobPosting(created));
}

// US2-7. List job postings filtered by status with visibility rules:
// - OPEN postings are visible to all authenticated companies.
// - CLOSED postings are visible ONLY to their creator/owner (companyId === req.auth.companyId).
export async function listJobPostings(
    req: Request,
    res: Response,
): Promise<void> {
    const { page, pageSize, status, companyId, q } = parseQuery(
        jobPostingListQuerySchema,
        req.query,
    );
    const callerCompanyId = req.auth!.companyId;

    const where: Prisma.ListingWhereInput = {
        AND: [
            // 1. Base rule: only query job postings, never services
            { listingType: 'JOB' },

            // 2. Query filters
            ...(status
                ? [
                      {
                          listingStatus: status,
                      },
                  ]
                : []),
            ...(companyId ? [{ companyId }] : []),
            // Search is discovery, so soft-deleted companies' postings stay hidden
            { company: { deletedAt: null } },
            ...(q
                ? [
                      {
                          OR: [
                              {
                                  listingTitle: {
                                      contains: q,
                                      mode: 'insensitive' as Prisma.QueryMode,
                                  },
                              },
                              {
                                  listingDesc: {
                                      contains: q,
                                      mode: 'insensitive' as Prisma.QueryMode,
                                  },
                              },
                          ],
                      },
                  ]
                : []),

            // 3. Visibility rules: callers can only see OPEN postings
            // or postings they created themselves
            {
                OR: [
                    {
                        listingStatus: 'OPEN' satisfies ListingStatus,
                    },
                    { companyId: callerCompanyId },
                ],
            },
        ],
    };
    const [totalItems, postings] = await prisma.$transaction([
        prisma.listing.count({ where }),
        prisma.listing.findMany({
            where,
            orderBy: [{ createdAt: 'desc' }, { listingId: 'desc' }],
            skip: (page - 1) * pageSize,
            take: pageSize,
            select: jobPostingSelect,
        }),
    ]);
    const body: JobPostingListResponse = {
        items: postings.map(toJobPosting),
        pagination: {
            page,
            pageSize,
            totalItems,
            totalPages: Math.ceil(totalItems / pageSize),
        },
    };
    res.json(body);
}

//for own job posting
export async function listMyJobPostings(
    req: Request,
    res: Response,
): Promise<void> {
    const { page, pageSize, status } = parseQuery(
        jobPostingListQuerySchema,
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
            skip: (page - 1) * pageSize,
            take: pageSize,
            select: jobPostingSelect,
        }),
    ]);
    const body: JobPostingListResponse = {
        items: postings.map(toJobPosting),
        pagination: {
            page,
            pageSize,
            totalItems,
            totalPages: Math.ceil(totalItems / pageSize),
        },
    };
    res.json(body);
}

// US2-7. Fetch a single job posting by ID with visibility rules:
// - OPEN postings are visible to all authenticated companies.
// - CLOSED postings are visible ONLY to their creator/owner (companyId === req.auth.companyId).
// - Another company's CLOSED posting returns 404 Not Found, the same
//   as a non-existent ID, a service ID, or a soft-deleted company's posting.
export async function getJobPosting(
    req: Request,
    res: Response,
): Promise<void> {
    const { jobPostingId } = parseParams(jobPostingIdParamSchema, req.params);

    // A soft-deleted company's postings stay in the table, still OPEN, so
    // the where hides them here, the same as in the list.
    // written under time-crunch bypass — review later
    const posting = await prisma.listing.findUnique({
        where: {
            listingId: jobPostingId,
            listingType: 'JOB',
            company: { deletedAt: null },
        },
        select: jobPostingSelect,
    });

    if (!posting) {
        throw ApiError.notFound('Job posting not found');
    }

    const callerCompanyId = req.auth!.companyId;
    const isOwner = posting.companyId === callerCompanyId;

    // A non-open posting is private to its owner, so to anyone else it does
    // not exist: 404, not 403 (docs/conventions.md, 403 vs 404).
    // written under time-crunch bypass — review later
    if (
        posting.listingStatus !== ('OPEN' satisfies ListingStatus) &&
        !isOwner
    ) {
        throw ApiError.notFound('Job posting not found');
    }

    res.json(toJobPosting(posting));
}

// US2-13. Edit a job posting. Only the owner may, and only while it is Open.
// Send only the fields that change; categoryIds replaces the whole set.
export async function updateJobPosting(
    req: Request,
    res: Response,
): Promise<void> {
    const { jobPostingId } = parseParams(jobPostingIdParamSchema, req.params);
    const body = parseBody(updateJobPostingSchema, req.body);

    // 404 if no such posting, 403 if it is someone else's.
    const existing = await assertJobPostingOwned(
        jobPostingId,
        req.auth!.companyId,
    );
    // Once closed, Providers' proposals were written against the old details.
    if (existing.listingStatus !== ('OPEN' satisfies ListingStatus)) {
        throw ApiError.conflict('Only an open job posting can be edited');
    }

    // A PATCH may send one budget only, so the rule is checked against the
    // stored row with the body laid over it. Only when a budget is sent, so a
    // row saved with bad budgets can still have its other fields edited.
    const sentBudget =
        body.minBudget !== undefined || body.maxBudget !== undefined;
    if (
        sentBudget &&
        !minBudgetDoesNotExceedMax({ ...existing, ...omitUndefined(body) })
    ) {
        // Name the budget that was sent, so the form shows the error under
        // that input. Both sent: minBudget, the same as create.
        const field = body.minBudget === undefined ? 'maxBudget' : 'minBudget';
        throw ApiError.validationFailed([
            { field, message: MIN_BUDGET_EXCEEDS_MAX },
        ]);
    }

    if (body.categoryIds) await assertCategoriesExist(body.categoryIds);

    // listing holds the scalars. job_requirement and listing_category are
    // child rows, written only when the body touches them.
    const { locationPref, duration, deadline, categoryIds, ...listingFields } =
        body;
    const requirement = omitUndefined({
        locationPref,
        duration,
        deadline:
            deadline == null ? deadline : new Date(`${deadline}T00:00:00Z`),
    });

    const updated = await prisma.listing.update({
        where: { listingId: jobPostingId },
        data: {
            ...omitUndefined(listingFields),
            // upsert, not update: an older row may have no requirement row.
            ...(Object.keys(requirement).length > 0
                ? {
                      jobRequirement: {
                          upsert: { create: requirement, update: requirement },
                      },
                  }
                : {}),
            // Delete then create swaps the whole set; [] clears it.
            ...(categoryIds
                ? {
                      listingCategory: {
                          deleteMany: {},
                          create: [...new Set(categoryIds)].map((catId) => ({
                              catId,
                          })),
                      },
                  }
                : {}),
        },
        select: jobPostingSelect,
    });

    res.json(toJobPosting(updated));
}

// US2-14. Close a job posting: it stops taking proposals, and every pending
// proposal on it is rejected, in one transaction. Only the owner may, and
// only while it is Open. Answers with the closed posting.
export async function closeJobPosting(
    req: Request,
    res: Response,
): Promise<void> {
    const { jobPostingId } = parseParams(jobPostingIdParamSchema, req.params);

    // 404 if no such posting, 403 if it is someone else's.
    await assertJobPostingOwned(jobPostingId, req.auth!.companyId);

    const closed = await prisma.$transaction(async (tx) => {
        // The status in the where is the Open check: if the posting is
        // already closed, or an accept closed it a moment ago, nothing matches.
        const { count } = await tx.listing.updateMany({
            where: {
                listingId: jobPostingId,
                listingStatus: 'OPEN' satisfies ListingStatus,
            },
            data: { listingStatus: 'CLOSED' satisfies ListingStatus },
        });
        if (count === 0) {
            throw ApiError.conflict('Only an open job posting can be closed');
        }

        await tx.proposal.updateMany({
            where: {
                listingId: jobPostingId,
                proposalStatus: 'PENDING' satisfies ProposalStatus,
            },
            data: { proposalStatus: 'REJECTED' satisfies ProposalStatus },
        });

        return tx.listing.findUniqueOrThrow({
            where: { listingId: jobPostingId },
            select: jobPostingSelect,
        });
    });

    res.json(toJobPosting(closed));
}
