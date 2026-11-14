/*
 * Unit tests for the small helpers in src/lib: errors (api-error,
 * prisma-errors), storage and saveWithUpload, the row mappers (company
 * profile, admin company, notification, portfolio, proposal, quotation,
 * review, rating), the ownership checks (category, certificate, portfolio,
 * quotation party, public company), identity checks, listing helpers and the
 * company soft delete.
 *
 * Each helper is tested on every branch it has: present and missing rows,
 * owner and stranger, null and set optional columns, and each Prisma error
 * code it translates or passes on.
 *
 * How: the database is the Prisma fake and storage is the Supabase fake, so
 * each test sets up only the rows the helper reads.
 */
import { describe, expect, it, jest } from '@jest/globals';
import { ApiError } from '../../src/lib/api-error';
import {
    isRecordNotFound,
    isUniqueViolation,
    orConflict,
    orDuplicate,
    orNotFound,
    uniqueViolationDetails,
    uniqueViolationFields,
} from '../../src/lib/prisma-errors';
import {
    putStorageFile,
    removeFromStorage,
    removeFromStorageByUrl,
    signStorageUrls,
    uploadToStorage,
} from '../../src/lib/storage';
import { saveWithUpload } from '../../src/lib/upload';
import { assertCategoriesExist, toCategory } from '../../src/lib/category';
import {
    assertCertificateOwned,
    toCertificate,
} from '../../src/lib/certificate';
import { findPublicCompany } from '../../src/lib/company-lookup';
import { containsWord, escapeLike, splitWords } from '../../src/lib/search';
import { averageScore, getRating } from '../../src/lib/rating';
import { toCompanyReview } from '../../src/lib/review';
import {
    companyProfileUpdateData,
    companyTypeRepeat,
    toCompanyBrief,
    toCompanyProfile,
    toPublicCompanyProfile,
} from '../../src/lib/company-profile';
import {
    assertCompanyIdentityAvailable,
    checkCompanyIdentityAvailability,
    identityConflict,
} from '../../src/lib/company-identity';
import {
    toCompanyAccountDetail,
    toCompanyAccountSummary,
} from '../../src/lib/admin-company';
import { notifyOtherParty, toNotification } from '../../src/lib/notification';
import {
    assertPortfolioOwned,
    portfolioLinkConflict,
    toServicePortfolio,
} from '../../src/lib/portfolio';
import {
    findPendingProposalFor,
    setProposalStatus,
    toProposalStatusCounts,
    toSentProposal,
} from '../../src/lib/proposal';
import { assertQuotationParty, toQuotations } from '../../src/lib/quotation';
import {
    assertBudgetRange,
    assertListingOwned,
    categoryReplace,
    closeOpenListing,
    listingBudgetWhere,
    rejectPendingProposals,
} from '../../src/lib/listing';
import { softDeleteCompany } from '../../src/lib/company-deletion';
import { hasOngoingProject } from '../../src/lib/project-eligibility';
import { db } from '../helpers/prisma-mock';
import { bucket, publicUrl } from '../helpers/storage-mock';
import { brief, companyRow, NO_RATING, scores } from '../helpers/rows';
import type { Prisma } from '../../src/generated/prisma/client';

const tx = db as unknown as Prisma.TransactionClient;
const P2002 = { code: 'P2002' };
const P2025 = { code: 'P2025' };
const file = {
    mimetype: 'image/png',
    buffer: Buffer.from('x'),
} as Express.Multer.File;

function quiet() {
    return jest.spyOn(console, 'error').mockImplementation(() => {});
}

describe('api-error', () => {
    it('keeps details only when given, and has default messages', () => {
        expect(ApiError.badRequest('x').details).toBeUndefined();
        expect(
            ApiError.badRequest('x', [{ field: 'a', message: 'b' }]).details,
        ).toHaveLength(1);
        expect(ApiError.unauthorized().message).toBe('Authentication required');
        expect(ApiError.forbidden().message).toBe('Insufficient permissions');
        expect(ApiError.notFound().message).toBe('Resource not found');
        expect(ApiError.tooManyRequests('slow').status).toBe(429);
    });
});

describe('prisma-errors', () => {
    it('reads the error code only from an object', () => {
        expect(isUniqueViolation(null)).toBe(false);
        expect(isUniqueViolation('P2002')).toBe(false);
        expect(isUniqueViolation(P2002)).toBe(true);
        expect(isRecordNotFound(null)).toBe(false);
        expect(isRecordNotFound(7)).toBe(false);
        expect(isRecordNotFound(P2025)).toBe(true);
    });

    it('names the columns from the index, or none when it cannot', () => {
        const withIndex = {
            code: 'P2002',
            meta: {
                driverAdapterError: {
                    cause: { constraint: { index: 'company_username_key' } },
                },
            },
        };

        expect(uniqueViolationFields(P2025, ['username'])).toBeNull();
        expect(uniqueViolationFields(P2002, ['username'])).toEqual([]);
        expect(uniqueViolationFields(withIndex, ['username', 'email'])).toEqual(
            ['username'],
        );
        const camelIndex = {
            code: 'P2002',
            meta: {
                driverAdapterError: {
                    cause: {
                        constraint: {
                            index: 'service_portfolio_listing_id_portfolio_link_key',
                        },
                    },
                },
            },
        };
        expect(uniqueViolationFields(camelIndex, ['portfolioLink'])).toEqual([
            'portfolioLink',
        ]);
        expect(uniqueViolationDetails([])).toEqual([
            { field: '(body)', message: 'Already registered' },
        ]);
    });

    it('turns P2025 into 404 or 409 and P2002 into 409, passing others on', async () => {
        const other = new Error('other');

        await expect(orNotFound(Promise.resolve(1), 'gone')).resolves.toBe(1);
        await expect(orNotFound(Promise.reject(P2025), 'gone')).rejects.toThrow(
            'gone',
        );
        await expect(orNotFound(Promise.reject(other), 'gone')).rejects.toBe(
            other,
        );
        await expect(orConflict(Promise.resolve(2), 'state')).resolves.toBe(2);
        await expect(
            orConflict(Promise.reject(P2025), 'state'),
        ).rejects.toMatchObject({ status: 409 });
        await expect(orConflict(Promise.reject(other), 'state')).rejects.toBe(
            other,
        );
        await expect(orDuplicate(Promise.resolve(3), 'dup')).resolves.toBe(3);
        await expect(
            orDuplicate(Promise.reject(P2002), 'dup'),
        ).rejects.toMatchObject({ status: 409 });
        await expect(orDuplicate(Promise.reject(other), 'dup')).rejects.toBe(
            other,
        );
    });
});

describe('storage', () => {
    it('uploads under a random name with the type extension', async () => {
        const res = await uploadToStorage(file, 'profile', '1');

        expect(res.path).toMatch(/^1\/\d+-[0-9a-f-]+\.png$/);
        expect(res.url).toContain(res.path);
    });

    it('an unknown type is stored as .bin', async () => {
        const res = await uploadToStorage(
            { ...file, mimetype: 'text/plain' },
            'profile',
            '1',
        );

        expect(res.path).toMatch(/\.bin$/);
    });

    it('a failed upload is a 500 that asks to retry', async () => {
        const log = quiet();
        bucket.upload.mockResolvedValue({ error: { message: 'full' } });

        await expect(uploadToStorage(file, 'profile', '1')).rejects.toThrow(
            'The file could not be stored. Try again.',
        );
        log.mockRestore();
    });

    it('a remove that fails or throws is only logged', async () => {
        const log = quiet();
        bucket.remove.mockResolvedValueOnce({ error: { message: 'no' } });
        bucket.remove.mockRejectedValueOnce(new Error('network'));

        await removeFromStorage('a', 'profile');
        await removeFromStorage('b', 'profile');

        expect(log).toHaveBeenCalledTimes(2);
        log.mockRestore();
    });

    it('a URL that is not ours is not removed', async () => {
        const log = quiet();

        await removeFromStorageByUrl('https://elsewhere.test/x.png', 'profile');

        expect(bucket.remove).not.toHaveBeenCalled();
        log.mockRestore();
    });

    it('a URL of ours is removed by its path', async () => {
        await removeFromStorageByUrl(
            publicUrl('profile', '1/a.png'),
            'profile',
        );

        expect(bucket.remove).toHaveBeenCalledWith(['1/a.png']);
    });

    it('putStorageFile replaces in place, or throws with the path', async () => {
        await expect(
            putStorageFile(
                'profile',
                'seed/a.png',
                Buffer.from('x'),
                'image/png',
            ),
        ).resolves.toContain('seed/a.png');

        bucket.upload.mockResolvedValue({ error: { message: 'denied' } });
        await expect(
            putStorageFile(
                'profile',
                'seed/a.png',
                Buffer.from('x'),
                'image/png',
            ),
        ).rejects.toThrow('Could not upload seed/a.png: denied');
    });

    describe('signStorageUrls', () => {
        const ours = publicUrl('quotation', '5/q.pdf');
        const other = 'https://elsewhere.test/q.pdf';

        it('no URL of ours means nothing to sign', async () => {
            await expect(
                signStorageUrls([other], 'quotation', 60),
            ).resolves.toEqual([other]);
            expect(bucket.createSignedUrls).not.toHaveBeenCalled();
        });

        it('swaps ours for signed links and keeps the rest', async () => {
            bucket.createSignedUrls.mockResolvedValue({
                data: [{ path: '5/q.pdf', signedUrl: 'https://signed/q' }],
                error: null,
            });

            await expect(
                signStorageUrls([ours, other], 'quotation', 60),
            ).resolves.toEqual(['https://signed/q', other]);
        });

        it('a path the signer skipped keeps its stored URL', async () => {
            await expect(
                signStorageUrls([ours], 'quotation', 60),
            ).resolves.toEqual([ours]);
        });

        it('a signing error or a throw gives back the stored URLs', async () => {
            const log = quiet();
            bucket.createSignedUrls.mockResolvedValueOnce({
                data: null,
                error: { message: 'no' },
            });
            bucket.createSignedUrls.mockRejectedValueOnce(new Error('down'));

            await expect(
                signStorageUrls([ours], 'quotation', 60),
            ).resolves.toEqual([ours]);
            await expect(
                signStorageUrls([ours], 'quotation', 60),
            ).resolves.toEqual([ours]);
            log.mockRestore();
        });
    });
});

describe('saveWithUpload', () => {
    it('removes the new file when the write fails', async () => {
        const boom = new Error('write failed');

        await expect(
            saveWithUpload(file, 'profile', '1', () => Promise.reject(boom)),
        ).rejects.toBe(boom);
        expect(bucket.remove).toHaveBeenCalledTimes(1);
    });

    it('removes the replaced file after the write, and only then', async () => {
        const old = publicUrl('profile', '1/old.png');

        await expect(
            saveWithUpload(file, 'profile', '1', async (url) => url, old),
        ).resolves.toContain('/1/');
        expect(bucket.remove).toHaveBeenCalledWith(['1/old.png']);
    });

    it('no replaced file means nothing removed', async () => {
        await saveWithUpload(file, 'profile', '1', async () => 1, null);

        expect(bucket.remove).not.toHaveBeenCalled();
    });
});

describe('category and certificate', () => {
    it('no ids need no query', async () => {
        await assertCategoriesExist([]);

        expect(db.category.findMany).not.toHaveBeenCalled();
    });

    it('a repeated id counts once; a missing one is a field error', async () => {
        db.category.findMany.mockResolvedValueOnce([{ categoryId: 1 }]);
        await expect(assertCategoriesExist([1, 1])).resolves.toBeUndefined();

        db.category.findMany.mockResolvedValueOnce([{ categoryId: 1 }]);
        await expect(assertCategoriesExist([1, 2])).rejects.toMatchObject({
            details: [expect.objectContaining({ field: 'categoryIds' })],
        });
    });

    it('maps a category row', () => {
        expect(toCategory({ categoryId: 1, categoryName: 'Web' })).toEqual({
            categoryId: 1,
            categoryName: 'Web',
        });
    });

    it('another provider’s certificate is 404; one’s own is returned', async () => {
        const row = {
            certificateId: 1,
            certTitle: 'AWS',
            certImage: 'u',
            credentialId: null,
            credentialUrl: null,
            expireMonth: null,
            expireYear: null,
            issueMonth: 1,
            issueYear: 2024,
            organization: 'Amazon',
        };
        db.certificate.findFirst.mockResolvedValueOnce(null);
        await expect(assertCertificateOwned(1, 2)).rejects.toThrow(
            'Certificate not found',
        );

        db.certificate.findFirst.mockResolvedValueOnce(row);
        await expect(assertCertificateOwned(1, 1)).resolves.toEqual(row);
        expect(toCertificate(row)).toEqual(row);
    });

    it('findPublicCompany is 404 for no row and returns a row', async () => {
        db.company.findFirst.mockResolvedValueOnce(null);
        await expect(findPublicCompany(1, { companyId: true })).rejects.toThrow(
            'Company not found',
        );

        db.company.findFirst.mockResolvedValueOnce({ companyId: 1 });
        await expect(
            findPublicCompany(1, { companyId: true }),
        ).resolves.toEqual({
            companyId: 1,
        });
    });
});

describe('search and rating', () => {
    it('escapes LIKE wildcards and splits words', () => {
        expect(escapeLike('50%_off\\')).toBe('50\\%\\_off\\\\');
        expect(splitWords(undefined)).toEqual([]);
        expect(splitWords('  react   pay ')).toEqual(['react', 'pay']);
        expect(containsWord('a%')).toEqual({
            contains: 'a\\%',
            mode: 'insensitive',
        });
    });

    it('averages every score to one decimal, or null for none', () => {
        expect(averageScore([])).toBeNull();
        expect(averageScore([scores(4), scores(5)])).toBe(4.5);
    });

    it('counts reviews from both paths and skips unreviewed projects', () => {
        const rating = getRating({
            proposal: [
                { project: { review: scores(4) } },
                { project: { review: null } },
                { project: null },
            ],
            listing: [{ proposal: [{ project: { review: scores(2) } }] }],
        });

        expect(rating).toEqual({ averageRating: 3, ratingCount: 2 });
    });

    it('a review names the Receiver by listing type', () => {
        const base = {
            reviewId: 1,
            projectId: 1,
            ...scores(5),
            comment: null,
            createdAt: new Date('2026-01-01T00:00:00Z'),
        };
        const proposal = {
            senderId: 2,
            sender: brief(2, 'Sender'),
        };

        const onJob = toCompanyReview({
            ...base,
            project: {
                proposal: {
                    ...proposal,
                    listing: {
                        listingType: 'JOB',
                        companyId: 3,
                        company: brief(3, 'Owner'),
                    },
                },
            },
        });
        const onService = toCompanyReview({
            ...base,
            project: {
                proposal: {
                    ...proposal,
                    listing: {
                        listingType: 'SERVICE',
                        companyId: 3,
                        company: brief(3, 'Owner'),
                    },
                },
            },
        });

        expect(onJob.receiver.companyName).toBe('Owner');
        expect(onService.receiver.companyName).toBe('Sender');
        expect(onJob.createdAt).toBe('2026-01-01T00:00:00.000Z');
    });
});

describe('company-profile', () => {
    it('a listing with no company is a 500', () => {
        expect(() => toCompanyBrief(null)).toThrow(
            'Listing has no owning company',
        );
    });

    it('flattens tags and the provider row, or nulls for a receiver', () => {
        const provider = toCompanyProfile(companyRow());
        const receiver = toCompanyProfile(companyRow({ provider: null }));
        const publicProvider = toPublicCompanyProfile(companyRow());
        const publicReceiver = toPublicCompanyProfile(
            companyRow({ provider: null }),
        );

        expect(provider.companyType).toEqual(['Software']);
        expect(provider.serviceTerm).toBe('Net 30');
        expect(provider.warrantyPolicy).toBeNull();
        expect(receiver.serviceTerm).toBeNull();
        expect(publicProvider.serviceTerm).toBe('Net 30');
        expect(publicReceiver.warrantyPolicy).toBeNull();
    });

    it('builds the update with tags and provider fields only when sent', () => {
        expect(companyProfileUpdateData({ companyName: 'A' })).toEqual({
            companyName: 'A',
        });
        expect(
            companyProfileUpdateData({
                companyType: ['Software'],
                serviceTerm: 'Net 7',
            }),
        ).toEqual({
            companyType: {
                deleteMany: {},
                create: [{ companyType: 'Software' }],
            },
            provider: {
                upsert: {
                    create: { serviceTerm: 'Net 7' },
                    update: { serviceTerm: 'Net 7' },
                },
            },
        });
    });

    it('a repeated tag is a 409; anything else is not its business', () => {
        expect(companyTypeRepeat(P2002)?.status).toBe(409);
        expect(companyTypeRepeat(new Error('x'))).toBeNull();
    });
});

describe('company-identity', () => {
    it('blank username or email is a 400', async () => {
        await expect(
            checkCompanyIdentityAvailability({
                username: ' ',
                email: 'a@b.test',
            }),
        ).rejects.toThrow('Username and email must not be empty');
        await expect(
            checkCompanyIdentityAvailability({ username: 'a', email: ' ' }),
        ).rejects.toThrow('Username and email must not be empty');
    });

    it('reports each field, ignoring case', async () => {
        db.$queryRaw.mockResolvedValue([
            { username: 'Alpha', email: 'x@y.test' },
        ]);

        await expect(
            checkCompanyIdentityAvailability({
                username: ' ALPHA ',
                email: 'a@b.test',
            }),
        ).resolves.toEqual({
            username: 'alpha',
            email: 'a@b.test',
            usernameAvailable: false,
            emailAvailable: true,
        });
    });

    it('asking about nothing matches nothing, without a query', async () => {
        await expect(
            assertCompanyIdentityAvailable({}),
        ).resolves.toBeUndefined();

        expect(db.$queryRaw).not.toHaveBeenCalled();
    });

    it('a taken email on an edit is a 409 naming it', async () => {
        db.$queryRaw.mockResolvedValue([
            { username: 'other', email: 'A@B.test' },
        ]);

        await expect(
            assertCompanyIdentityAvailable({ email: 'a@b.test' }, 1),
        ).rejects.toMatchObject({
            status: 409,
            details: [
                { field: 'email', message: 'This email is already registered' },
            ],
        });
    });

    it('a free username passes', async () => {
        db.$queryRaw.mockResolvedValue([]);

        await expect(
            assertCompanyIdentityAvailable({ username: 'new' }),
        ).resolves.toBeUndefined();
    });

    it('identityConflict is a 409 only for a unique violation', () => {
        expect(identityConflict(P2002)?.status).toBe(409);
        expect(identityConflict(P2025)).toBeNull();
    });
});

describe('admin-company mappers', () => {
    const summary = {
        companyId: 1,
        companyName: 'A',
        companyDescription: null,
        phone: '0',
        accountType: 'PROVIDER',
        ...NO_RATING,
    };

    it('deletedAt is null or an ISO string', () => {
        const at = new Date('2026-02-01T00:00:00Z');

        expect(
            toCompanyAccountSummary({ ...summary, deletedAt: null }).deletedAt,
        ).toBeNull();
        expect(
            toCompanyAccountSummary({ ...summary, deletedAt: at }).deletedAt,
        ).toBe(at.toISOString());
        expect(
            toCompanyAccountDetail({
                ...companyRow(),
                ...NO_RATING,
                deletedAt: null,
            }).deletedAt,
        ).toBeNull();
        expect(
            toCompanyAccountDetail({
                ...companyRow(),
                ...NO_RATING,
                deletedAt: at,
            }).deletedAt,
        ).toBe(at.toISOString());
    });
});

describe('notification', () => {
    const row = {
        notificationId: 1,
        notificationType: 'PROPOSAL_REJECTED',
        readAt: null,
        createdAt: new Date('2026-01-01T00:00:00Z'),
        sender: brief(),
        proposal: {
            listing: { listingId: 4, listingType: 'JOB', listingTitle: 'T' },
            project: null,
        },
    };

    it('maps unread with no project, and read with one', () => {
        expect(toNotification(row)).toMatchObject({
            projectId: null,
            readAt: null,
        });
        expect(
            toNotification({
                ...row,
                readAt: new Date('2026-01-02T00:00:00Z'),
                proposal: { ...row.proposal, project: { projectId: 8 } },
            }),
        ).toMatchObject({ projectId: 8, readAt: '2026-01-02T00:00:00.000Z' });
    });

    it('notifies the party that did not act', async () => {
        const party = { proposalId: 1, providerId: 10, receiverId: 20 };

        await notifyOtherParty(
            tx,
            { ...party, myRole: 'provider' },
            'PROJECT_STARTED' as never,
        );
        await notifyOtherParty(
            tx,
            { ...party, myRole: 'receiver' },
            'PROJECT_STARTED' as never,
        );

        expect(db.notification.create.mock.calls.map((c) => c[0].data)).toEqual(
            [
                expect.objectContaining({ senderId: 10, recipientId: 20 }),
                expect.objectContaining({ senderId: 20, recipientId: 10 }),
            ],
        );
    });
});

describe('portfolio', () => {
    it('is 404 when missing, 403 for another company, else the image', async () => {
        db.servicePortfolio.findUnique.mockResolvedValueOnce(null);
        await expect(assertPortfolioOwned(1, 1)).rejects.toThrow(
            'Portfolio not found',
        );

        const row = {
            portfolioImage: 'img',
            service: { listing: { companyId: 1 } },
        };
        db.servicePortfolio.findUnique.mockResolvedValueOnce(row);
        await expect(assertPortfolioOwned(1, 2)).rejects.toMatchObject({
            status: 403,
        });

        db.servicePortfolio.findUnique.mockResolvedValueOnce(row);
        await expect(assertPortfolioOwned(1, 1)).resolves.toEqual({
            portfolioImage: 'img',
        });
    });

    it('maps the date and the duplicate-link error', () => {
        expect(
            toServicePortfolio({
                portfolioId: 1,
                listingId: 2,
                portfolioName: 'P',
                portfolioDescription: null,
                developmentDate: new Date('2025-05-06T00:00:00Z'),
                portfolioImage: 'i',
                portfolioLink: 'l',
            }),
        ).toMatchObject({ serviceId: 2, developmentDate: '2025-05-06' });
        expect(portfolioLinkConflict(P2002)?.status).toBe(409);
        expect(portfolioLinkConflict(P2025)).toBeNull();
    });
});

describe('proposal', () => {
    it('counts each status into its chip', () => {
        expect(
            toProposalStatusCounts([
                { proposalStatus: 'PENDING', _count: { _all: 2 } },
                { proposalStatus: 'ACCEPTED', _count: { _all: 1 } },
                { proposalStatus: 'REJECTED', _count: { _all: 3 } },
                { proposalStatus: 'OTHER', _count: { _all: 4 } },
            ]),
        ).toEqual({ total: 10, pending: 2, accepted: 1, rejected: 3 });
    });

    it('a sent proposal shows its project, or null before one', () => {
        const row = {
            proposalId: 1,
            listingId: 2,
            senderId: 3,
            proposalBudget: 100 as unknown as Prisma.Decimal,
            proposalTerms: 't',
            duration: 5 as unknown as Prisma.Decimal,
            proposalStatus: 'PENDING',
            createdAt: new Date(),
            listing: {
                listingTitle: 'L',
                listingType: 'JOB',
                company: brief(),
            },
        };

        expect(toSentProposal({ ...row, project: null }).projectId).toBeNull();
        expect(
            toSentProposal({ ...row, project: { projectId: 9 } }).projectId,
        ).toBe(9);
    });

    it('findPendingProposalFor: 404, 403, 409, then the proposal', async () => {
        const pending = {
            proposalStatus: 'PENDING',
            listing: { companyId: 1 },
        };
        db.proposal.findUnique.mockResolvedValueOnce(null);
        await expect(findPendingProposalFor(tx, 1, 1)).rejects.toMatchObject({
            status: 404,
        });
        db.proposal.findUnique.mockResolvedValueOnce(pending);
        await expect(findPendingProposalFor(tx, 1, 2)).rejects.toMatchObject({
            status: 403,
        });
        db.proposal.findUnique.mockResolvedValueOnce({
            ...pending,
            proposalStatus: 'ACCEPTED',
        });
        await expect(findPendingProposalFor(tx, 1, 1)).rejects.toMatchObject({
            status: 409,
        });
        db.proposal.findUnique.mockResolvedValueOnce(pending);
        await expect(findPendingProposalFor(tx, 1, 1)).resolves.toBe(pending);
    });

    it('setProposalStatus is a 409 when nothing was pending', async () => {
        db.proposal.updateMany.mockResolvedValueOnce({ count: 0 });
        await expect(
            setProposalStatus(tx, 1, 'ACCEPTED'),
        ).rejects.toMatchObject({ status: 409 });
        db.proposal.updateMany.mockResolvedValueOnce({ count: 1 });
        await expect(
            setProposalStatus(tx, 1, 'REJECTED'),
        ).resolves.toBeUndefined();
    });
});

describe('quotation', () => {
    const row = {
        projectId: 5,
        project: {
            proposalId: 6,
            projectStatus: 'IN_PROGRESS',
            proposal: {
                senderId: 2,
                listing: { listingType: 'JOB', companyId: 1 },
            },
        },
    };

    it('is 404 when missing or for an outsider', async () => {
        db.quotation.findUnique.mockResolvedValueOnce(null);
        await expect(assertQuotationParty(1, 1)).rejects.toMatchObject({
            status: 404,
        });
        db.quotation.findUnique.mockResolvedValueOnce(row);
        await expect(assertQuotationParty(1, 99)).rejects.toMatchObject({
            status: 404,
        });
    });

    it('names the caller’s role on the project', async () => {
        db.quotation.findUnique.mockResolvedValueOnce(row);
        await expect(assertQuotationParty(1, 2)).resolves.toMatchObject({
            myRole: 'provider',
            providerId: 2,
            receiverId: 1,
        });
        db.quotation.findUnique.mockResolvedValueOnce(row);
        await expect(assertQuotationParty(1, 1)).resolves.toMatchObject({
            myRole: 'receiver',
        });
    });

    it('sends each file as a signed link', async () => {
        bucket.createSignedUrls.mockResolvedValue({
            data: [{ path: '5/q.pdf', signedUrl: 'https://signed/q' }],
            error: null,
        });

        const [quotation] = await toQuotations([
            {
                quotationId: 1,
                projectId: 5,
                quotationFile: publicUrl('quotation', '5/q.pdf'),
                quotationStatus: 'PENDING',
                createdAt: new Date('2026-01-01T00:00:00Z'),
            },
        ]);

        expect(quotation).toMatchObject({
            quotationFile: 'https://signed/q',
            createdAt: '2026-01-01T00:00:00.000Z',
        });
    });
});

describe('listing', () => {
    const owned = {
        companyId: 1,
        listingType: 'JOB',
        listingStatus: 'OPEN',
        minBudget: 10,
        maxBudget: 20,
    };

    it('assertListingOwned: 404 missing or other kind, 403 other company', async () => {
        db.listing.findUnique.mockResolvedValueOnce(null);
        await expect(assertListingOwned(1, 'JOB', 1)).rejects.toThrow(
            'Job not found',
        );
        db.listing.findUnique.mockResolvedValueOnce(owned);
        await expect(assertListingOwned(1, 'SERVICE', 1)).rejects.toThrow(
            'Service not found',
        );
        db.listing.findUnique.mockResolvedValueOnce(owned);
        await expect(assertListingOwned(1, 'JOB', 2)).rejects.toThrow(
            'This job belongs to another company',
        );
        db.listing.findUnique.mockResolvedValueOnce(owned);
        await expect(assertListingOwned(1, 'JOB', 1)).resolves.toBe(owned);
    });

    it('assertBudgetRange checks only a sent budget and names it', () => {
        const stored = { minBudget: 10, maxBudget: 20 };

        expect(() => assertBudgetRange(stored, {}, 'm')).not.toThrow();
        expect(() =>
            assertBudgetRange(stored, { minBudget: 15 }, 'm'),
        ).not.toThrow();
        expect(() => assertBudgetRange(stored, { minBudget: 30 }, 'm')).toThrow(
            expect.objectContaining({
                details: [{ field: 'minBudget', message: 'm' }],
            }),
        );
        expect(() => assertBudgetRange(stored, { maxBudget: 5 }, 'm')).toThrow(
            expect.objectContaining({
                details: [{ field: 'maxBudget', message: 'm' }],
            }),
        );
    });

    it('categoryReplace clears then writes each id once', () => {
        expect(categoryReplace([1, 1, 2])).toEqual({
            deleteMany: {},
            create: [{ categoryId: 1 }, { categoryId: 2 }],
        });
    });

    it('listingBudgetWhere adds one condition per sent side', () => {
        expect(listingBudgetWhere({})).toEqual([]);
        expect(listingBudgetWhere({ minBudget: 1, maxBudget: 2 })).toHaveLength(
            2,
        );
    });

    it('closeOpenListing is a 409 when nothing was open', async () => {
        db.listing.updateMany.mockResolvedValueOnce({ count: 0 });
        await expect(closeOpenListing(tx, 1, 'closed')).rejects.toThrow(
            'closed',
        );
        db.listing.updateMany.mockResolvedValueOnce({ count: 1 });
        await expect(
            closeOpenListing(tx, 1, 'closed'),
        ).resolves.toBeUndefined();
    });

    it('rejectPendingProposals can spare the accepted one and notifies each sender', async () => {
        db.proposal.updateManyAndReturn.mockResolvedValue([
            { proposalId: 7, senderId: 3 },
        ]);

        await rejectPendingProposals(tx, 1, 9);
        await rejectPendingProposals(tx, 1, 9, 6);

        const [all, spare] = db.proposal.updateManyAndReturn.mock.calls.map(
            (c) => c[0].where,
        );
        expect(all).not.toHaveProperty('proposalId');
        expect(spare.proposalId).toEqual({ not: 6 });
        expect(db.notification.createMany.mock.calls[0]![0].data).toEqual([
            expect.objectContaining({ senderId: 9, recipientId: 3 }),
        ]);
    });
});

describe('company deletion', () => {
    it('a second delete, or an admin, changes nothing', async () => {
        db.company.updateMany.mockResolvedValue({ count: 0 });

        await expect(softDeleteCompany(1)).resolves.toBe(false);
        expect(db.listing.findMany).not.toHaveBeenCalled();
    });

    it('the delete rejects pending proposals on each listing', async () => {
        db.company.updateMany.mockResolvedValue({ count: 1 });
        db.listing.findMany.mockResolvedValue([
            { listingId: 4 },
            { listingId: 5 },
        ]);
        db.proposal.updateManyAndReturn.mockResolvedValue([]);

        await expect(softDeleteCompany(1)).resolves.toBe(true);
        expect(db.proposal.updateManyAndReturn).toHaveBeenCalledTimes(2);
    });

    it('hasOngoingProject is true only when a project is found', async () => {
        db.project.findFirst.mockResolvedValueOnce(null);
        await expect(hasOngoingProject(1)).resolves.toBe(false);
        db.project.findFirst.mockResolvedValueOnce({ projectId: 1 });
        await expect(hasOngoingProject(1)).resolves.toBe(true);
    });
});
