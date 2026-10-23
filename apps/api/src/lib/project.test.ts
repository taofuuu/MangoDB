/*
 * Tests for the F.9 helpers in lib/project.ts.
 *
 * projectParties:
 * - On a job the sender is the Provider; on a service the owner is (ADR 0016).
 *
 * assertProjectParty:
 * - A missing project and a company outside it both get 404.
 * - Each party gets its own role.
 *
 * moveProjectStatus is covered by F.12.
 *
 * How: lib/prisma is replaced with mock.module before lib/project loads, and
 * findUnique hands back whatever `row` holds.
 *
 * Run: npm test (in apps/api).
 */
import { before, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { ApiError } from './api-error';

function moduleUrl(specifier: string): string {
    return pathToFileURL(require.resolve(specifier)).href;
}

let lib: typeof import('./project.js');
let row: unknown = null;

before(async () => {
    mock.module(moduleUrl('./prisma'), {
        namedExports: {
            prisma: { project: { findUnique: () => Promise.resolve(row) } },
        },
    });
    lib = await import('./project.js');
});

const SENDER = 3;
const OWNER = 9;

function proposalOn(listingType: string) {
    return { senderId: SENDER, listing: { listingType, companyId: OWNER } };
}

describe('projectParties', () => {
    it('makes the sender the Provider on a job', () => {
        assert.deepEqual(lib.projectParties(proposalOn('JOB')), {
            providerId: SENDER,
            receiverId: OWNER,
        });
    });

    it('makes the owner the Provider on a service', () => {
        assert.deepEqual(lib.projectParties(proposalOn('SERVICE')), {
            providerId: OWNER,
            receiverId: SENDER,
        });
    });
});

describe('assertProjectParty', () => {
    const isNotFound = (err: unknown) =>
        err instanceof ApiError && err.status === 404;

    it('is a 404 when the project does not exist', async () => {
        row = null;
        await assert.rejects(lib.assertProjectParty(1, SENDER), isNotFound);
    });

    it('is a 404 for a company outside the project', async () => {
        row = { projectStatus: 'IN_PROGRESS', proposal: proposalOn('JOB') };
        await assert.rejects(lib.assertProjectParty(1, 99), isNotFound);
    });

    it('tells each party its role', async () => {
        row = { projectStatus: 'IN_PROGRESS', proposal: proposalOn('JOB') };
        assert.equal(
            (await lib.assertProjectParty(1, SENDER)).myRole,
            'provider',
        );
        assert.equal(
            (await lib.assertProjectParty(1, OWNER)).myRole,
            'receiver',
        );
    });
});

describe('toCompletedProject', () => {
    const sender = {
        companyId: SENDER,
        companyName: 'Sender Corp',
        companyPhoto: null,
    };
    const owner = {
        companyId: OWNER,
        companyName: 'Owner Corp',
        companyPhoto: '/photos/owner.jpg',
    };
    const completedAt = new Date('2026-10-20T12:00:00.000Z');

    it('names the job owner as Receiver on a completed job', () => {
        const result = lib.toCompletedProject({
            projectId: 10,
            completedAt,
            proposal: {
                sender,
                listing: {
                    listingTitle: 'Build a Website',
                    listingType: 'JOB',
                    company: owner,
                },
            },
        });
        assert.deepEqual(result, {
            projectId: 10,
            listingTitle: 'Build a Website',
            receiver: owner,
            completedAt: '2026-10-20T12:00:00.000Z',
        });
    });

    it('names the hire request sender as Receiver on a completed service', () => {
        const result = lib.toCompletedProject({
            projectId: 20,
            completedAt,
            proposal: {
                sender,
                listing: {
                    listingTitle: 'SEO Optimization',
                    listingType: 'SERVICE',
                    company: owner,
                },
            },
        });
        assert.deepEqual(result, {
            projectId: 20,
            listingTitle: 'SEO Optimization',
            receiver: sender,
            completedAt: '2026-10-20T12:00:00.000Z',
        });
    });

    it('throws 500 when completedAt is null', () => {
        assert.throws(
            () =>
                lib.toCompletedProject({
                    projectId: 30,
                    completedAt: null,
                    proposal: {
                        sender,
                        listing: {
                            listingTitle: 'Incomplete Work',
                            listingType: 'JOB',
                            company: owner,
                        },
                    },
                }),
            (err: unknown) =>
                err instanceof ApiError &&
                err.status === 500 &&
                err.message === 'Completed project has no completedAt',
        );
    });

    it('throws 500 when job listing has no owner', () => {
        assert.throws(
            () =>
                lib.toCompletedProject({
                    projectId: 40,
                    completedAt,
                    proposal: {
                        sender,
                        listing: {
                            listingTitle: 'Orphan Listing',
                            listingType: 'JOB',
                            company: null,
                        },
                    },
                }),
            (err: unknown) =>
                err instanceof ApiError &&
                err.status === 500 &&
                err.message === 'Listing has no owning company',
        );
    });
});
