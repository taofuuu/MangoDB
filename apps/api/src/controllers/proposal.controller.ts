import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { ApiError } from '../lib/ApiError';
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
        },
    });

    if (!posting || posting.listingType !== 'JOB') {
        throw ApiError.notFound('Job posting not found');
    }

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
}
