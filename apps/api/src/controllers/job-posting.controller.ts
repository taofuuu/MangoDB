import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { parseBody } from '../middleware/validate';
import { ApiError } from '../lib/ApiError';
import { createJobPostingSchema } from '../schemas/job-posting.schema';
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
