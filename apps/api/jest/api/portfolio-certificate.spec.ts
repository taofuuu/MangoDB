/*
 * API tests for /portfolios and /certificates, the two multipart resources
 * a provider shows on its profile.
 *
 * Portfolios: list by service, company or both (none is a 400); one by id;
 * create with and without a description, with no image, and with a link the
 * service already has; edit with text only, an image only, nothing, a
 * duplicate link, a row gone mid-edit and another error; delete.
 *
 * Certificates: my list and another company's; create with and without an
 * image and with each optional field; edit with text, a new image, nothing,
 * and an expiry before the merged issue date; delete with and without a
 * stored image, and a row gone mid-delete.
 *
 * How: the real app on a random port; the database and storage are fakes.
 */
import { describe, expect, it, jest } from '@jest/globals';
import {
    call,
    formWith,
    PNG,
    PROVIDER,
    RECEIVER,
    useApi,
} from '../helpers/http';
import { db } from '../helpers/prisma-mock';
import { bucket, publicUrl } from '../helpers/storage-mock';

useApi();
jest.setTimeout(30_000);

const image = (field: string) => ({ field, bytes: PNG, type: 'image/png' });

const portfolioRow = {
    portfolioId: 5,
    listingId: 10,
    portfolioName: 'Shop',
    portfolioDescription: null,
    developmentDate: new Date('2025-01-02T00:00:00Z'),
    portfolioImage: publicUrl('portfolio', 'portfolios/a.png'),
    portfolioLink: 'https://shop.test',
};
const ownedPortfolio = {
    portfolioImage: portfolioRow.portfolioImage,
    service: { listing: { companyId: PROVIDER.companyId } },
};
const ownedService = {
    companyId: PROVIDER.companyId,
    listingType: 'SERVICE',
    listingStatus: 'OPEN',
    minBudget: null,
    maxBudget: null,
};
const portfolioFields = {
    serviceId: '10',
    portfolioName: 'Shop',
    developmentDate: '2025-01-02',
    portfolioLink: 'https://shop.test',
};

describe('GET /portfolios', () => {
    it('filters by service, company, or both', async () => {
        db.servicePortfolio.findMany.mockResolvedValue([portfolioRow]);

        const one = await call('GET', '/portfolios?serviceId=10');
        await call('GET', '/portfolios?companyId=1');
        await call('GET', '/portfolios?serviceId=10&companyId=1');

        expect(one.body[0]).toMatchObject({
            serviceId: 10,
            developmentDate: '2025-01-02',
        });
        const wheres = db.servicePortfolio.findMany.mock.calls.map(
            (c) => c[0].where,
        );
        expect(wheres[0]).toEqual({ listingId: 10 });
        expect(wheres[1]).toEqual({ service: { listing: { companyId: 1 } } });
        expect(Object.keys(wheres[2])).toEqual(['listingId', 'service']);
    });

    it('no filter is a 400', async () => {
        const res = await call('GET', '/portfolios');

        expect(res.status).toBe(400);
    });

    it('one by id, or a 404', async () => {
        db.servicePortfolio.findUnique.mockResolvedValueOnce(portfolioRow);
        const found = await call('GET', '/portfolios/5');
        db.servicePortfolio.findUnique.mockResolvedValueOnce(null);
        const missing = await call('GET', '/portfolios/6');

        expect(found.body.portfolioId).toBe(5);
        expect(missing.status).toBe(404);
    });
});

describe('POST /portfolios', () => {
    it('creates one with its image', async () => {
        db.listing.findUnique.mockResolvedValue(ownedService);
        db.servicePortfolio.create.mockResolvedValue(portfolioRow);

        const res = await call('POST', '/portfolios', {
            as: PROVIDER,
            form: formWith(
                { ...portfolioFields, portfolioDescription: 'Online shop' },
                image('portfolioImage'),
            ),
        });

        expect(res.status).toBe(201);
        expect(
            db.servicePortfolio.create.mock.calls[0]![0].data
                .portfolioDescription,
        ).toBe('Online shop');
    });

    it('no description is stored as null', async () => {
        db.listing.findUnique.mockResolvedValue(ownedService);
        db.servicePortfolio.create.mockResolvedValue(portfolioRow);

        await call('POST', '/portfolios', {
            as: PROVIDER,
            form: formWith(portfolioFields, image('portfolioImage')),
        });

        expect(
            db.servicePortfolio.create.mock.calls[0]![0].data
                .portfolioDescription,
        ).toBeNull();
    });

    it('no image is a 400 naming the field', async () => {
        const res = await call('POST', '/portfolios', {
            as: PROVIDER,
            form: formWith(portfolioFields),
        });

        expect(res.body.error.details[0].field).toBe('portfolioImage');
    });

    it('a link the service already has is a 409; other errors pass through', async () => {
        db.listing.findUnique.mockResolvedValue(ownedService);
        db.servicePortfolio.create.mockRejectedValueOnce({ code: 'P2002' });
        const dup = await call('POST', '/portfolios', {
            as: PROVIDER,
            form: formWith(portfolioFields, image('portfolioImage')),
        });
        const log = jest.spyOn(console, 'error').mockImplementation(() => {});
        db.servicePortfolio.create.mockRejectedValueOnce(new Error('down'));
        const other = await call('POST', '/portfolios', {
            as: PROVIDER,
            form: formWith(portfolioFields, image('portfolioImage')),
        });
        log.mockRestore();

        expect(dup.status).toBe(409);
        expect(other.status).toBe(500);
    });
});

describe('PATCH /portfolios/:id', () => {
    it('a text edit writes only the text', async () => {
        db.servicePortfolio.findUnique.mockResolvedValue(ownedPortfolio);
        db.servicePortfolio.update.mockResolvedValue(portfolioRow);

        const res = await call('PATCH', '/portfolios/5', {
            as: PROVIDER,
            form: formWith({ portfolioName: 'New', portfolioDescription: '' }),
        });

        expect(res.status).toBe(200);
        expect(db.servicePortfolio.update.mock.calls[0]![0].data).toEqual({
            portfolioName: 'New',
            portfolioDescription: null,
        });
    });

    it('an image alone replaces the old one', async () => {
        db.servicePortfolio.findUnique.mockResolvedValue(ownedPortfolio);
        db.servicePortfolio.update.mockResolvedValue(portfolioRow);

        await call('PATCH', '/portfolios/5', {
            as: PROVIDER,
            form: formWith({}, image('portfolioImage')),
        });

        expect(
            db.servicePortfolio.update.mock.calls[0]![0].data.portfolioImage,
        ).toEqual(expect.stringContaining('portfolios/'));
        expect(bucket.remove).toHaveBeenCalledWith(['portfolios/a.png']);
    });

    it('nothing to change is a 400', async () => {
        const res = await call('PATCH', '/portfolios/5', {
            as: PROVIDER,
            form: formWith({}),
        });

        expect(res.status).toBe(400);
    });

    it('a duplicate link 409s, a vanished row 404s, others 500', async () => {
        db.servicePortfolio.findUnique.mockResolvedValue(ownedPortfolio);
        const edit = () =>
            call('PATCH', '/portfolios/5', {
                as: PROVIDER,
                form: formWith({ portfolioLink: 'https://b.test' }),
            });
        db.servicePortfolio.update.mockRejectedValueOnce({ code: 'P2002' });
        const dup = await edit();
        db.servicePortfolio.update.mockRejectedValueOnce({ code: 'P2025' });
        const gone = await edit();
        const log = jest.spyOn(console, 'error').mockImplementation(() => {});
        db.servicePortfolio.update.mockRejectedValueOnce(new Error('down'));
        const other = await edit();
        log.mockRestore();

        expect(dup.status).toBe(409);
        expect(gone.status).toBe(404);
        expect(other.status).toBe(500);
    });
});

describe('DELETE /portfolios/:id', () => {
    it('deletes the row and its image', async () => {
        db.servicePortfolio.findUnique.mockResolvedValue(ownedPortfolio);
        db.servicePortfolio.delete.mockResolvedValue({
            portfolioImage: portfolioRow.portfolioImage,
        });

        const res = await call('DELETE', '/portfolios/5', { as: PROVIDER });

        expect(res.status).toBe(204);
        expect(bucket.remove).toHaveBeenCalledTimes(1);
    });
});

const certRow = {
    certificateId: 7,
    certTitle: 'AWS',
    certImage: null as string | null,
    credentialId: null,
    credentialUrl: null,
    expireMonth: 6,
    expireYear: 2027,
    issueMonth: 1,
    issueYear: 2024,
    organization: 'Amazon',
};

describe('GET /certificates', () => {
    it('lists my certificates and another company’s', async () => {
        db.certificate.findMany.mockResolvedValue([certRow]);

        const mine = await call('GET', '/certificates/mine', { as: PROVIDER });
        const theirs = await call('GET', '/certificates?companyId=1', {
            as: RECEIVER,
        });

        expect(mine.body[0].certificateId).toBe(7);
        expect(theirs.body).toHaveLength(1);
    });

    it('a companyId is required', async () => {
        const res = await call('GET', '/certificates', { as: RECEIVER });

        expect(res.status).toBe(400);
    });
});

describe('POST /certificates', () => {
    it('without an image, missing fields are null', async () => {
        db.certificate.create.mockResolvedValue(certRow);

        const res = await call('POST', '/certificates', {
            as: PROVIDER,
            form: formWith({ certTitle: 'AWS', organization: 'Amazon' }),
        });

        expect(res.status).toBe(201);
        expect(db.certificate.create.mock.calls[0]![0].data).toMatchObject({
            issueMonth: null,
            expireYear: null,
            credentialId: null,
            credentialUrl: null,
            certImage: null,
        });
    });

    it('with an image and every field', async () => {
        db.certificate.create.mockResolvedValue(certRow);

        await call('POST', '/certificates', {
            as: PROVIDER,
            form: formWith(
                {
                    certTitle: 'AWS',
                    organization: 'Amazon',
                    issueMonth: '1',
                    issueYear: '2024',
                    expireMonth: '6',
                    expireYear: '2027',
                    credentialId: 'ABC',
                    credentialUrl: 'https://cred.test',
                },
                image('certImage'),
            ),
        });

        expect(db.certificate.create.mock.calls[0]![0].data).toMatchObject({
            issueYear: 2024,
            credentialId: 'ABC',
            certImage: expect.stringContaining('certificates/'),
        });
    });

    it('an expiry before the issue date, or a future issue year, is a 400', async () => {
        const res = await call('POST', '/certificates', {
            as: PROVIDER,
            form: formWith({
                certTitle: 'AWS',
                organization: 'Amazon',
                issueMonth: '6',
                issueYear: '2024',
                expireMonth: '1',
                expireYear: '2024',
            }),
        });
        const future = await call('POST', '/certificates', {
            as: PROVIDER,
            form: formWith({
                certTitle: 'AWS',
                organization: 'Amazon',
                issueYear: '2999',
                expireYear: '2999',
            }),
        });

        expect(res.body.error.details[0].message).toBe(
            'Expiration date cannot be before the issue date',
        );
        expect(future.status).toBe(400);
    });
});

describe('PATCH /certificates/:id', () => {
    it('a text edit and an image edit', async () => {
        db.certificate.findFirst.mockResolvedValue({
            ...certRow,
            certImage: publicUrl('certificate', 'certificates/old.png'),
        });
        db.certificate.update.mockResolvedValue(certRow);

        const text = await call('PATCH', '/certificates/7', {
            as: PROVIDER,
            form: formWith({ certTitle: 'GCP' }),
        });
        const withImage = await call('PATCH', '/certificates/7', {
            as: PROVIDER,
            form: formWith({}, image('certImage')),
        });

        expect(text.status).toBe(200);
        expect(withImage.status).toBe(200);
        expect(db.certificate.update.mock.calls[0]![0].data).toEqual({
            certTitle: 'GCP',
        });
        expect(bucket.remove).toHaveBeenCalledWith(['certificates/old.png']);
    });

    it('an expiry moved before the stored issue date is a 400', async () => {
        db.certificate.findFirst.mockResolvedValue(certRow);

        const res = await call('PATCH', '/certificates/7', {
            as: PROVIDER,
            form: formWith({ expireYear: '2023' }),
        });

        expect(res.body.error.details).toEqual([
            {
                field: 'expireYear',
                message: 'Expiration date cannot be before the issue date',
            },
        ]);
    });

    it('nothing to change is a 400', async () => {
        const res = await call('PATCH', '/certificates/7', {
            as: PROVIDER,
            form: formWith({}),
        });

        expect(res.status).toBe(400);
    });
});

describe('DELETE /certificates/:id', () => {
    it('removes a stored image only when there is one', async () => {
        db.certificate.findFirst.mockResolvedValueOnce({
            ...certRow,
            certImage: publicUrl('certificate', 'certificates/a.png'),
        });
        db.certificate.findFirst.mockResolvedValueOnce(certRow);
        db.certificate.delete.mockResolvedValue({});

        const withImage = await call('DELETE', '/certificates/7', {
            as: PROVIDER,
        });
        const without = await call('DELETE', '/certificates/7', {
            as: PROVIDER,
        });

        expect(withImage.status).toBe(204);
        expect(without.status).toBe(204);
        expect(bucket.remove).toHaveBeenCalledTimes(1);
    });

    it('a row gone mid-delete is a 404', async () => {
        db.certificate.findFirst.mockResolvedValue(certRow);
        db.certificate.delete.mockRejectedValue({ code: 'P2025' });

        const res = await call('DELETE', '/certificates/7', { as: PROVIDER });

        expect(res.status).toBe(404);
    });
});
