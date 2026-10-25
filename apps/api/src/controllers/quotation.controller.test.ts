/*
 * Tests for quotation upload and storage helpers:
 * - uploadPdf middleware (middleware/upload.ts, T4.1.2)
 * - POST /projects/:projectId/quotations (createQuotation, US4-1 / T4.1.3)
 *
 * What they cover:
 * - T4.1.2: uploadPdf accepts application/pdf up to 5 MB, rejects non-PDF
 *   files with 400, and translates Multer's LIMIT_FILE_SIZE to 400.
 * - T4.1.3: the project's Provider (on both Job and Service projects) can
 *   upload a quotation PDF while the project is AWAITING_QUOTATION and no
 *   quotation is PENDING (including after a rejected quotation). Answers 201
 *   with the Quotation DTO.
 * - Missing file is 400 VALIDATION_FAILED on `file` without touching storage.
 * - Unknown project or outsider is 404, Receiver is 403, and a project not
 *   AWAITING_QUOTATION is 409; none of them uploads a file.
 * - A repeat upload while a quotation is PENDING is 409. If two uploads race
 *   into the partial unique index (P2002), saveWithUpload removes the orphan
 *   PDF from storage and the endpoint still answers 409.
 *
 * How:
 * - lib/prisma and lib/storage are replaced with mock.module before the
 *   controller loads, so nothing reaches the database or Supabase.
 *
 * Run: npm test (in apps/api).
 */
import { before, beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { pathToFileURL } from 'node:url';
import type { Request, Response } from 'express';
import type {
    ListingType,
    ProjectStatus,
    Quotation,
    QuotationStatus,
} from '@mangodb/shared';
import { ApiError } from '../lib/api-error';

const PROVIDER = 3;
const RECEIVER = 9;
const OUTSIDER = 42;
const PROJECT_ID = 15;

const UPLOADED = {
    path: 'quotations/1700000000000-abc.pdf',
    url: 'https://storage.test/object/public/quotation/quotations/1700000000000-abc.pdf',
};

type FakeQuotation = {
    quotationId: number;
    projectId: number;
    quotationFile: string;
    quotationStatus: QuotationStatus;
    createdAt: Date;
};

type FakeProject = {
    projectId: number;
    projectStatus: ProjectStatus;
    proposal: {
        senderId: number;
        listing: {
            listingType: ListingType;
            companyId: number;
        };
    };
};

let project: FakeProject | null = null;
let quotations: FakeQuotation[] = [];
let uploadedBuckets: { bucket: string; folder: string }[] = [];
let removedPaths: { path: string; bucket: string }[] = [];
let createThrowsP2002 = false;

function jobProject(
    projectStatus: ProjectStatus = 'AWAITING_QUOTATION',
): FakeProject {
    // On a job, the proposal sender is the Provider and the listing owner is the Receiver.
    return {
        projectId: PROJECT_ID,
        projectStatus,
        proposal: {
            senderId: PROVIDER,
            listing: { listingType: 'JOB', companyId: RECEIVER },
        },
    };
}

function serviceProject(
    projectStatus: ProjectStatus = 'AWAITING_QUOTATION',
): FakeProject {
    // On a service, the listing owner is the Provider and the proposal sender is the Receiver.
    return {
        projectId: PROJECT_ID,
        projectStatus,
        proposal: {
            senderId: RECEIVER,
            listing: { listingType: 'SERVICE', companyId: PROVIDER },
        },
    };
}

const fakePrisma = {
    project: {
        findUnique: async ({ where }: { where: { projectId: number } }) => {
            if (!project || project.projectId !== where.projectId) return null;
            return project;
        },
    },
    quotation: {
        findFirst: async ({
            where,
        }: {
            where: { projectId: number; quotationStatus: QuotationStatus };
        }) => {
            return (
                quotations.find(
                    (q) =>
                        q.projectId === where.projectId &&
                        q.quotationStatus === where.quotationStatus,
                ) ?? null
            );
        },
        create: async ({
            data,
        }: {
            data: {
                projectId: number;
                quotationFile: string;
                quotationStatus: QuotationStatus;
            };
        }) => {
            if (createThrowsP2002) {
                throw { code: 'P2002' };
            }
            const created: FakeQuotation = {
                quotationId: quotations.length + 1,
                projectId: data.projectId,
                quotationFile: data.quotationFile,
                quotationStatus: data.quotationStatus,
                createdAt: new Date('2026-10-25T08:00:00.000Z'),
            };
            quotations.push(created);
            return created;
        },
    },
};

const fakeStorage = {
    BUCKETS: {
        CERTIFICATE: 'certificate',
        PORTFOLIO: 'portfolio',
        PROFILE: 'profile',
        QUOTATION: 'quotation',
    },
    IMAGE_EXTENSIONS: {
        'image/png': 'png',
        'image/jpeg': 'jpg',
        'image/webp': 'webp',
    },
    PDF_MIME_TYPE: 'application/pdf',
    uploadToStorage: async (
        _file: Express.Multer.File,
        bucket: string,
        folder: string,
    ) => {
        uploadedBuckets.push({ bucket, folder });
        return UPLOADED;
    },
    removeFromStorage: async (path: string, bucket: string) => {
        removedPaths.push({ path, bucket });
    },
    removeFromStorageByUrl: async () => {},
};

function moduleUrl(specifier: string): string {
    return pathToFileURL(require.resolve(specifier)).href;
}

let controller: typeof import('./quotation.controller.js');
let uploadMiddleware: typeof import('../middleware/upload.js');

before(async () => {
    mock.module(moduleUrl('../lib/prisma'), {
        namedExports: { prisma: fakePrisma },
    });
    mock.module(moduleUrl('../lib/storage'), {
        namedExports: fakeStorage,
    });
    uploadMiddleware = await import('../middleware/upload.js');
    controller = await import('./quotation.controller.js');
});

beforeEach(() => {
    project = jobProject('AWAITING_QUOTATION');
    quotations = [];
    uploadedBuckets = [];
    removedPaths = [];
    createThrowsP2002 = false;
});

const PDF_FILE = {
    originalname: 'quote.pdf',
    mimetype: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4'),
} as Express.Multer.File;

async function uploadQuotation(
    callerId: number,
    options: {
        projectId?: string;
        file?: Express.Multer.File | undefined;
    } = {},
): Promise<{ status: number; body: unknown }> {
    const hasFileKey = 'file' in options;
    const req = {
        auth: { companyId: callerId, role: 'provider' },
        params: { projectId: options.projectId ?? String(PROJECT_ID) },
        file: hasFileKey ? options.file : PDF_FILE,
    } as unknown as Request;

    let status = 200;
    let body: unknown;
    const res = {
        status(code: number) {
            status = code;
            return this;
        },
        json(payload: unknown) {
            body = payload;
            return this;
        },
    } as unknown as Response;

    await controller.createQuotation(req, res);
    return { status, body };
}

// Builds a minimal multipart/form-data request stream so Multer's real
// fileFilter and 5 MB limit run end-to-end in memory.
function runUploadPdf(
    fieldName: string,
    filename: string,
    mimeType: string,
    content: Buffer,
): Promise<{ err: unknown; file: Express.Multer.File | undefined }> {
    const boundary = '----MangoTestBoundary';
    const header = Buffer.from(
        `--${boundary}\r\n` +
            `Content-Disposition: form-data; name="${fieldName}"; filename="${filename}"\r\n` +
            `Content-Type: ${mimeType}\r\n\r\n`,
    );
    const footer = Buffer.from(`\r\n--${boundary}--\r\n`);
    const raw = Buffer.concat([header, content, footer]);

    const req = Object.assign(Readable.from([raw]), {
        headers: {
            'content-type': `multipart/form-data; boundary=${boundary}`,
            'content-length': String(raw.length),
        },
    }) as unknown as Request;
    const res = {} as Response;
    const mw = uploadMiddleware.uploadPdf('file');

    return new Promise((resolve) => {
        mw(req, res, (err: unknown) => {
            resolve({ err, file: req.file });
        });
    });
}

describe('uploadPdf middleware (T4.1.2)', () => {
    it('accepts a PDF within the 5 MB limit', async () => {
        const { err, file } = await runUploadPdf(
            'file',
            'quote.pdf',
            'application/pdf',
            Buffer.from('%PDF-1.4 test'),
        );

        assert.equal(err, undefined);
        assert.ok(file);
        assert.equal(file.mimetype, 'application/pdf');
    });

    it('rejects a non-PDF file with 400', async () => {
        const { err } = await runUploadPdf(
            'file',
            'photo.png',
            'image/png',
            Buffer.from('not-a-pdf'),
        );

        assert.ok(err instanceof ApiError);
        assert.equal(err.status, 400);
        assert.equal(err.message, 'Only PDF files are allowed');
    });

    it('rejects a PDF over 5 MB with 400', async () => {
        const overFiveMb = Buffer.alloc(5 * 1024 * 1024 + 1, 0x20);
        const { err } = await runUploadPdf(
            'file',
            'huge.pdf',
            'application/pdf',
            overFiveMb,
        );

        assert.ok(err instanceof ApiError);
        assert.equal(err.status, 400);
        assert.equal(err.message, 'PDF must be 5MB or smaller');
    });
});

describe('POST /projects/:projectId/quotations (US4-1)', () => {
    it('uploads a quotation PDF as the Provider on a job project and answers 201', async () => {
        const { status, body } = await uploadQuotation(PROVIDER);
        const quotation = body as Quotation;

        assert.equal(status, 201);
        assert.deepEqual(quotation, {
            quotationId: 1,
            projectId: PROJECT_ID,
            quotationFile: UPLOADED.url,
            quotationStatus: 'PENDING',
            createdAt: '2026-10-25T08:00:00.000Z',
        });
        assert.deepEqual(uploadedBuckets, [
            { bucket: 'quotation', folder: 'quotations' },
        ]);
    });

    it('uploads a quotation PDF as the Provider on a service project', async () => {
        project = serviceProject('AWAITING_QUOTATION');

        const { status, body } = await uploadQuotation(PROVIDER);
        const quotation = body as Quotation;

        assert.equal(status, 201);
        assert.equal(quotation.quotationStatus, 'PENDING');
        assert.equal(quotation.projectId, PROJECT_ID);
    });

    it('allows a new quotation after a previous one was REJECTED', async () => {
        quotations.push({
            quotationId: 1,
            projectId: PROJECT_ID,
            quotationFile: 'https://storage.test/old.pdf',
            quotationStatus: 'REJECTED',
            createdAt: new Date('2026-10-24T08:00:00.000Z'),
        });

        const { status, body } = await uploadQuotation(PROVIDER);
        const quotation = body as Quotation;

        assert.equal(status, 201);
        assert.equal(quotation.quotationId, 2);
        assert.equal(quotation.quotationStatus, 'PENDING');
    });

    it('is a 400 VALIDATION_FAILED on file when no PDF is sent', async () => {
        await assert.rejects(
            () => uploadQuotation(PROVIDER, { file: undefined }),
            (err: unknown) => {
                assert.ok(err instanceof ApiError);
                assert.equal(err.status, 400);
                assert.equal(err.code, 'VALIDATION_FAILED');
                assert.deepEqual(err.details, [
                    { field: 'file', message: 'Choose a PDF first' },
                ]);
                return true;
            },
        );
        assert.equal(uploadedBuckets.length, 0);
    });

    it('is a 404 for an unknown project or a caller outside the project', async () => {
        await assert.rejects(
            () => uploadQuotation(OUTSIDER),
            (err: unknown) => err instanceof ApiError && err.status === 404,
        );
        project = null;
        await assert.rejects(
            () => uploadQuotation(PROVIDER),
            (err: unknown) => err instanceof ApiError && err.status === 404,
        );
        assert.equal(uploadedBuckets.length, 0);
    });

    it('is a 403 when the Receiver tries to upload a quotation', async () => {
        await assert.rejects(
            () => uploadQuotation(RECEIVER),
            (err: unknown) => {
                assert.ok(err instanceof ApiError);
                assert.equal(err.status, 403);
                assert.equal(
                    err.message,
                    'Only the Provider can upload a quotation',
                );
                return true;
            },
        );
        assert.equal(uploadedBuckets.length, 0);
    });

    it('is a 409 when the project is not AWAITING_QUOTATION', async () => {
        const otherStatuses: ProjectStatus[] = [
            'AWAITING_DEPOSIT',
            'IN_PROGRESS',
            'AWAITING_ACCEPTANCE',
            'COMPLETED',
            'CANCELLED',
        ];
        for (const status of otherStatuses) {
            project = jobProject(status);
            await assert.rejects(
                () => uploadQuotation(PROVIDER),
                (err: unknown) =>
                    err instanceof ApiError &&
                    err.status === 409 &&
                    err.message === 'Project is not AWAITING_QUOTATION',
            );
        }
        assert.equal(uploadedBuckets.length, 0);
    });

    it('is a 409 without uploading when a quotation is already PENDING', async () => {
        quotations.push({
            quotationId: 1,
            projectId: PROJECT_ID,
            quotationFile: UPLOADED.url,
            quotationStatus: 'PENDING',
            createdAt: new Date('2026-10-24T08:00:00.000Z'),
        });

        await assert.rejects(
            () => uploadQuotation(PROVIDER),
            (err: unknown) => {
                assert.ok(err instanceof ApiError);
                assert.equal(err.status, 409);
                assert.equal(err.message, 'A quotation is already pending');
                return true;
            },
        );
        assert.equal(uploadedBuckets.length, 0);
    });

    it('removes the uploaded PDF and answers 409 when a concurrent upload hits the partial unique index', async () => {
        createThrowsP2002 = true;

        await assert.rejects(
            () => uploadQuotation(PROVIDER),
            (err: unknown) => {
                assert.ok(err instanceof ApiError);
                assert.equal(err.status, 409);
                assert.equal(err.message, 'A quotation is already pending');
                return true;
            },
        );
        assert.deepEqual(removedPaths, [
            { path: UPLOADED.path, bucket: 'quotation' },
        ]);
    });
});
