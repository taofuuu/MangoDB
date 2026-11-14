/*
 * API tests for /companies: the caller's own profile (read, edit, sign-in
 * fields, photo, delete) and other companies (search, public profile,
 * reviews, rating summary).
 *
 * Covers: each 404 for a company deleted mid-session; a receiver sending
 * provider-only fields; a repeated tag; a credential change with and without
 * a new password, its 409 race and its fresh session; a photo upload that
 * replaces or adds one; clearing a photo that is or is not there; a delete
 * blocked by an ongoing project; search with and without words in both name
 * orders; and the review list and summary.
 *
 * How: the real app on a random port; the database and storage are fakes.
 */
import { describe, expect, it, jest } from '@jest/globals';
import bcrypt from 'bcryptjs';
import {
    ADMIN,
    call,
    formWith,
    PNG,
    PROVIDER,
    RECEIVER,
    useApi,
} from '../helpers/http';
import { db } from '../helpers/prisma-mock';
import { bucket, publicUrl } from '../helpers/storage-mock';
import { brief, companyRow, NO_RATING, scores } from '../helpers/rows';

useApi();
jest.setTimeout(30_000);

function quiet() {
    return jest.spyOn(console, 'error').mockImplementation(() => {});
}

describe('GET /companies/me', () => {
    it('returns the caller’s profile', async () => {
        db.company.findUnique.mockResolvedValue(companyRow());

        const res = await call('GET', '/companies/me', { as: PROVIDER });

        expect(res.status).toBe(200);
        expect(res.body.username).toBe('alpha');
    });

    it('a company deleted mid-session is a 404', async () => {
        db.company.findUnique.mockResolvedValue(null);

        const res = await call('GET', '/companies/me', { as: PROVIDER });

        expect(res.status).toBe(404);
    });
});

describe('PATCH /companies/me', () => {
    it('saves the fields sent', async () => {
        db.company.update.mockResolvedValue(companyRow({ companyName: 'New' }));

        const res = await call('PATCH', '/companies/me', {
            as: PROVIDER,
            body: { companyName: 'New', serviceTerm: null },
        });

        expect(res.status).toBe(200);
        expect(res.body.companyName).toBe('New');
    });

    it('an empty body or an unknown key is a 400', async () => {
        const empty = await call('PATCH', '/companies/me', {
            as: PROVIDER,
            body: {},
        });
        const unknown = await call('PATCH', '/companies/me', {
            as: PROVIDER,
            body: { email: 'x@y.test' },
        });

        expect(empty.status).toBe(400);
        expect(unknown.status).toBe(400);
    });

    it('a receiver cannot set provider fields', async () => {
        const res = await call('PATCH', '/companies/me', {
            as: RECEIVER,
            body: { warrantyPolicy: '1 year' },
        });

        expect(res.status).toBe(403);
    });

    it('a receiver can edit its other fields', async () => {
        db.company.update.mockResolvedValue(companyRow({ provider: null }));

        const res = await call('PATCH', '/companies/me', {
            as: RECEIVER,
            body: { address: 'Bangkok' },
        });

        expect(res.status).toBe(200);
    });

    it('a repeated tag is a 409; a gone company a 404; anything else a 500', async () => {
        db.company.update.mockRejectedValueOnce({ code: 'P2002' });
        const repeat = await call('PATCH', '/companies/me', {
            as: PROVIDER,
            body: { companyType: ['A', 'A'] },
        });
        db.company.update.mockRejectedValueOnce({ code: 'P2025' });
        const gone = await call('PATCH', '/companies/me', {
            as: PROVIDER,
            body: { companyName: 'X' },
        });
        const log = quiet();
        db.company.update.mockRejectedValueOnce(new Error('down'));
        const other = await call('PATCH', '/companies/me', {
            as: PROVIDER,
            body: { companyName: 'X' },
        });
        log.mockRestore();

        expect(repeat.status).toBe(409);
        expect(gone.status).toBe(404);
        expect(other.status).toBe(500);
    });
});

describe('PATCH /companies/me/credentials', () => {
    async function knowsPassword() {
        db.company.findUnique.mockResolvedValue({
            password: await bcrypt.hash('current-1', 4),
        });
        db.$queryRaw.mockResolvedValue([]);
    }

    it('a new password is hashed, the token revoked, a new session sent', async () => {
        await knowsPassword();
        db.company.update.mockResolvedValue(companyRow());

        const res = await call('PATCH', '/companies/me/credentials', {
            as: PROVIDER,
            body: { currentPassword: 'current-1', newPassword: 'brand-new-1' },
        });

        expect(res.status).toBe(200);
        expect(res.body.accessToken).toEqual(expect.any(String));
        const data = db.company.update.mock.calls[0]![0].data;
        expect(data.password).toMatch(/^\$2/);
        expect(data.credentialsChangedAt).toBeDefined();
        expect(db.revokedToken.upsert).toHaveBeenCalled();
    });

    it('a new email alone writes no password', async () => {
        await knowsPassword();
        db.company.update.mockResolvedValue(companyRow());

        await call('PATCH', '/companies/me/credentials', {
            as: PROVIDER,
            body: { currentPassword: 'current-1', email: 'new@mango.test' },
        });

        const data = db.company.update.mock.calls[0]![0].data;
        expect(data).not.toHaveProperty('password');
        expect(data.email).toBe('new@mango.test');
    });

    it('only the current password is a 400', async () => {
        const res = await call('PATCH', '/companies/me/credentials', {
            as: PROVIDER,
            body: { currentPassword: 'current-1' },
        });

        expect(res.status).toBe(400);
    });

    it('a wrong current password is a 401 that keeps the session', async () => {
        await knowsPassword();

        const res = await call('PATCH', '/companies/me/credentials', {
            as: PROVIDER,
            body: { currentPassword: 'wrong', username: 'newname' },
        });

        expect(res.status).toBe(401);
        expect(db.revokedToken.upsert).not.toHaveBeenCalled();
    });

    it('a race on the unique index is a 409; a gone row a 404; others a 500', async () => {
        await knowsPassword();
        const body = { currentPassword: 'current-1', username: 'newname' };
        db.company.update.mockRejectedValueOnce({ code: 'P2002' });
        const race = await call('PATCH', '/companies/me/credentials', {
            as: PROVIDER,
            body,
        });
        db.company.update.mockRejectedValueOnce({ code: 'P2025' });
        const gone = await call('PATCH', '/companies/me/credentials', {
            as: PROVIDER,
            body,
        });
        const log = quiet();
        db.company.update.mockRejectedValueOnce(new Error('down'));
        const other = await call('PATCH', '/companies/me/credentials', {
            as: PROVIDER,
            body,
        });
        log.mockRestore();

        expect(race.status).toBe(409);
        expect(gone.status).toBe(404);
        expect(other.status).toBe(500);
    });
});

describe('/companies/me/photo', () => {
    const photo = () =>
        formWith({}, { field: 'photo', bytes: PNG, type: 'image/png' });

    it('an upload replaces the old photo and removes it', async () => {
        const old = publicUrl('profile', 'companies/old.png');
        db.company.findUnique.mockResolvedValue({ companyPhoto: old });
        db.company.update.mockResolvedValue(companyRow());

        const res = await call('PATCH', '/companies/me/photo', {
            as: PROVIDER,
            form: photo(),
        });

        expect(res.status).toBe(200);
        expect(bucket.remove).toHaveBeenCalledWith(['companies/old.png']);
    });

    it('a first photo removes nothing', async () => {
        db.company.findUnique.mockResolvedValue({ companyPhoto: null });
        db.company.update.mockResolvedValue(companyRow());

        await call('PATCH', '/companies/me/photo', {
            as: PROVIDER,
            form: photo(),
        });

        expect(bucket.remove).not.toHaveBeenCalled();
    });

    it('no file is a 400; a gone company a 404', async () => {
        const none = await call('PATCH', '/companies/me/photo', {
            as: PROVIDER,
            form: formWith({}),
        });
        db.company.findUnique.mockResolvedValue(null);
        const gone = await call('PATCH', '/companies/me/photo', {
            as: PROVIDER,
            form: photo(),
        });

        expect(none.status).toBe(400);
        expect(none.body.error.details[0].field).toBe('photo');
        expect(gone.status).toBe(404);
    });

    it('clearing removes the stored file, if there was one', async () => {
        db.company.findUnique.mockResolvedValueOnce({
            companyPhoto: publicUrl('profile', 'companies/a.png'),
        });
        db.company.findUnique.mockResolvedValueOnce({ companyPhoto: null });
        db.company.update.mockResolvedValue(companyRow());

        const withPhoto = await call('DELETE', '/companies/me/photo', {
            as: PROVIDER,
        });
        const without = await call('DELETE', '/companies/me/photo', {
            as: PROVIDER,
        });

        expect(withPhoto.status).toBe(200);
        expect(without.status).toBe(200);
        expect(bucket.remove).toHaveBeenCalledTimes(1);
    });

    it('clearing for a gone company is a 404', async () => {
        db.company.findUnique.mockResolvedValue(null);

        const res = await call('DELETE', '/companies/me/photo', {
            as: PROVIDER,
        });

        expect(res.status).toBe(404);
    });
});

describe('DELETE /companies/me', () => {
    async function knowsPassword() {
        db.company.findUnique.mockResolvedValue({
            password: await bcrypt.hash('current-1', 4),
        });
    }

    it('deletes the account', async () => {
        await knowsPassword();
        db.project.findFirst.mockResolvedValue(null);
        db.company.updateMany.mockResolvedValue({ count: 1 });
        db.listing.findMany.mockResolvedValue([]);

        const res = await call('DELETE', '/companies/me', {
            as: PROVIDER,
            body: { currentPassword: 'current-1' },
        });

        expect(res.status).toBe(204);
    });

    it('an ongoing project blocks it', async () => {
        await knowsPassword();
        db.project.findFirst.mockResolvedValue({ projectId: 1 });

        const res = await call('DELETE', '/companies/me', {
            as: PROVIDER,
            body: { currentPassword: 'current-1' },
        });

        expect(res.status).toBe(409);
    });

    it('an admin cannot use it', async () => {
        const res = await call('DELETE', '/companies/me', {
            as: ADMIN,
            body: { currentPassword: 'x' },
        });

        expect(res.status).toBe(403);
    });
});

describe('GET /companies', () => {
    const summary = {
        companyId: 2,
        companyName: 'Beta',
        companyDescription: null,
        companyPhoto: null,
        accountType: 'RECEIVER',
        contactEmail: null,
        phone: '0',
        website: null,
        listing: [],
    };

    it('lists by name, ascending by default, with no words', async () => {
        db.company.count.mockResolvedValue(1);
        db.company.findMany.mockResolvedValue([summary]);

        const res = await call('GET', '/companies', { as: PROVIDER });

        expect(res.body.pagination).toEqual({
            page: 1,
            pageSize: 12,
            totalItems: 1,
            totalPages: 1,
        });
        const args = db.company.findMany.mock.calls[0]![0];
        expect(args.orderBy[0]).toEqual({ companyName: 'asc' });
        expect(args.where).not.toHaveProperty('AND');
    });

    it('searches each word, name descending', async () => {
        db.company.count.mockResolvedValue(0);
        db.company.findMany.mockResolvedValue([]);

        await call(
            'GET',
            '/companies?q=react%20pay&orderBy=nameDesc&page=&pageSize=5',
            {
                as: PROVIDER,
            },
        );

        const args = db.company.findMany.mock.calls[0]![0];
        expect(args.orderBy).toEqual([
            { companyName: 'desc' },
            { companyId: 'desc' },
        ]);
        expect(args.where.AND).toHaveLength(2);
        expect(args.take).toBe(5);
    });

    it('an admin cannot search here', async () => {
        const res = await call('GET', '/companies', { as: ADMIN });

        expect(res.status).toBe(403);
    });
});

describe('other companies', () => {
    it('GET /companies/:id shows the public profile', async () => {
        db.company.findFirst.mockResolvedValue(companyRow({ companyId: 2 }));

        const res = await call('GET', '/companies/2', { as: PROVIDER });

        expect(res.status).toBe(200);
        expect(res.body.companyId).toBe(2);
    });

    it('a bad id is a 400 naming the path', async () => {
        const res = await call('GET', '/companies/abc', { as: PROVIDER });

        expect(res.status).toBe(400);
        expect(res.body.error.message).toBe('Path parameters are invalid');
    });

    it('an unknown company is a 404', async () => {
        db.company.findFirst.mockResolvedValue(null);

        const res = await call('GET', '/companies/77', { as: PROVIDER });

        expect(res.status).toBe(404);
    });

    it('lists a Provider’s reviews', async () => {
        db.company.findFirst.mockResolvedValue({ companyId: 2 });
        db.review.count.mockResolvedValue(1);
        db.review.findMany.mockResolvedValue([
            {
                reviewId: 1,
                projectId: 1,
                ...scores(5),
                comment: 'great',
                createdAt: new Date(),
                project: {
                    proposal: {
                        senderId: 2,
                        sender: brief(2),
                        listing: {
                            listingType: 'JOB',
                            companyId: 1,
                            company: brief(1),
                        },
                    },
                },
            },
        ]);

        const res = await call('GET', '/companies/2/reviews', { as: RECEIVER });

        expect(res.body.items[0].receiver.companyId).toBe(1);
        expect(res.body.pagination.totalItems).toBe(1);
    });

    it('gives a Provider’s rating summary', async () => {
        db.company.findFirst.mockResolvedValue(NO_RATING);

        const res = await call('GET', '/companies/2/reviews/summary', {
            as: RECEIVER,
        });

        expect(res.body).toEqual({ averageRating: null, ratingCount: 0 });
    });
});
