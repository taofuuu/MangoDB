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
 * toProjectSummary / toProjectDetail (US4-9):
 * - Each party sees the other as otherParty; on a service the owner is the
 *   Provider.
 * - The nested proposal row does not reach the response.
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

// A project row as projectViewSelect returns it. totalBudget is a plain
// number here: toProject only runs Number() on it.
function viewRow(listingType: string) {
    const brief = (companyId: number) => ({
        companyId,
        companyName: `Company ${companyId}`,
        companyPhoto: null,
    });
    const { senderId, listing } = proposalOn(listingType);
    return {
        projectId: 1,
        proposalId: 2,
        totalBudget: 5000,
        startDate: new Date('2026-10-01'),
        projectStatus: 'IN_PROGRESS',
        depositReportedAt: null,
        depositConfirmedAt: null,
        completedAt: null,
        proposal: {
            senderId,
            sender: brief(SENDER),
            listing: {
                ...listing,
                listingId: 7,
                listingTitle: 'Logo design',
                company: brief(OWNER),
            },
        },
    } as unknown as Parameters<typeof lib.toProjectSummary>[0];
}

describe('toProjectSummary', () => {
    it('shows each party the other one', () => {
        const asProvider = lib.toProjectSummary(viewRow('JOB'), SENDER);
        assert.equal(asProvider.myRole, 'provider');
        assert.equal(asProvider.otherParty.companyId, OWNER);

        const asReceiver = lib.toProjectSummary(viewRow('JOB'), OWNER);
        assert.equal(asReceiver.myRole, 'receiver');
        assert.equal(asReceiver.otherParty.companyId, SENDER);
    });

    it('keeps the nested proposal out of the response', () => {
        assert.ok(
            !('proposal' in lib.toProjectSummary(viewRow('JOB'), SENDER)),
        );
    });
});

describe('toProjectDetail', () => {
    it('names the owner as Provider on a service', () => {
        const detail = lib.toProjectDetail(viewRow('SERVICE'), SENDER);
        assert.equal(detail.provider.companyId, OWNER);
        assert.equal(detail.receiver.companyId, SENDER);
        assert.equal(detail.myRole, 'receiver');
        assert.equal(detail.startDate, '2026-10-01');
    });
});
