/*
 * API tests for /jobs: create, search, my jobs, detail, edit and close.
 * (Proposals on a job are in proposal.spec.ts.)
 *
 * Covers: create with and without the optional fields, a past deadline and
 * min above max refused; the search with each filter, deadline direction and
 * blank params; my jobs with and without a status; detail for owner and
 * stranger; an edit refused when closed or over budget, one writing only the
 * listing, one writing the requirement row (deadline set and cleared) and
 * categories, and one whose row vanished; and close, refused when not open.
 *
 * How: the real app on a random port; the database is the Prisma fake.
 */
import { describe, expect, it, jest } from '@jest/globals';
import { call, PROVIDER, RECEIVER, useApi } from '../helpers/http';
import { db } from '../helpers/prisma-mock';
import { brief } from '../helpers/rows';

useApi();
jest.setTimeout(30_000);

const FUTURE = '2099-01-31';

function jobRow(overrides: Record<string, unknown> = {}) {
    return {
        listingId: 20,
        companyId: RECEIVER.companyId,
        company: brief(RECEIVER.companyId),
        listingTitle: 'Need an app',
        listingDesc: 'Details',
        minBudget: null,
        maxBudget: 500,
        listingStatus: 'OPEN',
        createdAt: new Date(),
        job: null,
        listingCategory: [],
        ...overrides,
    };
}

const owned = {
    companyId: RECEIVER.companyId,
    listingType: 'JOB',
    listingStatus: 'OPEN',
    minBudget: 100,
    maxBudget: 500,
};

describe('POST /jobs', () => {
    it('creates a job with every optional field', async () => {
        db.category.findMany.mockResolvedValue([{ categoryId: 1 }]);
        db.listing.create.mockResolvedValue(jobRow());

        const res = await call('POST', '/jobs', {
            as: RECEIVER,
            body: {
                listingTitle: 'Need an app',
                listingDesc: 'Details',
                minBudget: 100,
                maxBudget: 500,
                locationPref: 'BKK',
                duration: '2 months',
                deadline: FUTURE,
                categoryIds: [1],
            },
        });

        expect(res.status).toBe(201);
        expect(db.listing.create.mock.calls[0]![0].data.job.create).toEqual({
            locationPref: 'BKK',
            duration: '2 months',
            deadline: new Date(`${FUTURE}T00:00:00Z`),
        });
    });

    it('with only the required fields, the rest are null', async () => {
        db.listing.create.mockResolvedValue(jobRow());

        await call('POST', '/jobs', {
            as: RECEIVER,
            body: { listingTitle: 'T', listingDesc: 'D', maxBudget: 5 },
        });

        expect(db.listing.create.mock.calls[0]![0].data).toMatchObject({
            minBudget: null,
            job: {
                create: { locationPref: null, duration: null, deadline: null },
            },
        });
        expect(db.category.findMany).not.toHaveBeenCalled();
    });

    it('a past deadline and min above max are 400s', async () => {
        const res = await call('POST', '/jobs', {
            as: RECEIVER,
            body: {
                listingTitle: 'T',
                listingDesc: 'D',
                minBudget: 9,
                maxBudget: 1,
                deadline: '2000-01-01',
            },
        });

        expect(res.status).toBe(400);
        expect(
            res.body.error.details.map((d: { message: string }) => d.message),
        ).toEqual(expect.arrayContaining(['Deadline cannot be in the past']));
    });

    it('a provider cannot post a job', async () => {
        const res = await call('POST', '/jobs', {
            as: PROVIDER,
            body: { listingTitle: 'T', listingDesc: 'D', maxBudget: 5 },
        });

        expect(res.status).toBe(403);
    });
});

describe('GET /jobs', () => {
    it('applies each filter', async () => {
        db.listing.count.mockResolvedValue(1);
        db.listing.findMany.mockResolvedValue([jobRow()]);

        const res = await call(
            'GET',
            `/jobs?status=OPEN&companyId=2&q=app&category=Web&minBudget=1&maxBudget=900&deadline=${FUTURE}&deadlineType=after&orderBy=deadlineAsc`,
            { as: PROVIDER },
        );

        expect(res.status).toBe(200);
        expect(res.body.items[0].jobId).toBe(20);
        expect(db.listing.findMany.mock.calls[0]![0].orderBy[0]).toEqual({
            job: { deadline: { sort: 'asc', nulls: 'last' } },
        });
    });

    it('blank params mean no filter', async () => {
        db.listing.count.mockResolvedValue(0);
        db.listing.findMany.mockResolvedValue([]);

        const res = await call(
            'GET',
            '/jobs?status=&companyId=&q=&deadline=&orderBy=',
            {
                as: PROVIDER,
            },
        );

        expect(res.status).toBe(200);
        expect(db.listing.findMany.mock.calls[0]![0].orderBy[0]).toEqual({
            createdAt: 'desc',
        });
    });

    it('min above max is a 400', async () => {
        const res = await call('GET', '/jobs?minBudget=9&maxBudget=1', {
            as: PROVIDER,
        });

        expect(res.status).toBe(400);
    });
});

describe('GET /jobs/mine', () => {
    it('lists the caller’s jobs, by status when asked', async () => {
        db.listing.count.mockResolvedValue(0);
        db.listing.findMany.mockResolvedValue([]);

        await call('GET', '/jobs/mine', { as: RECEIVER });
        await call('GET', '/jobs/mine?status=CLOSED', { as: RECEIVER });

        const [all, closed] = db.listing.count.mock.calls.map(
            (c) => c[0].where,
        );
        expect(all).not.toHaveProperty('listingStatus');
        expect(closed.listingStatus).toBe('CLOSED');
    });
});

describe('GET /jobs/:id', () => {
    it('a closed job is shown to its owner only', async () => {
        db.listing.findUnique.mockResolvedValue(
            jobRow({ listingStatus: 'CLOSED' }),
        );

        const owner = await call('GET', '/jobs/20', { as: RECEIVER });
        const other = await call('GET', '/jobs/20', { as: PROVIDER });

        expect(owner.status).toBe(200);
        expect(other.status).toBe(404);
        expect(other.body.error.message).toBe('Job not found');
    });
});

describe('PATCH /jobs/:id', () => {
    it('a closed job cannot be edited', async () => {
        db.listing.findUnique.mockResolvedValue({
            ...owned,
            listingStatus: 'CLOSED',
        });

        const res = await call('PATCH', '/jobs/20', {
            as: RECEIVER,
            body: { listingTitle: 'X' },
        });

        expect(res.status).toBe(409);
    });

    it('a sent budget is checked against the stored one', async () => {
        db.listing.findUnique.mockResolvedValue(owned);

        const res = await call('PATCH', '/jobs/20', {
            as: RECEIVER,
            body: { maxBudget: 50 },
        });

        expect(res.body.error.details[0].field).toBe('maxBudget');
    });

    it('a title-only edit writes only the listing', async () => {
        db.listing.findUnique.mockResolvedValue(owned);
        db.listing.update.mockResolvedValue(jobRow());

        await call('PATCH', '/jobs/20', {
            as: RECEIVER,
            body: { listingTitle: 'X' },
        });

        expect(db.listing.update.mock.calls[0]![0].data).toEqual({
            listingTitle: 'X',
        });
    });

    it('requirement fields upsert the job row; categories are replaced', async () => {
        db.listing.findUnique.mockResolvedValue(owned);
        db.category.findMany.mockResolvedValue([{ categoryId: 3 }]);
        db.listing.update.mockResolvedValue(jobRow());

        await call('PATCH', '/jobs/20', {
            as: RECEIVER,
            body: { deadline: FUTURE, duration: null, categoryIds: [3] },
        });
        await call('PATCH', '/jobs/20', {
            as: RECEIVER,
            body: { deadline: null },
        });

        const [withDate, cleared] = db.listing.update.mock.calls.map(
            (c) => c[0].data,
        );
        expect(withDate.job.upsert.update).toEqual({
            deadline: new Date(`${FUTURE}T00:00:00Z`),
            duration: null,
        });
        expect(withDate.listingCategory.create).toEqual([{ categoryId: 3 }]);
        expect(cleared.job.upsert.update).toEqual({ deadline: null });
    });

    it('a row gone mid-edit is a 404', async () => {
        db.listing.findUnique.mockResolvedValue(owned);
        db.listing.update.mockRejectedValue({ code: 'P2025' });

        const res = await call('PATCH', '/jobs/20', {
            as: RECEIVER,
            body: { listingTitle: 'X' },
        });

        expect(res.status).toBe(404);
    });
});

describe('POST /jobs/:id/close', () => {
    it('closes the job and rejects its pending proposals', async () => {
        db.listing.findUnique.mockResolvedValue(owned);
        db.listing.updateMany.mockResolvedValue({ count: 1 });
        db.proposal.updateManyAndReturn.mockResolvedValue([]);
        db.listing.findUniqueOrThrow.mockResolvedValue(
            jobRow({ listingStatus: 'CLOSED' }),
        );

        const res = await call('POST', '/jobs/20/close', { as: RECEIVER });

        expect(res.status).toBe(200);
        expect(res.body.listingStatus).toBe('CLOSED');
    });

    it('a job already closed is a 409', async () => {
        db.listing.findUnique.mockResolvedValue(owned);
        db.listing.updateMany.mockResolvedValue({ count: 0 });

        const res = await call('POST', '/jobs/20/close', { as: RECEIVER });

        expect(res.body.error.message).toBe('Only an open job can be closed');
    });
});
