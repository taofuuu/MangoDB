import type { Request, Response } from 'express';
import type {
    CreateProposalRequest,
    ListingStatus,
    ListingType,
    Paginated,
    ProposalStatus,
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
import { serviceIdParamSchema } from '../schemas/service.schema';
import {
    assertListingOwned,
    LISTING_MESSAGES,
    closeOpenListing,
    rejectPendingProposals,
} from '../lib/listing';
import { createProjectFromProposal } from '../lib/project';
import {
    receivedProposalSelect,
    proposalSelect,
    sentProposalSelect,
    toReceivedProposal,
    toProposal,
    toSentProposal,
    toProposalStatusCounts,
    findPendingProposalFor,
    setProposalStatus,
} from '../lib/proposal';

async function sendProposalToListing(
    listingId: number,
    listingType: ListingType,
    callerCompanyId: number,
    body: CreateProposalRequest,
) {
    // A soft-deleted company's listings stay OPEN in the table, so the where
    // hides them here, the same 404 that GET /jobs/:jobId and GET /services/:serviceId give.
    const listing = await prisma.listing.findUnique({
        where: { listingId, company: { deletedAt: null } },
        select: {
            listingId: true,
            listingType: true,
            companyId: true,
            listingStatus: true,
        },
    });

    if (!listing || listing.listingType !== listingType) {
        throw ApiError.notFound(LISTING_MESSAGES[listingType].notFound);
    }

    if (listing.companyId === callerCompanyId) {
        throw ApiError.forbidden('You cannot send a proposal to your own job');
    }

    if (listing.listingStatus !== ('OPEN' satisfies ListingStatus)) {
        throw ApiError.conflict('This job is not open for proposals');
    }

    try {
        const proposal = await prisma.proposal.create({
            data: {
                listingId,
                senderId: callerCompanyId,
                proposalBudget: body.proposalBudget,
                proposalTerms: body.proposalTerms,
                duration: body.duration,
                proposalStatus: 'PENDING' satisfies ProposalStatus,
            },
            select: proposalSelect,
        });

        return toProposal(proposal);
    } catch (err) {
        // Only a second PENDING one hits the index; a decided one may repeat
        // (ADR 0016).
        if (isUniqueViolation(err)) {
            throw ApiError.conflict(
                'You already have a pending proposal on this job',
            );
        }
        throw err;
    }
}

export async function createProposal(
    req: Request,
    res: Response,
): Promise<void> {
    const { jobId } = parseParams(jobIdParamSchema, req.params);
    const body = parseBody(createProposalSchema, req.body);

    const proposal = await sendProposalToListing(
        jobId,
        'JOB',
        req.auth!.companyId,
        body,
    );
    res.status(201).json(proposal);
}

// US2-15. Send a hire request (stored as a PENDING proposal) on an open service.
export async function createServiceProposal(
    req: Request,
    res: Response,
): Promise<void> {
    const { serviceId } = parseParams(serviceIdParamSchema, req.params);
    const body = parseBody(createProposalSchema, req.body);

    const proposal = await sendProposalToListing(
        serviceId,
        'SERVICE',
        req.auth!.companyId,
        body,
    );
    res.status(201).json(proposal);
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
    await assertListingOwned(jobId, 'JOB', req.auth!.companyId);

    const proposals = await prisma.proposal.findMany({
        where: { listingId: jobId },
        orderBy: [{ createdAt: 'desc' }, { proposalId: 'desc' }],
        select: receivedProposalSelect,
    });

    res.json(proposals.map(toReceivedProposal));
}

// US2-11. Accepting a proposal on a job closes the job, rejects the other
// proposals and opens a project, all or nothing. Each step is a lib helper,
// so an accept that must leave its listing open (a hire request on a service)
// leaves out closeOpenListing.
export async function acceptProposal(
    req: Request,
    res: Response,
): Promise<void> {
    const callerId = req.auth!.companyId;
    const { proposalId } = parseParams(proposalIdParamSchema, req.params);

    const project = await prisma.$transaction(async (tx) => {
        const proposal = await findPendingProposalFor(tx, proposalId, callerId);
        if (
            proposal.listing.listingStatus !== ('OPEN' satisfies ListingStatus)
        ) {
            throw ApiError.conflict('Listing has already been closed');
        }

        await closeOpenListing(
            tx,
            proposal.listingId,
            'Listing has already been closed',
        );
        await setProposalStatus(tx, proposalId, 'ACCEPTED');
        await rejectPendingProposals(tx, proposal.listingId, proposalId);
        return createProjectFromProposal(tx, {
            proposalId,
            proposalBudget: proposal.proposalBudget,
        });
    });

    res.status(201).json(project);
}

// Rejecting one pending proposal touches no other row.
export async function rejectProposal(
    req: Request,
    res: Response,
): Promise<void> {
    const callerId = req.auth!.companyId;
    const { proposalId } = parseParams(proposalIdParamSchema, req.params);

    await findPendingProposalFor(prisma, proposalId, callerId);
    await setProposalStatus(prisma, proposalId, 'REJECTED');
    res.status(204).end();
}

// US2-9. List authenticated company's proposals or hire requests with pagination and status filter.
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
