import type { Request, Response } from 'express';
import type { ListingStatus } from '@mangodb/shared';
import type { Prisma } from '../generated/prisma/client';
import { prisma } from '../lib/prisma';
import { parseBody, parseParams, parseQuery } from '../middleware/validate';
import { ApiError } from '../lib/ApiError';
import {
    createJobPostingSchema,
    jobPostingIdParamSchema,
    jobPostingListQuerySchema,
} from '../schemas/job-posting.schema';
import {
    assertCategoriesExist,
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
// - CLOSED and DRAFT postings are visible ONLY to their creator/owner (companyId === req.auth.companyId).
export async function listJobPostings(
    req: Request,
    res: Response,
): Promise<void> {
    const { status, companyId } = parseQuery(
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

    const postings = await prisma.listing.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { listingId: 'desc' }],
        select: jobPostingSelect,
    });

    res.json(postings.map(toJobPosting));
}

// US2-7. Fetch a single job posting by ID with visibility rules:
// - OPEN postings are visible to all authenticated companies.
// - CLOSED and DRAFT postings are visible ONLY to their creator/owner (companyId === req.auth.companyId).
// - Attempting to view another company's CLOSED or DRAFT posting returns 403 Forbidden.
// - Non-existent ID or listing with listingType !== 'JOB' returns 404 Not Found.
export async function getJobPosting(
    req: Request,
    res: Response,
): Promise<void> {
    const { jobPostingId } = parseParams(jobPostingIdParamSchema, req.params);

    const posting = await prisma.listing.findUnique({
        where: { listingId: jobPostingId },
        select: {
            ...jobPostingSelect,
            listingType: true,
        },
    });

    if (!posting || posting.listingType !== 'JOB') {
        throw ApiError.notFound('Job posting not found');
    }

    const callerCompanyId = req.auth!.companyId;
    const isOwner = posting.companyId === callerCompanyId;

    if (
        posting.listingStatus !== ('OPEN' satisfies ListingStatus) &&
        !isOwner
    ) {
        throw ApiError.forbidden(
            'Insufficient permissions to access this resource',
        );
    }

    res.json(toJobPosting(posting));
}
