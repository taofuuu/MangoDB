import type { Request, Response } from 'express';
import type { ProposalListResponse } from '@mangodb/shared';
import type { Prisma } from '../generated/prisma/client';
import { prisma } from '../lib/prisma';
import { ApiError } from '../lib/ApiError';
import { isUniqueViolation } from '../lib/prismaErrors';
import { parseParams, parseBody, parseQuery } from '../middleware/validate';
import {
    createProposalSchema,
    proposalIdParamSchema,
    proposalListQuerySchema,
} from '../schemas/proposal.schema';
import { jobPostingIdParamSchema } from '../schemas/job-posting.schema';
import { assertJobPostingOwned } from '../lib/jobPosting';
import {
    postingProposalSelect,
    proposalSelect,
    providerProposalSelect,
    toPostingProposal,
    toProposal,
    toProviderProposal,
    acceptProposal,
    rejectProposal,
} from '../lib/proposal';

export async function createProposal(
    req: Request,
    res: Response,
): Promise<void> {
    const { jobPostingId } = parseParams(jobPostingIdParamSchema, req.params);
    const body = parseBody(createProposalSchema, req.body);
    const callerCompanyId = req.auth!.companyId;

    const posting = await prisma.listing.findUnique({
        where: { listingId: jobPostingId },
        select: {
            listingId: true,
            listingType: true,
            companyId: true,
            listingStatus: true,
        },
    });

    if (!posting || posting.listingType !== 'JOB') {
        throw ApiError.notFound('Job posting not found');
    }

    if (posting.companyId === callerCompanyId) {
        throw ApiError.forbidden(
            'Cannot submit a proposal to your own job posting',
        );
    }

    if (posting.listingStatus !== 'OPEN') {
        throw ApiError.conflict('Job posting is not open for proposals');
    }

    try {
        const proposal = await prisma.proposal.create({
            data: {
                listingId: jobPostingId,
                senderId: callerCompanyId,
                proposalBudget: body.proposalBudget,
                proposalTerms: body.proposalTerms,
                duration: body.duration,
                proposalStatus: 'PENDING',
            },
            select: proposalSelect,
        });

        res.status(201).json(toProposal(proposal));
    } catch (err) {
        if (isUniqueViolation(err)) {
            throw ApiError.conflict(
                'You have already submitted a proposal for this job posting',
            );
        }
        throw err;
    }
}

// US2-10. Every proposal on one job posting, newest first, each with a short
// profile of its Provider. Soft-deleted Providers are kept: a proposal is
// history, not discovery (see Company.deletedAt).
// Only the posting's owner may read them: the list carries every competing
// Provider's price and terms.
export async function listPostingProposals(
    req: Request,
    res: Response,
): Promise<void> {
    const { jobPostingId } = parseParams(jobPostingIdParamSchema, req.params);
    await assertJobPostingOwned(jobPostingId, req.auth!.companyId);

    const proposals = await prisma.proposal.findMany({
        where: { listingId: jobPostingId },
        orderBy: [{ createdAt: 'desc' }, { proposalId: 'desc' }],
        select: postingProposalSelect,
    });

    res.json(proposals.map(toPostingProposal));
}

export async function acceptProposalHandler(
    req: Request,
    res: Response,
): Promise<void> {
    const callerId = req.auth!.companyId;
    const { proposalId } = parseParams(proposalIdParamSchema, req.params);
    const project = await acceptProposal(proposalId, callerId);
    res.status(201).json(project);
}

export async function rejectProposalHandler(
    req: Request,
    res: Response,
): Promise<void> {
    const callerId = req.auth!.companyId;
    const { proposalId } = parseParams(proposalIdParamSchema, req.params);
    await rejectProposal(proposalId, callerId);
    res.status(204).end();
}

// US2-9. List authenticated provider's proposals with pagination and status filter.
// Soft-deleted companies are kept: proposals are history, not discovery (conventions §8).
export async function getMyProposals(
    req: Request,
    res: Response,
): Promise<void> {
    const callerId = req.auth!.companyId;
    const { page, pageSize, status } = parseQuery(
        proposalListQuerySchema,
        req.query,
    );

    const where: Prisma.ProposalWhereInput = {
        senderId: callerId,
        ...(status ? { proposalStatus: status } : {}),
    };

    const [totalItems, rows] = await prisma.$transaction([
        prisma.proposal.count({ where }),
        prisma.proposal.findMany({
            where,
            skip: (page - 1) * pageSize,
            take: pageSize,
            orderBy: [{ createdAt: 'desc' }, { proposalId: 'desc' }],
            select: providerProposalSelect,
        }),
    ]);

    const body: ProposalListResponse = {
        items: rows.map(toProviderProposal),
        pagination: {
            page,
            pageSize,
            totalItems,
            totalPages: Math.ceil(totalItems / pageSize),
        },
    };

    res.json(body);
}
