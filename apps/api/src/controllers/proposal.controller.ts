import type { Request, Response } from 'express';
import type {
    Paginated,
    ProposalStatusCounts,
    SentProposal,
} from '@mangodb/shared';
import type { Prisma } from '../generated/prisma/client';
import { prisma } from '../lib/prisma';
import { pageArgs, toPagination } from '../lib/pagination';
import { ApiError } from '../lib/api-error';
import { isUniqueViolation } from '../lib/prisma-errors';
import { parseParams, parseBody, parseQuery } from '../middleware/validate';
import {
    createProposalSchema,
    proposalIdParamSchema,
    proposalListQuerySchema,
} from '../schemas/proposal.schema';
import { jobIdParamSchema } from '../schemas/job.schema';
import { assertJobOwned } from '../lib/job';
import {
    receivedProposalSelect,
    proposalSelect,
    sentProposalSelect,
    toReceivedProposal,
    toProposal,
    toSentProposal,
    toProposalStatusCounts,
    acceptProposalTx,
    rejectPendingProposal,
} from '../lib/proposal';

export async function createProposal(
    req: Request,
    res: Response,
): Promise<void> {
    const { jobId } = parseParams(jobIdParamSchema, req.params);
    const body = parseBody(createProposalSchema, req.body);
    const callerCompanyId = req.auth!.companyId;

    // A soft-deleted company's postings stay OPEN in the table, so the where
    // hides them here, the same 404 that GET /jobs/:jobId gives.
    const posting = await prisma.listing.findUnique({
        where: { listingId: jobId, company: { deletedAt: null } },
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
                listingId: jobId,
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
export async function listJobProposals(
    req: Request,
    res: Response,
): Promise<void> {
    const { jobId } = parseParams(jobIdParamSchema, req.params);
    await assertJobOwned(jobId, req.auth!.companyId);

    const proposals = await prisma.proposal.findMany({
        where: { listingId: jobId },
        orderBy: [{ createdAt: 'desc' }, { proposalId: 'desc' }],
        select: receivedProposalSelect,
    });

    res.json(proposals.map(toReceivedProposal));
}

export async function acceptProposal(
    req: Request,
    res: Response,
): Promise<void> {
    const callerId = req.auth!.companyId;
    const { proposalId } = parseParams(proposalIdParamSchema, req.params);
    const project = await acceptProposalTx(proposalId, callerId);
    res.status(201).json(project);
}

export async function rejectProposal(
    req: Request,
    res: Response,
): Promise<void> {
    const callerId = req.auth!.companyId;
    const { proposalId } = parseParams(proposalIdParamSchema, req.params);
    await rejectPendingProposal(proposalId, callerId);
    res.status(204).end();
}

// US2-9. List authenticated provider's proposals with pagination and status filter.
// Soft-deleted companies are kept: proposals are history, not discovery (conventions §8).
export async function listMyProposals(
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
            ...pageArgs({ page, pageSize }),
            orderBy: [{ createdAt: 'desc' }, { proposalId: 'desc' }],
            select: sentProposalSelect,
        }),
    ]);

    const body: Paginated<SentProposal> = {
        items: rows.map(toSentProposal),
        pagination: toPagination(totalItems, { page, pageSize }),
    };

    res.json(body);
}

// US2-9. The numbers on the Your Proposals chips: one groupBy over the
// caller's proposals. It reads no ?status=, so the chips stay put while the
// list is filtered. Soft-deleted owners are counted, as in listMyProposals.
export async function getMyProposalCounts(
    req: Request,
    res: Response,
): Promise<void> {
    const callerId = req.auth!.companyId;

    const groups = await prisma.proposal.groupBy({
        by: ['proposalStatus'],
        where: { senderId: callerId },
        orderBy: { proposalStatus: 'asc' },
        _count: { _all: true },
    });

    const body: ProposalStatusCounts = toProposalStatusCounts(groups);
    res.json(body);
}
