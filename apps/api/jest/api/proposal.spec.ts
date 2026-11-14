/*
 * API tests for proposals: sending one to a job or a hire request to a
 * service, the owner's list of them, accept, reject, and the sender's own
 * list and status counts.
 *
 * Covers: each refusal when sending (missing, wrong kind, no owner, own
 * listing, not open, a second pending one); the owner-only list on a job and
 * a service; accept on a job (closes it, rejects the rest) and on a service
 * (stays open), refused when the listing is closed or the sender deleted;
 * reject; my proposals with and without a status filter; and the counts.
 *
 * How: the real app on a random port; the database is the Prisma fake.
 */
import { describe, expect, it, jest } from '@jest/globals';
import { call, PROVIDER, RECEIVER, useApi } from '../helpers/http';
import { db } from '../helpers/prisma-mock';
import { brief } from '../helpers/rows';

useApi();
jest.setTimeout(30_000);

const body = { proposalBudget: 1000, proposalTerms: 'Terms', duration: 1.5 };
const created = {
    proposalId: 30,
    listingId: 20,
    senderId: PROVIDER.companyId,
    proposalBudget: 1000,
    proposalTerms: 'Terms',
    duration: 1.5,
    proposalStatus: 'PENDING',
    createdAt: new Date(),
};

function listing(overrides: Record<string, unknown> = {}) {
    return {
        listingId: 20,
        listingType: 'JOB',
        companyId: RECEIVER.companyId,
        listingStatus: 'OPEN',
        ...overrides,
    };
}

describe('POST /jobs/:id/proposals', () => {
    it('sends a proposal and notifies the owner', async () => {
        db.listing.findUnique.mockResolvedValue(listing());
        db.proposal.create.mockResolvedValue(created);

        const res = await call('POST', '/jobs/20/proposals', {
            as: PROVIDER,
            body,
        });

        expect(res.status).toBe(201);
        expect(res.body).toMatchObject({ proposalId: 30, duration: 1.5 });
        expect(db.notification.create.mock.calls[0]![0].data).toMatchObject({
            recipientId: RECEIVER.companyId,
            notificationType: 'PROPOSAL_RECEIVED',
        });
    });

    it.each([
        ['no listing', null],
        ['a service id', listing({ listingType: 'SERVICE' })],
        ['a listing with no owner', listing({ companyId: null })],
    ])('%s is a 404', async (_name, row) => {
        db.listing.findUnique.mockResolvedValue(row);

        const res = await call('POST', '/jobs/20/proposals', {
            as: PROVIDER,
            body,
        });

        expect(res.status).toBe(404);
        expect(res.body.error.message).toBe('Job not found');
    });

    it('one’s own job is a 403; a closed one a 409', async () => {
        db.listing.findUnique.mockResolvedValueOnce(
            listing({ companyId: PROVIDER.companyId }),
        );
        const own = await call('POST', '/jobs/20/proposals', {
            as: PROVIDER,
            body,
        });
        db.listing.findUnique.mockResolvedValueOnce(
            listing({ listingStatus: 'CLOSED' }),
        );
        const closed = await call('POST', '/jobs/20/proposals', {
            as: PROVIDER,
            body,
        });

        expect(own.body.error.message).toBe(
            'You cannot send a proposal to your own job',
        );
        expect(closed.status).toBe(409);
    });

    it('a second pending proposal is a 409', async () => {
        db.listing.findUnique.mockResolvedValue(listing());
        db.proposal.create.mockRejectedValue({ code: 'P2002' });

        const res = await call('POST', '/jobs/20/proposals', {
            as: PROVIDER,
            body,
        });

        expect(res.body.error.message).toBe(
            'You already have a pending proposal on this job',
        );
    });

    it('a duration that is not a half month is a 400', async () => {
        const res = await call('POST', '/jobs/20/proposals', {
            as: PROVIDER,
            body: { ...body, duration: 1.2 },
        });

        expect(res.status).toBe(400);
    });
});

describe('POST /services/:id/proposals', () => {
    it('sends a hire request', async () => {
        db.listing.findUnique.mockResolvedValue(
            listing({ listingType: 'SERVICE', companyId: PROVIDER.companyId }),
        );
        db.proposal.create.mockResolvedValue(created);

        const res = await call('POST', '/services/20/proposals', {
            as: RECEIVER,
            body,
        });

        expect(res.status).toBe(201);
    });
});

describe('listing owners read the proposals', () => {
    const received = { ...created, sender: brief(PROVIDER.companyId) };

    it('on a job', async () => {
        db.listing.findUnique.mockResolvedValue({
            ...listing(),
            minBudget: null,
            maxBudget: null,
        });
        db.proposal.findMany.mockResolvedValue([received]);

        const res = await call('GET', '/jobs/20/proposals', { as: RECEIVER });

        expect(res.body[0].sender.companyId).toBe(PROVIDER.companyId);
    });

    it('on a service', async () => {
        db.listing.findUnique.mockResolvedValue({
            ...listing({
                listingType: 'SERVICE',
                companyId: PROVIDER.companyId,
            }),
            minBudget: null,
            maxBudget: null,
        });
        db.proposal.findMany.mockResolvedValue([]);

        const res = await call('GET', '/services/20/proposals', {
            as: PROVIDER,
        });

        expect(res.body).toEqual([]);
    });
});

describe('POST /proposals/:id/accept', () => {
    function pending(
        listingType: string,
        overrides: Record<string, unknown> = {},
    ) {
        return {
            listingId: 20,
            senderId: PROVIDER.companyId,
            proposalStatus: 'PENDING',
            proposalBudget: 1000,
            sender: { deletedAt: null },
            listing: {
                listingType,
                listingStatus: 'OPEN',
                companyId: RECEIVER.companyId,
            },
            ...overrides,
        };
    }
    const project = {
        projectId: 40,
        proposalId: 30,
        totalBudget: 1000,
        startDate: new Date('2026-01-01T00:00:00Z'),
        projectStatus: 'AWAITING_QUOTATION',
        depositReportedAt: null,
        depositConfirmedAt: null,
        completedAt: null,
    };

    it('on a job: closes it, rejects the others, opens a project', async () => {
        db.proposal.findUnique.mockResolvedValue(pending('JOB'));
        db.listing.updateMany.mockResolvedValue({ count: 1 });
        db.proposal.updateMany.mockResolvedValue({ count: 1 });
        db.proposal.updateManyAndReturn.mockResolvedValue([]);
        db.project.create.mockResolvedValue(project);

        const res = await call('POST', '/proposals/30/accept', {
            as: RECEIVER,
        });

        expect(res.status).toBe(201);
        expect(res.body.projectStatus).toBe('AWAITING_QUOTATION');
        expect(db.listing.updateMany).toHaveBeenCalled();
        expect(db.proposal.updateManyAndReturn).toHaveBeenCalled();
    });

    it('on a service: the service stays open', async () => {
        db.proposal.findUnique.mockResolvedValue(pending('SERVICE'));
        db.proposal.updateMany.mockResolvedValue({ count: 1 });
        db.project.create.mockResolvedValue(project);

        const res = await call('POST', '/proposals/30/accept', {
            as: RECEIVER,
        });

        expect(res.status).toBe(201);
        expect(db.listing.updateMany).not.toHaveBeenCalled();
        expect(db.proposal.updateManyAndReturn).not.toHaveBeenCalled();
    });

    it('a closed listing or a deleted sender is a 409', async () => {
        db.proposal.findUnique.mockResolvedValueOnce(
            pending('JOB', {
                listing: {
                    listingType: 'JOB',
                    listingStatus: 'CLOSED',
                    companyId: RECEIVER.companyId,
                },
            }),
        );
        const closed = await call('POST', '/proposals/30/accept', {
            as: RECEIVER,
        });
        db.proposal.findUnique.mockResolvedValueOnce(
            pending('JOB', { sender: { deletedAt: new Date() } }),
        );
        const deleted = await call('POST', '/proposals/30/accept', {
            as: RECEIVER,
        });

        expect(closed.body.error.message).toBe(
            'Listing has already been closed',
        );
        expect(deleted.body.error.message).toBe(
            'This company has deleted its account',
        );
    });
});

describe('POST /proposals/:id/reject', () => {
    it('rejects and notifies the sender', async () => {
        db.proposal.findUnique.mockResolvedValue({
            senderId: PROVIDER.companyId,
            proposalStatus: 'PENDING',
            listing: { companyId: RECEIVER.companyId },
        });
        db.proposal.updateMany.mockResolvedValue({ count: 1 });

        const res = await call('POST', '/proposals/30/reject', {
            as: RECEIVER,
        });

        expect(res.status).toBe(204);
        expect(
            db.notification.create.mock.calls[0]![0].data.notificationType,
        ).toBe('PROPOSAL_REJECTED');
    });
});

describe('the sender’s own proposals', () => {
    it('lists them, filtered by status when asked', async () => {
        db.proposal.count.mockResolvedValue(1);
        db.proposal.findMany.mockResolvedValue([
            {
                ...created,
                project: null,
                listing: {
                    listingTitle: 'T',
                    listingType: 'JOB',
                    company: brief(2),
                },
            },
        ]);

        const all = await call('GET', '/proposals/mine', { as: PROVIDER });
        await call('GET', '/proposals/mine?status=ACCEPTED', { as: PROVIDER });

        expect(all.body.items[0].recipient.companyId).toBe(2);
        const [first, filtered] = db.proposal.count.mock.calls.map(
            (c) => c[0].where,
        );
        expect(first).toEqual({ senderId: PROVIDER.companyId });
        expect(filtered.proposalStatus).toBe('ACCEPTED');
    });

    it('counts them by status', async () => {
        db.proposal.groupBy.mockResolvedValue([
            { proposalStatus: 'PENDING', _count: { _all: 2 } },
        ]);

        const res = await call('GET', '/proposals/mine/counts', {
            as: PROVIDER,
        });

        expect(res.body).toEqual({
            total: 2,
            pending: 2,
            accepted: 0,
            rejected: 0,
        });
    });
});
