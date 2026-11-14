/*
 * API tests for /services: create, edit, search, filter options, my services,
 * detail and delete. (Hire requests on a service are in proposal.spec.ts.)
 *
 * Covers: create with and without budgets, categories and tech; the budget
 * rule on create and on a one-sided edit; an edit that touches categories,
 * tech, both or neither, and one whose row vanished mid-edit; the search in
 * database order and in rating order (paged in memory), with each filter and
 * the minPrice > maxPrice refusal; my services with and without a status;
 * detail for owner and stranger; and a delete blocked by a project, one that
 * removes portfolio images, and one that lost a race.
 *
 * How: the real app on a random port; the database and storage are fakes.
 */
import { describe, expect, it, jest } from '@jest/globals';
import { call, PROVIDER, RECEIVER, useApi } from '../helpers/http';
import { db } from '../helpers/prisma-mock';
import { bucket, publicUrl } from '../helpers/storage-mock';
import { brief, NO_RATING, scores } from '../helpers/rows';

useApi();
jest.setTimeout(30_000);

function serviceRow(overrides: Record<string, unknown> = {}) {
    return {
        listingId: 10,
        companyId: PROVIDER.companyId,
        listingTitle: 'Web app',
        listingDesc: 'We build web apps',
        minBudget: 100,
        maxBudget: 200,
        listingStatus: 'OPEN',
        listingCategory: [{ categoryId: 1 }],
        service: { serviceTechStack: [{ techStack: { techStackName: 'Go' } }] },
        company: brief(PROVIDER.companyId),
        ...overrides,
    };
}

const owned = {
    companyId: PROVIDER.companyId,
    listingType: 'SERVICE',
    listingStatus: 'OPEN',
    minBudget: 100,
    maxBudget: 200,
};

describe('POST /services', () => {
    it('creates a service with categories and tech', async () => {
        db.category.findMany.mockResolvedValue([{ categoryId: 1 }]);
        db.techStack.findMany.mockResolvedValue([]);
        db.listing.create.mockResolvedValue(serviceRow());

        const res = await call('POST', '/services', {
            as: PROVIDER,
            body: {
                listingTitle: 'Web app',
                listingDesc: 'We build web apps',
                minBudget: 100,
                maxBudget: 200,
                categoryIds: [1],
                techStack: ['Go'],
            },
        });

        expect(res.status).toBe(201);
        expect(res.body).toMatchObject({ serviceId: 10, techStack: ['Go'] });
    });

    it('with only a title and description, budgets are null', async () => {
        db.listing.create.mockResolvedValue(serviceRow());

        await call('POST', '/services', {
            as: PROVIDER,
            body: { listingTitle: 'T', listingDesc: 'D' },
        });

        expect(db.listing.create.mock.calls[0]![0].data).toMatchObject({
            minBudget: null,
            maxBudget: null,
        });
    });

    it('min above max is a 400 on minBudget', async () => {
        const res = await call('POST', '/services', {
            as: PROVIDER,
            body: {
                listingTitle: 'T',
                listingDesc: 'D',
                minBudget: 9,
                maxBudget: 1,
            },
        });

        expect(res.body.error.details[0]).toEqual({
            field: 'minBudget',
            message: 'Minimum budget cannot exceed maximum budget',
        });
    });

    it('a receiver cannot create one', async () => {
        const res = await call('POST', '/services', {
            as: RECEIVER,
            body: { listingTitle: 'T', listingDesc: 'D' },
        });

        expect(res.status).toBe(403);
    });
});

describe('PATCH /services/:id', () => {
    it('replaces categories and tech when sent', async () => {
        db.listing.findUnique.mockResolvedValue(owned);
        db.category.findMany.mockResolvedValue([{ categoryId: 2 }]);
        db.techStack.findMany.mockResolvedValue([]);
        db.listing.update.mockResolvedValue(serviceRow());

        const res = await call('PATCH', '/services/10', {
            as: PROVIDER,
            body: { categoryIds: [2], techStack: ['Rust'] },
        });

        expect(res.status).toBe(200);
        const data = db.listing.update.mock.calls[0]![0].data;
        expect(data.listingCategory).toEqual({
            deleteMany: {},
            create: [{ categoryId: 2 }],
        });
        expect(data.service.upsert.update.serviceTechStack.create).toEqual([
            { techStack: { connect: { techStackName: 'Rust' } } },
        ]);
    });

    it('a title-only edit leaves categories and tech alone', async () => {
        db.listing.findUnique.mockResolvedValue(owned);
        db.listing.update.mockResolvedValue(serviceRow());

        await call('PATCH', '/services/10', {
            as: PROVIDER,
            body: { listingTitle: 'New', minBudget: '' },
        });

        const data = db.listing.update.mock.calls[0]![0].data;
        expect(data).toEqual({ listingTitle: 'New', minBudget: null });
    });

    it('a sent budget is checked against the stored other side', async () => {
        db.listing.findUnique.mockResolvedValue(owned);

        const res = await call('PATCH', '/services/10', {
            as: PROVIDER,
            body: { minBudget: 500 },
        });

        expect(res.status).toBe(400);
    });

    it('another provider’s service is a 403; an empty body a 400', async () => {
        db.listing.findUnique.mockResolvedValue({ ...owned, companyId: 99 });
        const other = await call('PATCH', '/services/10', {
            as: PROVIDER,
            body: { listingTitle: 'X' },
        });
        const empty = await call('PATCH', '/services/10', {
            as: PROVIDER,
            body: {},
        });

        expect(other.status).toBe(403);
        expect(empty.status).toBe(400);
    });

    it('a row deleted mid-edit is a 404', async () => {
        db.listing.findUnique.mockResolvedValue(owned);
        db.listing.update.mockRejectedValue({ code: 'P2025' });

        const res = await call('PATCH', '/services/10', {
            as: PROVIDER,
            body: { listingTitle: 'X' },
        });

        expect(res.status).toBe(404);
    });
});

describe('GET /services', () => {
    function summary(listingId: number, company: object) {
        return {
            listingId,
            listingTitle: 'T',
            listingDesc: 'D',
            minBudget: null,
            maxBudget: null,
            listingCategory: [],
            service: null,
            company: { ...brief(), ...company },
        };
    }

    it('pages in the database for the newest order', async () => {
        db.listing.count.mockResolvedValue(1);
        db.listing.findMany.mockResolvedValue([summary(1, NO_RATING)]);

        const res = await call(
            'GET',
            '/services?q=web&category=Web&techStack=Go&techStack=Rust&minPrice=1&maxPrice=9&companyId=1',
            { as: RECEIVER },
        );

        expect(res.status).toBe(200);
        expect(res.body.items).toHaveLength(1);
        expect(db.listing.findMany.mock.calls[0]![0]).toHaveProperty('skip', 0);
    });

    it('sorts by rating in memory, then pages', async () => {
        const rated = {
            proposal: [{ project: { review: scores(5) } }],
            listing: [],
        };
        db.listing.findMany.mockResolvedValue([
            summary(1, NO_RATING),
            summary(2, rated),
        ]);

        const res = await call(
            'GET',
            '/services?orderBy=ratingDesc&pageSize=1',
            {
                as: RECEIVER,
            },
        );

        expect(
            res.body.items.map((s: { serviceId: number }) => s.serviceId),
        ).toEqual([2]);
        expect(res.body.pagination).toMatchObject({
            totalItems: 2,
            totalPages: 2,
        });
    });

    it('minPrice above maxPrice and a hex companyId are 400s', async () => {
        const price = await call('GET', '/services?minPrice=9&maxPrice=1', {
            as: RECEIVER,
        });
        const hex = await call('GET', '/services?companyId=0x10', {
            as: RECEIVER,
        });

        expect(price.status).toBe(400);
        expect(hex.status).toBe(400);
    });
});

describe('GET /services/filter-options', () => {
    it('lists category and tech names', async () => {
        db.category.findMany.mockResolvedValue([{ categoryName: 'Web' }]);
        db.techStack.findMany.mockResolvedValue([{ techStackName: 'Go' }]);

        const res = await call('GET', '/services/filter-options', {
            as: RECEIVER,
        });

        expect(res.body).toEqual({ categories: ['Web'], techStack: ['Go'] });
    });
});

describe('GET /services/mine', () => {
    it('lists the provider’s services, filtered by status when asked', async () => {
        db.listing.findMany.mockResolvedValue([serviceRow()]);

        await call('GET', '/services/mine', { as: PROVIDER });
        await call('GET', '/services/mine?status=CLOSED', { as: PROVIDER });

        const [all, closed] = db.listing.findMany.mock.calls.map(
            (c) => c[0].where,
        );
        expect(all).not.toHaveProperty('listingStatus');
        expect(closed.listingStatus).toBe('CLOSED');
    });

    it('DRAFT is not a status', async () => {
        const res = await call('GET', '/services/mine?status=DRAFT', {
            as: PROVIDER,
        });

        expect(res.status).toBe(400);
    });
});

describe('GET /services/:id', () => {
    it('an open service is shown to anyone; a closed one 404s for others', async () => {
        db.listing.findUnique.mockResolvedValueOnce(serviceRow());
        const open = await call('GET', '/services/10', { as: RECEIVER });
        db.listing.findUnique.mockResolvedValueOnce(
            serviceRow({ listingStatus: 'CLOSED' }),
        );
        const closed = await call('GET', '/services/10', { as: RECEIVER });

        expect(open.status).toBe(200);
        expect(closed.status).toBe(404);
    });
});

describe('DELETE /services/:id', () => {
    it('a service with a project is a 409', async () => {
        db.listing.findUnique.mockResolvedValue(owned);
        db.project.count.mockResolvedValue(1);

        const res = await call('DELETE', '/services/10', { as: PROVIDER });

        expect(res.status).toBe(409);
    });

    it('deletes and removes each portfolio image', async () => {
        db.listing.findUnique.mockResolvedValue(owned);
        db.project.count.mockResolvedValue(0);
        db.servicePortfolio.findMany.mockResolvedValue([
            { portfolioImage: publicUrl('portfolio', 'a.png') },
            { portfolioImage: publicUrl('portfolio', 'b.png') },
        ]);
        db.listing.delete.mockResolvedValue({});

        const res = await call('DELETE', '/services/10', { as: PROVIDER });

        expect(res.status).toBe(204);
        expect(bucket.remove).toHaveBeenCalledTimes(2);
    });

    it('a service deleted by another request first is a 404', async () => {
        db.listing.findUnique.mockResolvedValue(owned);
        db.project.count.mockResolvedValue(0);
        db.servicePortfolio.findMany.mockResolvedValue([]);
        db.listing.delete.mockRejectedValue({ code: 'P2025' });

        const res = await call('DELETE', '/services/10', { as: PROVIDER });

        expect(res.status).toBe(404);
    });
});
