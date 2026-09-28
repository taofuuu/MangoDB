import type { Request, Response } from 'express';
import type { Prisma } from '../generated/prisma/client';
import { prisma } from '../lib/prisma';
import { parseBody, parseQuery } from '../middleware/validate';
import { ApiError } from '../lib/ApiError';
import {
    createJobPostingSchema,
    jobPostingListQuerySchema,
} from '../schemas/job-posting.schema';
import { jobPostingSelect, toJobPosting } from '../lib/jobPosting';

// US2-6. Create and publish a job posting.
// Validates body, verifies category existence, and creates listing + jobRequirement atomically.
export async function createJobPosting(
    req: Request,
    res: Response,
): Promise<void> {
    const body = parseBody(createJobPostingSchema, req.body);
    const companyId = req.auth!.companyId;

    if (body.categoryIds && body.categoryIds.length > 0) {
        const uniqueCatIds = [...new Set(body.categoryIds)];
        const existingCats = await prisma.category.findMany({
            where: { catId: { in: uniqueCatIds } },
            select: { catId: true },
        });

        if (existingCats.length !== uniqueCatIds.length) {
            throw ApiError.validationFailed([
                {
                    field: 'categoryIds',
                    message: 'One or more selected categories do not exist',
                },
            ]);
        }
    }

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
// - Admin role bypasses visibility restrictions.
export async function listJobPostings(
    req: Request,
    res: Response,
): Promise<void> {
    const { status, companyId } = parseQuery(
        jobPostingListQuerySchema,
        req.query,
    );
    const callerCompanyId = req.auth!.companyId;
    const isAdmin = req.auth!.role === 'admin';

    const where: Prisma.ListingWhereInput = {
        AND: [
            // 1. Base rule: only query job postings, never services
            { listingType: 'JOB' },

            // 2. Query filters
            ...(status ? [{ listingStatus: status }] : []),
            ...(companyId ? [{ companyId }] : []),

            // 3. Visibility rules: non-admin callers can only see OPEN postings
            // or postings they created themselves
            ...(!isAdmin
                ? [
                      {
                          OR: [
                              { listingStatus: 'OPEN' },
                              { companyId: callerCompanyId },
                          ],
                      },
                  ]
                : []),
        ],
    };

    const postings = await prisma.listing.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { listingId: 'desc' }],
        select: jobPostingSelect,
    });

    res.json(postings.map(toJobPosting));
}
