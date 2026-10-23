/*
 * Tests for GET /companies/:companyId/completed-projects
 * (listProviderCompletedProjects in project.controller.ts).
 *
 * What they cover:
 * - 404 for an unknown, soft-deleted, or admin company.
 * - Only COMPLETED projects where the target company was the Provider are returned.
 * - Completed projects where the company was the Provider via a Job proposal (sender).
 * - Completed projects where the company was the Provider via a Service listing (owner).
 * - Projects where the company was the Receiver are excluded.
 * - Non-COMPLETED projects (IN_PROGRESS, AWAITING_DEPOSIT, etc.) are excluded.
 * - Newest first ordering by completedAt descending.
 * - Pagination (page, pageSize, totalItems, totalPages).
 *
 * How:
 * - Direct invocation of listProviderCompletedProjects with fake req and res.
 * - lib/prisma is mocked with in-memory companies and projects.
 *
 * Run: npm test (in apps/api).
 */
import { before, beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import type { Request, Response } from 'express';
import type { CompletedProject, Paginated } from '@mangodb/shared';
import { ApiError } from '../lib/api-error';

type Company = {
    companyId: number;
    companyName: string;
    companyPhoto: string | null;
    accountType: 'PROVIDER' | 'RECEIVER' | 'BOTH' | 'ADMIN';
    deletedAt: Date | null;
};

type ProjectRow = {
    projectId: number;
    projectStatus: string;
    completedAt: Date | null;
    proposal: {
        senderId: number;
        sender: {
            companyId: number;
            companyName: string;
            companyPhoto: string | null;
        };
        listing: {
            listingTitle: string;
            listingType: 'JOB' | 'SERVICE';
            companyId: number;
            company: {
                companyId: number;
                companyName: string;
                companyPhoto: string | null;
            } | null;
        };
    };
};

const PROVIDER_ID = 10;
const RECEIVER_ID = 20;
const ADMIN_ID = 90;
const DELETED_ID = 99;

const companies: Company[] = [
    {
        companyId: PROVIDER_ID,
        companyName: 'Top Provider Co',
        companyPhoto: '/photos/provider.png',
        accountType: 'PROVIDER',
        deletedAt: null,
    },
    {
        companyId: RECEIVER_ID,
        companyName: 'Client Receiver Co',
        companyPhoto: null,
        accountType: 'RECEIVER',
        deletedAt: null,
    },
    {
        companyId: ADMIN_ID,
        companyName: 'Platform Admin',
        companyPhoto: null,
        accountType: 'ADMIN',
        deletedAt: null,
    },
    {
        companyId: DELETED_ID,
        companyName: 'Deleted Co',
        companyPhoto: null,
        accountType: 'PROVIDER',
        deletedAt: new Date('2026-01-01T00:00:00Z'),
    },
];

let projects: ProjectRow[] = [];

type ProjectWhereBranch = {
    proposal?: {
        senderId?: number;
        listing?: {
            listingType?: 'JOB' | 'SERVICE';
            companyId?: number;
        };
    };
};

type ProjectWhereInput = {
    projectStatus?: string;
    OR?: ProjectWhereBranch[];
};

type CompanyWhereInput = {
    companyId?: number;
    deletedAt?: null | Date;
    accountType?: { not?: string };
};

function matchesWhere(p: ProjectRow, where: ProjectWhereInput): boolean {
    if (where.projectStatus && p.projectStatus !== where.projectStatus) {
        return false;
    }
    if (where.OR) {
        return where.OR.some((branch) => {
            const proposal = branch.proposal;
            if (
                proposal?.senderId !== undefined &&
                proposal.listing?.listingType !== undefined
            ) {
                return (
                    p.proposal.senderId === proposal.senderId &&
                    p.proposal.listing.listingType ===
                        proposal.listing.listingType
                );
            }
            if (
                proposal?.listing?.companyId !== undefined &&
                proposal.listing.listingType !== undefined
            ) {
                return (
                    p.proposal.listing.companyId ===
                        proposal.listing.companyId &&
                    p.proposal.listing.listingType ===
                        proposal.listing.listingType
                );
            }
            return false;
        });
    }

    return true;
}

const fakePrisma = {
    company: {
        findFirst: async ({ where }: { where: CompanyWhereInput }) => {
            return (
                companies.find((c) => {
                    if (c.companyId !== where.companyId) return false;
                    if (where.deletedAt === null && c.deletedAt !== null) {
                        return false;
                    }
                    if (
                        where.accountType?.not &&
                        c.accountType === where.accountType.not
                    ) {
                        return false;
                    }
                    return true;
                }) ?? null
            );
        },
    },
    project: {
        count: async ({ where }: { where: ProjectWhereInput }) => {
            return projects.filter((p) => matchesWhere(p, where)).length;
        },
        findMany: async ({
            where,
            skip,
            take,
        }: {
            where: ProjectWhereInput;
            skip?: number;
            take?: number;
        }) => {
            const filtered = projects.filter((p) => matchesWhere(p, where));
            filtered.sort((a, b) => {
                const timeA = a.completedAt ? a.completedAt.getTime() : 0;
                const timeB = b.completedAt ? b.completedAt.getTime() : 0;
                if (timeB !== timeA) return timeB - timeA;
                return b.projectId - a.projectId;
            });
            const s = skip ?? 0;
            const t = take ?? filtered.length;
            return filtered.slice(s, s + t);
        },
    },
    $transaction: async (ops: Promise<unknown>[]) => Promise.all(ops),
};

function moduleUrl(specifier: string): string {
    return pathToFileURL(require.resolve(specifier)).href;
}

let controller: typeof import('./project.controller.js');

before(async () => {
    mock.module(moduleUrl('../lib/prisma'), {
        namedExports: { prisma: fakePrisma },
    });
    controller = await import('./project.controller.js');
});

beforeEach(() => {
    projects = [];
});

async function callCompletedProjects(
    params: Record<string, string>,
    query: Record<string, string> = {},
): Promise<Paginated<CompletedProject>> {
    const req = {
        params,
        query,
        auth: { companyId: RECEIVER_ID, role: 'receiver', jti: 'jti-1' },
    } as unknown as Request;

    let body: Paginated<CompletedProject> | null = null;
    const res = {
        status() {
            return this;
        },
        json(b: unknown) {
            body = b as Paginated<CompletedProject>;
            return this;
        },
    } as unknown as Response;

    await controller.listProviderCompletedProjects(req, res);
    return body!;
}

describe('GET /companies/:companyId/completed-projects', () => {
    it('answers 404 when target company does not exist', async () => {
        await assert.rejects(
            callCompletedProjects({ companyId: '9999' }),
            (err: unknown) =>
                err instanceof ApiError &&
                err.status === 404 &&
                err.message === 'Company not found',
        );
    });

    it('answers 404 when target company is soft-deleted', async () => {
        await assert.rejects(
            callCompletedProjects({ companyId: String(DELETED_ID) }),
            (err: unknown) =>
                err instanceof ApiError &&
                err.status === 404 &&
                err.message === 'Company not found',
        );
    });

    it('answers 404 when target company is an admin account', async () => {
        await assert.rejects(
            callCompletedProjects({ companyId: String(ADMIN_ID) }),
            (err: unknown) =>
                err instanceof ApiError &&
                err.status === 404 &&
                err.message === 'Company not found',
        );
    });

    it('answers 400 when companyId is not a valid int4 id', async () => {
        await assert.rejects(
            callCompletedProjects({ companyId: 'abc' }),
            (err: unknown) => err instanceof ApiError && err.status === 400,
        );
    });

    it('returns completed work on a job (Provider sent proposal, Receiver owned job)', async () => {
        const receiverBrief = {
            companyId: RECEIVER_ID,
            companyName: 'Client Receiver Co',
            companyPhoto: null,
        };
        const providerBrief = {
            companyId: PROVIDER_ID,
            companyName: 'Top Provider Co',
            companyPhoto: '/photos/provider.png',
        };

        projects.push({
            projectId: 1,
            projectStatus: 'COMPLETED',
            completedAt: new Date('2026-09-15T10:00:00Z'),
            proposal: {
                senderId: PROVIDER_ID,
                sender: providerBrief,
                listing: {
                    listingTitle: 'Custom CRM Build',
                    listingType: 'JOB',
                    companyId: RECEIVER_ID,
                    company: receiverBrief,
                },
            },
        });

        const body = await callCompletedProjects({
            companyId: String(PROVIDER_ID),
        });
        assert.equal(body.items.length, 1);
        assert.deepEqual(body.items[0], {
            projectId: 1,
            listingTitle: 'Custom CRM Build',
            receiver: receiverBrief,
            completedAt: '2026-09-15T10:00:00.000Z',
        });
        assert.deepEqual(body.pagination, {
            page: 1,
            pageSize: 12,
            totalItems: 1,
            totalPages: 1,
        });
    });

    it('returns completed work on a service (Provider owned service, Receiver sent hire request)', async () => {
        const receiverBrief = {
            companyId: RECEIVER_ID,
            companyName: 'Client Receiver Co',
            companyPhoto: null,
        };
        const providerBrief = {
            companyId: PROVIDER_ID,
            companyName: 'Top Provider Co',
            companyPhoto: '/photos/provider.png',
        };

        projects.push({
            projectId: 2,
            projectStatus: 'COMPLETED',
            completedAt: new Date('2026-10-01T14:30:00Z'),
            proposal: {
                senderId: RECEIVER_ID,
                sender: receiverBrief,
                listing: {
                    listingTitle: 'Cloud Migration Service',
                    listingType: 'SERVICE',
                    companyId: PROVIDER_ID,
                    company: providerBrief,
                },
            },
        });

        const body = await callCompletedProjects({
            companyId: String(PROVIDER_ID),
        });
        assert.equal(body.items.length, 1);
        assert.deepEqual(body.items[0], {
            projectId: 2,
            listingTitle: 'Cloud Migration Service',
            receiver: receiverBrief,
            completedAt: '2026-10-01T14:30:00.000Z',
        });
    });

    it('does not return projects where the company was the Receiver', async () => {
        // Project where RECEIVER_ID owned the Job and PROVIDER_ID was the Provider.
        // Asking for RECEIVER_ID's completed projects should NOT include this.
        projects.push({
            projectId: 3,
            projectStatus: 'COMPLETED',
            completedAt: new Date('2026-10-10T08:00:00Z'),
            proposal: {
                senderId: PROVIDER_ID,
                sender: {
                    companyId: PROVIDER_ID,
                    companyName: 'Top Provider Co',
                    companyPhoto: '/photos/provider.png',
                },
                listing: {
                    listingTitle: 'Mobile App Revamp',
                    listingType: 'JOB',
                    companyId: RECEIVER_ID,
                    company: {
                        companyId: RECEIVER_ID,
                        companyName: 'Client Receiver Co',
                        companyPhoto: null,
                    },
                },
            },
        });

        const body = await callCompletedProjects({
            companyId: String(RECEIVER_ID),
        });
        assert.equal(body.items.length, 0);
        assert.equal(body.pagination.totalItems, 0);
    });

    it('excludes non-COMPLETED projects', async () => {
        const statuses = [
            'AWAITING_QUOTATION',
            'AWAITING_DEPOSIT',
            'IN_PROGRESS',
            'AWAITING_ACCEPTANCE',
            'CANCELLED',
        ];
        statuses.forEach((status, idx) => {
            projects.push({
                projectId: 10 + idx,
                projectStatus: status,
                completedAt: null,
                proposal: {
                    senderId: PROVIDER_ID,
                    sender: {
                        companyId: PROVIDER_ID,
                        companyName: 'Top Provider Co',
                        companyPhoto: null,
                    },
                    listing: {
                        listingTitle: `Project in ${status}`,
                        listingType: 'JOB',
                        companyId: RECEIVER_ID,
                        company: {
                            companyId: RECEIVER_ID,
                            companyName: 'Client Receiver Co',
                            companyPhoto: null,
                        },
                    },
                },
            });
        });

        const body = await callCompletedProjects({
            companyId: String(PROVIDER_ID),
        });
        assert.equal(body.items.length, 0);
        assert.equal(body.pagination.totalItems, 0);
    });

    it('orders completed projects newest first by completedAt descending', async () => {
        const receiverBrief = {
            companyId: RECEIVER_ID,
            companyName: 'Client Receiver Co',
            companyPhoto: null,
        };
        const providerBrief = {
            companyId: PROVIDER_ID,
            companyName: 'Top Provider Co',
            companyPhoto: null,
        };

        projects.push(
            {
                projectId: 101,
                projectStatus: 'COMPLETED',
                completedAt: new Date('2026-08-01T00:00:00Z'),
                proposal: {
                    senderId: PROVIDER_ID,
                    sender: providerBrief,
                    listing: {
                        listingTitle: 'Oldest Completed Project',
                        listingType: 'JOB',
                        companyId: RECEIVER_ID,
                        company: receiverBrief,
                    },
                },
            },
            {
                projectId: 102,
                projectStatus: 'COMPLETED',
                completedAt: new Date('2026-10-20T00:00:00Z'),
                proposal: {
                    senderId: PROVIDER_ID,
                    sender: providerBrief,
                    listing: {
                        listingTitle: 'Newest Completed Project',
                        listingType: 'JOB',
                        companyId: RECEIVER_ID,
                        company: receiverBrief,
                    },
                },
            },
            {
                projectId: 103,
                projectStatus: 'COMPLETED',
                completedAt: new Date('2026-09-10T00:00:00Z'),
                proposal: {
                    senderId: PROVIDER_ID,
                    sender: providerBrief,
                    listing: {
                        listingTitle: 'Middle Completed Project',
                        listingType: 'JOB',
                        companyId: RECEIVER_ID,
                        company: receiverBrief,
                    },
                },
            },
        );

        const body = await callCompletedProjects({
            companyId: String(PROVIDER_ID),
        });
        assert.equal(body.items.length, 3);
        assert.equal(body.items[0]!.projectId, 102);
        assert.equal(body.items[1]!.projectId, 103);
        assert.equal(body.items[2]!.projectId, 101);
    });

    it('supports pagination with page and pageSize', async () => {
        const receiverBrief = {
            companyId: RECEIVER_ID,
            companyName: 'Client Receiver Co',
            companyPhoto: null,
        };
        const providerBrief = {
            companyId: PROVIDER_ID,
            companyName: 'Top Provider Co',
            companyPhoto: null,
        };

        for (let i = 1; i <= 5; i++) {
            projects.push({
                projectId: 200 + i,
                projectStatus: 'COMPLETED',
                completedAt: new Date(`2026-0${i}-01T00:00:00Z`),
                proposal: {
                    senderId: PROVIDER_ID,
                    sender: providerBrief,
                    listing: {
                        listingTitle: `Project ${i}`,
                        listingType: 'JOB',
                        companyId: RECEIVER_ID,
                        company: receiverBrief,
                    },
                },
            });
        }

        const page1 = await callCompletedProjects(
            { companyId: String(PROVIDER_ID) },
            { page: '1', pageSize: '2' },
        );
        assert.equal(page1.items.length, 2);
        assert.equal(page1.pagination.totalItems, 5);
        assert.equal(page1.pagination.totalPages, 3);
        assert.equal(page1.pagination.page, 1);
        assert.equal(page1.pagination.pageSize, 2);

        const page3 = await callCompletedProjects(
            { companyId: String(PROVIDER_ID) },
            { page: '3', pageSize: '2' },
        );
        assert.equal(page3.items.length, 1);
        assert.equal(page3.pagination.page, 3);
        assert.equal(page3.pagination.totalPages, 3);
    });
});
