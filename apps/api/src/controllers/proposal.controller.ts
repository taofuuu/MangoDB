import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { ApiError } from '../lib/ApiError';
import { isUniqueViolation } from '../lib/prismaErrors';
import { parseParams, parseBody } from '../middleware/validate';
import {
    createProposalSchema,
    proposalParamsSchema,
} from '../schemas/proposal.schema';
import { proposalSelect, toProposal } from '../lib/proposal';

export async function createProposal(
    req: Request,
    res: Response,
): Promise<void> {
    const { jobPostingId } = parseParams(proposalParamsSchema, req.params);
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
