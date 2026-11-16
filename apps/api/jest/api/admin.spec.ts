/*
 * API tests for /admin/companies: list, detail, edit and delete of company
 * accounts by an administrator.
 *
 * Covers: only an admin gets in; the list with no filter, a keyword, each
 * account-type filter (PROVIDER and RECEIVER also find BOTH) and
 * includeDeleted; detail found and not; an edit of a missing, deleted,
 * receiver (provider fields refused) and provider account, with the repeated
 * tag, lost race and other errors; and a delete that is refused for each
 * reason (wrong password, gone, admin target, ongoing project, lost race)
 * before one that works.
 *
 * How: the real app on a random port; the database is the Prisma fake.
 */
import { describe, expect, it, jest } from '@jest/globals';
import bcrypt from 'bcryptjs';
import { ADMIN, call, PROVIDER, useApi } from '../helpers/http';
import { db } from '../helpers/prisma-mock';
import { companyRow, NO_RATING } from '../helpers/rows';

useApi();
jest.setTimeout(30_000);

const listRow = {
    companyId: 1,
    companyName: 'Alpha',
    companyDescription: null,
    phone: '0',
    accountType: 'PROVIDER',
    deletedAt: null,
    ...NO_RATING,
};
const detailRow = { ...companyRow(), ...NO_RATING, deletedAt: null };

describe('GET /admin/companies', () => {
    function where() {
        return db.company.count.mock.calls[0]![0].where;
    }

    it('a company is refused', async () => {
        const res = await call('GET', '/admin/companies', { as: PROVIDER });

        expect(res.status).toBe(403);
    });

    it('with no query, lists live non-admin accounts', async () => {
        db.company.count.mockResolvedValue(1);
        db.company.findMany.mockResolvedValue([listRow]);

        const res = await call('GET', '/admin/companies', { as: ADMIN });

        expect(res.body.items[0]).toMatchObject({
            companyId: 1,
            deletedAt: null,
        });
        expect(where()).toEqual({
            accountType: { not: 'ADMIN' },
            deletedAt: null,
        });
    });

    it('a keyword, a PROVIDER filter and includeDeleted', async () => {
        db.company.count.mockResolvedValue(0);
        db.company.findMany.mockResolvedValue([]);

        await call(
            'GET',
            '/admin/companies?q=50%25&filter=PROVIDER&includeDeleted=true',
            { as: ADMIN },
        );

        expect(where().OR).toHaveLength(4);
        expect(where().OR[0].companyName.contains).toBe('50\\%');
        expect(where().accountType).toEqual({ in: ['PROVIDER', 'BOTH'] });
        expect(where()).not.toHaveProperty('deletedAt');
    });

    it('an ADMIN filter finds only admins', async () => {
        db.company.count.mockResolvedValue(0);
        db.company.findMany.mockResolvedValue([]);

        await call('GET', '/admin/companies?filter=ADMIN', { as: ADMIN });

        expect(where().accountType).toEqual({ in: ['ADMIN'] });
    });
});

describe('GET /admin/companies/:id', () => {
    it('returns the detail or a 404', async () => {
        db.company.findUnique.mockResolvedValueOnce(detailRow);
        const found = await call('GET', '/admin/companies/1', { as: ADMIN });
        db.company.findUnique.mockResolvedValueOnce(null);
        const missing = await call('GET', '/admin/companies/2', { as: ADMIN });

        expect(found.body.email).toBe('alpha@mango.test');
        expect(missing.status).toBe(404);
    });
});

describe('PATCH /admin/companies/:id', () => {
    const patch = (body: unknown) =>
        call('PATCH', '/admin/companies/1', { as: ADMIN, body });

    it('a missing account is a 404; a deleted one a 409', async () => {
        db.company.findUnique.mockResolvedValueOnce(null);
        const missing = await patch({ companyName: 'X' });
        db.company.findUnique.mockResolvedValueOnce({
            accountType: 'PROVIDER',
            deletedAt: new Date(),
        });
        const deleted = await patch({ companyName: 'X' });

        expect(missing.status).toBe(404);
        expect(deleted.status).toBe(409);
    });

    it('provider fields on a receiver are a 400 naming each', async () => {
        db.company.findUnique.mockResolvedValue({
            accountType: 'RECEIVER',
            deletedAt: null,
        });

        const res = await patch({ serviceTerm: 'a', warrantyPolicy: 'b' });

        expect(res.status).toBe(400);
        expect(
            res.body.error.details.map((d: { field: string }) => d.field),
        ).toEqual(['serviceTerm', 'warrantyPolicy']);
    });

    it('a receiver’s other fields and a provider’s own fields save', async () => {
        db.company.findUnique.mockResolvedValueOnce({
            accountType: 'RECEIVER',
            deletedAt: null,
        });
        db.company.findUnique.mockResolvedValueOnce({
            accountType: 'PROVIDER',
            deletedAt: null,
        });
        db.company.update.mockResolvedValue(detailRow);

        const receiver = await patch({ companyName: 'R' });
        const provider = await patch({ serviceTerm: 'Net 7' });

        expect(receiver.status).toBe(200);
        expect(provider.status).toBe(200);
    });

    it('a repeated tag 409s; a delete mid-edit 409s; others 500', async () => {
        db.company.findUnique.mockResolvedValue({
            accountType: 'BOTH',
            deletedAt: null,
        });
        db.company.update.mockRejectedValueOnce({ code: 'P2002' });
        const repeat = await patch({ companyType: ['A', 'A'] });
        db.company.update.mockRejectedValueOnce({ code: 'P2025' });
        const race = await patch({ companyName: 'X' });
        const log = jest.spyOn(console, 'error').mockImplementation(() => {});
        db.company.update.mockRejectedValueOnce(new Error('down'));
        const other = await patch({ companyName: 'X' });
        log.mockRestore();

        expect(repeat.body.error.message).toBe('Company types must not repeat');
        expect(race.body.error.message).toBe(
            'Deleted company accounts cannot be edited',
        );
        expect(other.status).toBe(500);
    });
});

describe('DELETE /admin/companies/:id', () => {
    async function adminKnowsPassword() {
        db.company.findUnique.mockResolvedValueOnce({
            password: await bcrypt.hash('admin-pass', 4),
        });
    }
    const del = (password = 'admin-pass') =>
        call('DELETE', '/admin/companies/1', {
            as: ADMIN,
            body: { currentPassword: password },
        });

    it('a wrong admin password is a 401', async () => {
        await adminKnowsPassword();

        expect((await del('wrong')).status).toBe(401);
    });

    it('a missing or already deleted company is a 404', async () => {
        await adminKnowsPassword();
        db.company.findUnique.mockResolvedValueOnce(null);
        const missing = await del();
        await adminKnowsPassword();
        db.company.findUnique.mockResolvedValueOnce({
            accountType: 'PROVIDER',
            deletedAt: new Date(),
        });
        const deleted = await del();

        expect(missing.status).toBe(404);
        expect(deleted.status).toBe(404);
    });

    it('an admin account cannot be deleted', async () => {
        await adminKnowsPassword();
        db.company.findUnique.mockResolvedValueOnce({
            accountType: 'ADMIN',
            deletedAt: null,
        });

        const res = await del();

        expect(res.body.error.message).toBe(
            'Administrator accounts cannot be deleted',
        );
    });

    it('an ongoing project blocks it', async () => {
        await adminKnowsPassword();
        db.company.findUnique.mockResolvedValueOnce({
            accountType: 'PROVIDER',
            deletedAt: null,
        });
        db.project.findFirst.mockResolvedValue({ projectId: 1 });

        expect((await del()).status).toBe(409);
    });

    it('deletes, or 404s when another request deleted it first', async () => {
        db.project.findFirst.mockResolvedValue(null);
        db.listing.findMany.mockResolvedValue([]);
        const live = { accountType: 'RECEIVER', deletedAt: null };

        await adminKnowsPassword();
        db.company.findUnique.mockResolvedValueOnce(live);
        db.company.updateMany.mockResolvedValueOnce({ count: 1 });
        const ok = await del();
        await adminKnowsPassword();
        db.company.findUnique.mockResolvedValueOnce(live);
        db.company.updateMany.mockResolvedValueOnce({ count: 0 });
        const race = await del();

        expect(ok.status).toBe(204);
        expect(race.status).toBe(404);
    });
});
