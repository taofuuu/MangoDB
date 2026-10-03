import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { ApiError } from '../lib/ApiError';
import { isUniqueViolation } from '../lib/prismaErrors';
import { parseParams, parseBody } from '../middleware/validate';
import {
    createProposalSchema,
    proposalIdParamSchema,
} from '../schemas/proposal.schema';
import { jobPostingIdParamSchema } from '../schemas/job-posting.schema';
import { assertJobPostingOwned } from '../lib/jobPosting';
import {
    postingProposalSelect,
    proposalSelect,
    toPostingProposal,
    toProposal,
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

// US2-11. Every proposal on one job posting, newest first, each with a short
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
