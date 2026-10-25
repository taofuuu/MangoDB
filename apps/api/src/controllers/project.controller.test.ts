/*
 * Tests for project controller endpoints:
 * - POST /projects/:projectId/updates (createProjectUpdate, US4-10)
 * - POST /projects/:projectId/confirm-deposit (confirmDeposit, US4-7)
 * - POST /projects/:projectId/cancel (cancelProject, US4-8)
 * - POST /projects/:projectId/submit-work (submitWork, US4-11)
 * - POST /projects/:projectId/reject-work (rejectWork, US4-12)
 * - POST /projects/:projectId/accept-work (acceptWork, US4-13)
 * - POST /projects/:projectId/review (createReview, US5-1, ADR 0018)
 * - GET /companies/:companyId/completed-projects (listProviderCompletedProjects, US2-5)
 *
 * What they cover:
 * - T4.10.3: a saved update has its date and time, set by the server. The
 *   client cannot send one: an extra createdAt field is a 400.
 * - T4.10.4: only the project's Provider can add one. The Receiver gets 403,
 *   a company outside the project 404, and neither writes anything. A
 *   project that is not IN_PROGRESS is a 409.
 * - T4.7.3: the Provider confirming a reported deposit moves the project to
 *   IN_PROGRESS and stamps depositConfirmedAt.
 * - T4.7.4: confirming before the Receiver reported the deposit is a 409, and
 *   the Receiver confirming is a 403. Neither changes the project.
 * - US4-8: either party (Provider or Receiver) can cancel a project before work starts
 *   (from AWAITING_QUOTATION or AWAITING_DEPOSIT) on both Job and Service projects,
 *   moving the status to CANCELLED. An outsider gets 404, invalid projectId 400,
 *   and any status after work starts (IN_PROGRESS, AWAITING_ACCEPTANCE, COMPLETED, CANCELLED)
 *   gets 409.
 * - T4.11.4: the Provider reporting the work complete moves the project to
 *   AWAITING_ACCEPTANCE. The Receiver gets 403, an outsider 404, and a project
 *   not IN_PROGRESS 409; none of them changes the project.
 * - T4.12.3: rejecting the work without a reason is a 400 and changes nothing.
 * - T4.12.4: rejecting with a reason moves the project back to IN_PROGRESS and
 *   saves the reason as a WORK_REJECTED update. The Provider gets 403, and a
 *   project not AWAITING_ACCEPTANCE 409.
 * - T4.13.3: accepting the work moves the project to COMPLETED and stamps
 *   completedAt.
 * - T4.13.4: only the Receiver can accept, and only from AWAITING_ACCEPTANCE.
 *   The Provider gets 403, an outsider 404, another status 409; none of them
 *   changes the project.
 * - US5-1: the Receiver reviews a COMPLETED project once: 201 Created with Review DTO.
 * - Both Job (owner is Receiver) and Service (sender is Receiver) paths.
 * - An optional comment up to 500 characters, or null/omitted comment.
 * - 404 for an unknown project or a caller outside the project.
 * - 403 when the Provider attempts to review.
 * - 409 when the project is not COMPLETED.
 * - 409 when the project has already been reviewed (duplicate review / P2002).
 * - 400 when scores are invalid (<1, >5, non-integer) or comment exceeds 500 chars.
 * - US2-5: a Provider's completed work, newest first, for its public profile.
 *   Filters out non-COMPLETED projects and supports standard pagination.
 *   Unknown, soft-deleted, and admin companies answer 404.
 *
 * How:
 * - The test calls the controller function directly with a fake req and a
 *   fake res that records the status and JSON body.
 * - lib/prisma is replaced with mock.module before the controller loads, so no
 *   test touches the shared Supabase database.
 * - project.updateMany and project.update change `project` in place, honouring
 *   their where filters. $transaction puts `project` back if its work throws,
 *   as the database's rollback would.
 *
 * Run: npm test (in apps/api).
 */
import { before, beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import type { Request, Response } from 'express';
import type {
    CompletedProject,
    Paginated,
    Project,
    ProjectUpdate,
    Review,
} from '@mangodb/shared';
import { ApiError } from '../lib/api-error';

// On a job the sender is the Provider and the owner the Receiver (ADR 0016).
const PROVIDER = 3;
const RECEIVER = 9;
const OUTSIDER = 42;

const PROVIDER_ID = 10;
const RECEIVER_ID = 20;
const ADMIN_ID = 90;
const DELETED_ID = 99;

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

let project: ReturnType<typeof projectIn> | null = projectIn('IN_PROGRESS');
let created: Record<string, unknown>[] = [];
let createdReviews: Record<string, unknown>[] = [];
let reviewAlreadyExists = false;
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

function filterProjects(where?: ProjectWhereInput): ProjectRow[] {
    if (!where) return projects;
    return projects.filter((p) => {
        if (where.projectStatus && p.projectStatus !== where.projectStatus) {
            return false;
        }
        if (where.OR && where.OR.length > 0) {
            const matchesOr = where.OR.some((branch) => {
                if (branch.proposal?.senderId !== undefined) {
                    if (p.proposal.senderId !== branch.proposal.senderId)
                        return false;
                }
                if (branch.proposal?.listing?.listingType !== undefined) {
                    if (
                        p.proposal.listing.listingType !==
                        branch.proposal.listing.listingType
                    )
                        return false;
                }
                if (branch.proposal?.listing?.companyId !== undefined) {
                    if (
                        p.proposal.listing.companyId !==
                        branch.proposal.listing.companyId
                    )
                        return false;
                }
                return true;
            });
            if (!matchesOr) return false;
        }
        return true;
    });
}

const fakePrisma = {
    company: {
        findFirst: ({
            where,
        }: {
            where: {
                companyId: number;
                deletedAt: null;
                accountType?: { not: string };
            };
        }) => {
            const found = companies.find(
                (c) => c.companyId === where.companyId,
            );
            if (!found) return Promise.resolve(null);
            if (found.deletedAt !== null) return Promise.resolve(null);
            if (
                where.accountType &&
                found.accountType === where.accountType.not
            ) {
                return Promise.resolve(null);
            }
            return Promise.resolve(found);
        },
    },
    project: {
        findUnique: () => Promise.resolve(project),
        findUniqueOrThrow: () => Promise.resolve(project),
        // moveProjectStatus: moves only a project still in the `from` status.
        updateMany: ({
            where,
            data,
        }: {
            where: { projectStatus: string };
            data: { projectStatus: string };
        }) => {
            if (project!.projectStatus !== where.projectStatus) {
                return Promise.resolve({ count: 0 });
            }
            project!.projectStatus = data.projectStatus;
            return Promise.resolve({ count: 1 });
        },
        // A where that misses the row is P2025 in Prisma.
        update: ({
            where,
            data,
        }: {
            where: { depositReportedAt?: unknown };
            data: { depositConfirmedAt?: Date; completedAt?: Date };
        }) => {
            if (
                where.depositReportedAt &&
                project!.depositReportedAt === null
            ) {
                return Promise.reject(
                    Object.assign(new Error('Record not found'), {
                        code: 'P2025',
                    }),
                );
            }
            Object.assign(project!, data);
            return Promise.resolve(project);
        },
        count: ({ where }: { where?: ProjectWhereInput } = {}) => {
            return Promise.resolve(filterProjects(where).length);
        },
        findMany: ({
            where,
            orderBy,
            skip = 0,
            take,
        }: {
            where?: ProjectWhereInput;
            orderBy?: {
                completedAt?: 'asc' | 'desc';
                projectId?: 'asc' | 'desc';
            }[];
            skip?: number;
            take?: number;
        } = {}) => {
            let matched = filterProjects(where);
            if (orderBy) {
                matched = [...matched].sort((a, b) => {
                    const timeA = a.completedAt?.getTime() ?? 0;
                    const timeB = b.completedAt?.getTime() ?? 0;
                    if (timeB !== timeA) return timeB - timeA;
                    return b.projectId - a.projectId;
                });
            }
            const paged = matched.slice(
                skip,
                take !== undefined ? skip + take : undefined,
            );
            return Promise.resolve(paged);
        },
    },
    projectUpdate: {
        create: ({ data }: { data: Record<string, unknown> }) => {
            created.push(data);
            return Promise.resolve({
                projectUpdateId: created.length,
                ...data,
                createdAt: new Date(),
            });
        },
    },
    review: {
        findUnique: ({ where }: { where: { projectId: number } }) => {
            const found = createdReviews.find(
                (r) => (r.projectId as number) === where.projectId,
            );
            if (!found) return Promise.resolve(null);
            return Promise.resolve({
                reviewId: 1,
                ...found,
                createdAt: new Date('2026-10-23T12:00:00.000Z'),
            });
        },
        create: ({ data }: { data: Record<string, unknown> }) => {
            if (reviewAlreadyExists) {
                const err = new Error(
                    'Unique constraint failed on the fields: (proj_id)',
                );
                (err as unknown as { code: string }).code = 'P2002';
                throw err;
            }
            reviewAlreadyExists = true;
            createdReviews.push(data);
            return Promise.resolve({
                reviewId: createdReviews.length,
                ...data,
                createdAt: new Date('2026-10-23T12:00:00.000Z'),
            });
        },
    },
    // Both forms Prisma has: a list of queries (completed-projects) or a
    // callback given the client (confirm-deposit). The callback form puts
    // `project` back if its work throws, as a rollback would.
    $transaction: async (
        work: Promise<unknown>[] | ((tx: unknown) => Promise<unknown>),
    ) => {
        if (typeof work !== 'function') return Promise.all(work);
        const saved = structuredClone(project);
        try {
            return await work(fakePrisma);
        } catch (err) {
            project = saved;
            throw err;
        }
    },
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
    project = projectIn('IN_PROGRESS');
    created = [];
    createdReviews = [];
    reviewAlreadyExists = false;
    projects = [];
});

function projectIn(
    projectStatus: string,
    depositReportedAt: Date | null = null,
) {
    return {
        projectId: 1,
        proposalId: 1,
        totalBudget: 5000,
        startDate: new Date('2026-10-20T00:00:00.000Z'),
        projectStatus,
        depositReportedAt,
        depositConfirmedAt: null as Date | null,
        completedAt: null as Date | null,
        proposal: {
            senderId: PROVIDER,
            listing: { listingType: 'JOB', companyId: RECEIVER },
        },
    };
}

function projectOnService(projectStatus: string) {
    return {
        ...projectIn(projectStatus),
        proposal: {
            senderId: RECEIVER,
            listing: { listingType: 'SERVICE', companyId: PROVIDER },
        },
    };
}

const brief = (companyId: number) => ({
    companyId,
    companyName: `Company ${companyId}`,
    companyPhoto: null,
});

// A project between PROVIDER_ID and RECEIVER_ID. On a job the Provider sent
// the proposal; on a service the Receiver did (ADR 0016).
function row(
    projectId: number,
    listingType: 'JOB' | 'SERVICE' = 'JOB',
    projectStatus = 'COMPLETED',
    completedAt: Date | null = new Date('2026-10-01T00:00:00Z'),
): ProjectRow {
    const [senderId, ownerId] =
        listingType === 'JOB'
            ? [PROVIDER_ID, RECEIVER_ID]
            : [RECEIVER_ID, PROVIDER_ID];
    return {
        projectId,
        projectStatus,
        completedAt,
        proposal: {
            senderId,
            sender: brief(senderId),
            listing: {
                listingTitle: `Project ${projectId}`,
                listingType,
                companyId: ownerId,
                company: brief(ownerId),
            },
        },
    };
}
type Handler = (req: Request, res: Response) => Promise<void>;

// Calls handler on project 1 as callerId. Returns the status and JSON it
// answered with, or the ApiError it threw.
async function call(
    handler: Handler,
    callerId: number,
    body?: unknown,
    projectId = '1',
): Promise<unknown> {
    const req = {
        auth: { companyId: callerId },
        params: { projectId },
        body,
    } as unknown as Request;
    let status = 200;
    let json: unknown;
    const res = {
        status(code: number) {
            status = code;
            return this;
        },
        json(value: unknown) {
            json = value;
            return this;
        },
    } as unknown as Response;

    try {
        await handler(req, res);
    } catch (err) {
        return err;
    }
    return { status, body: json };
}

function postUpdate(
    callerId: number,
    body: unknown = { updateText: 'Wireframes done' },
): Promise<unknown> {
    return call(controller.createProjectUpdate, callerId, body);
}

function confirmDeposit(callerId: number): Promise<unknown> {
    return call(controller.confirmDeposit, callerId);
}

function cancelProject(callerId: number, projectId = '1'): Promise<unknown> {
    return call(controller.cancelProject, callerId, undefined, projectId);
}

function submitWork(callerId: number): Promise<unknown> {
    return call(controller.submitWork, callerId);
}

function rejectWork(
    callerId: number,
    body: unknown = { reason: 'The logo is the wrong colour' },
): Promise<unknown> {
    return call(controller.rejectWork, callerId, body);
}

function acceptWork(callerId: number): Promise<unknown> {
    return call(controller.acceptWork, callerId);
}

async function postReview(
    callerId: number,
    body: unknown = {
        workQualityScore: 5,
        serviceScore: 4,
        valueForMoneyScore: 4,
        deliveryTimeScore: 5,
        comment: 'Delivered top-notch quality!',
    },
): Promise<unknown> {
    const req = {
        auth: { companyId: callerId },
        params: { projectId: '1' },
        body,
    } as unknown as Request;
    let status = 200;
    let json: unknown;
    const res = {
        status(code: number) {
            status = code;
            return this;
        },
        json(value: unknown) {
            json = value;
            return this;
        },
    } as unknown as Response;

    try {
        await controller.createReview(req, res);
    } catch (err) {
        return err;
    }
    return { status, body: json as Review };
}

async function getProjectReview(callerId: number): Promise<unknown> {
    const req = {
        auth: { companyId: callerId },
        params: { projectId: '1' },
    } as unknown as Request;
    let status = 200;
    let json: unknown;
    const res = {
        status(code: number) {
            status = code;
            return this;
        },
        json(value: unknown) {
            json = value;
            return this;
        },
    } as unknown as Response;

    try {
        await controller.getProjectReview(req, res);
    } catch (err) {
        return err;
    }
    return { status, body: json as Review };
}

async function listProjects(
    companyId: string,
    query: Record<string, string> = {},
): Promise<unknown> {
    const req = {
        params: { companyId },
        query,
        auth: { companyId: 999, role: 'receiver' },
    } as unknown as Request;

    let status = 200;
    let json: unknown;
    const res = {
        status(code: number) {
            status = code;
            return this;
        },
        json(value: unknown) {
            json = value;
            return this;
        },
    } as unknown as Response;

    try {
        await controller.listProviderCompletedProjects(req, res);
    } catch (err) {
        return err;
    }
    return { status, body: json as Paginated<CompletedProject> };
}
function isApiError(status: number) {
    return (err: unknown) => err instanceof ApiError && err.status === status;
}

describe('POST /projects/:projectId/updates', () => {
    it('saves a PROGRESS update with its date and time (T4.10.3)', async () => {
        const startedAt = Date.now();
        const result = (await postUpdate(PROVIDER)) as {
            status: number;
            body: ProjectUpdate;
        };

        assert.equal(result.status, 201);
        assert.equal(result.body.updateType, 'PROGRESS');
        assert.equal(result.body.updateText, 'Wireframes done');
        const savedAt = Date.parse(result.body.createdAt);
        assert.ok(savedAt >= startedAt && savedAt <= Date.now());
        // The time comes from the database default, not from the request.
        assert.equal(created.length, 1);
        assert.ok(!('createdAt' in created[0]!));
    });

    it('refuses a createdAt sent by the client', async () => {
        const result = await postUpdate(PROVIDER, {
            updateText: 'Backdated',
            createdAt: '2020-01-01T00:00:00.000Z',
        });
        assert.ok(isApiError(400)(result));
        assert.equal(created.length, 0);
    });

    it('is a 403 for the Receiver and writes nothing (T4.10.4)', async () => {
        assert.ok(isApiError(403)(await postUpdate(RECEIVER)));
        assert.equal(created.length, 0);
    });

    it('is a 404 for a company outside the project (T4.10.4)', async () => {
        assert.ok(isApiError(404)(await postUpdate(OUTSIDER)));
        assert.equal(created.length, 0);
    });

    it('is a 409 when the project is not IN_PROGRESS', async () => {
        project = projectIn('AWAITING_ACCEPTANCE');
        assert.ok(isApiError(409)(await postUpdate(PROVIDER)));
        assert.equal(created.length, 0);
    });
});

describe('POST /projects/:projectId/confirm-deposit', () => {
    beforeEach(() => {
        project = projectIn(
            'AWAITING_DEPOSIT',
            new Date('2026-10-22T09:00:00.000Z'),
        );
    });

    it('moves the project to IN_PROGRESS (T4.7.3)', async () => {
        const startedAt = Date.now();
        const result = (await confirmDeposit(PROVIDER)) as {
            status: number;
            body: Project;
        };

        assert.equal(result.status, 200);
        assert.equal(result.body.projectStatus, 'IN_PROGRESS');
        const confirmedAt = Date.parse(result.body.depositConfirmedAt!);
        assert.ok(confirmedAt >= startedAt && confirmedAt <= Date.now());
        assert.equal(project!.projectStatus, 'IN_PROGRESS');
    });

    it('is a 409 before the Receiver reports it (T4.7.4)', async () => {
        project = projectIn('AWAITING_DEPOSIT');
        assert.ok(isApiError(409)(await confirmDeposit(PROVIDER)));
        // The status move rolls back with the refused stamp.
        assert.equal(project.projectStatus, 'AWAITING_DEPOSIT');
        assert.equal(project.depositConfirmedAt, null);
    });

    it('is a 403 for the Receiver and changes nothing (T4.7.4)', async () => {
        assert.ok(isApiError(403)(await confirmDeposit(RECEIVER)));
        assert.equal(project!.projectStatus, 'AWAITING_DEPOSIT');
        assert.equal(project!.depositConfirmedAt, null);
    });
});

describe('POST /projects/:projectId/cancel (US4-8)', () => {
    beforeEach(() => {
        project = projectIn('AWAITING_QUOTATION');
    });

    it('either party cancels before work starts, on a job or a service', async () => {
        for (const [start, callerId] of [
            [projectIn('AWAITING_QUOTATION'), PROVIDER],
            [projectIn('AWAITING_QUOTATION'), RECEIVER],
            [projectOnService('AWAITING_DEPOSIT'), PROVIDER],
            [projectOnService('AWAITING_DEPOSIT'), RECEIVER],
        ] as const) {
            project = start;
            const result = (await cancelProject(callerId)) as {
                status: number;
                body: Project;
            };

            assert.equal(result.status, 200);
            assert.equal(result.body.projectStatus, 'CANCELLED');
            assert.equal(project.projectStatus, 'CANCELLED');
        }
    });

    it('is a 404 for an outsider and changes nothing', async () => {
        assert.ok(isApiError(404)(await cancelProject(OUTSIDER)));
        assert.equal(project!.projectStatus, 'AWAITING_QUOTATION');
    });

    it('is a 404 when the project does not exist', async () => {
        project = null;
        assert.ok(isApiError(404)(await cancelProject(PROVIDER)));
    });

    it('is a 400 when projectId parameter is invalid', async () => {
        assert.ok(
            isApiError(400)(await cancelProject(PROVIDER, 'not-a-number')),
        );
        assert.equal(project!.projectStatus, 'AWAITING_QUOTATION');
    });

    it('is a 409 when the project is already IN_PROGRESS', async () => {
        project = projectIn('IN_PROGRESS');
        assert.ok(isApiError(409)(await cancelProject(PROVIDER)));
        assert.equal(project.projectStatus, 'IN_PROGRESS');
    });

    it('is a 409 when the project is in another post-work status or already CANCELLED', async () => {
        for (const status of [
            'AWAITING_ACCEPTANCE',
            'COMPLETED',
            'CANCELLED',
        ] as const) {
            project = projectIn(status);
            assert.ok(isApiError(409)(await cancelProject(RECEIVER)));
            assert.equal(project.projectStatus, status);
        }
    });
});

describe('POST /projects/:projectId/submit-work', () => {
    it('moves the project to AWAITING_ACCEPTANCE (T4.11.4)', async () => {
        const result = (await submitWork(PROVIDER)) as {
            status: number;
            body: Project;
        };

        assert.equal(result.status, 200);
        assert.equal(result.body.projectStatus, 'AWAITING_ACCEPTANCE');
        assert.equal(project!.projectStatus, 'AWAITING_ACCEPTANCE');
    });

    it('is a 403 for the Receiver and changes nothing (T4.11.4)', async () => {
        assert.ok(isApiError(403)(await submitWork(RECEIVER)));
        assert.equal(project!.projectStatus, 'IN_PROGRESS');
    });

    it('is a 404 for a company outside the project (T4.11.4)', async () => {
        assert.ok(isApiError(404)(await submitWork(OUTSIDER)));
        assert.equal(project!.projectStatus, 'IN_PROGRESS');
    });

    // Also what a second click gets once the first one moved it.
    it('is a 409 when the project is not IN_PROGRESS', async () => {
        project = projectIn('AWAITING_ACCEPTANCE');
        assert.ok(isApiError(409)(await submitWork(PROVIDER)));
        assert.equal(project.projectStatus, 'AWAITING_ACCEPTANCE');
    });
});

describe('POST /projects/:projectId/reject-work', () => {
    beforeEach(() => {
        project = projectIn('AWAITING_ACCEPTANCE');
    });

    it('moves the project back to IN_PROGRESS and logs the reason (T4.12.4)', async () => {
        const result = (await rejectWork(RECEIVER)) as {
            status: number;
            body: Project;
        };

        assert.equal(result.status, 200);
        assert.equal(result.body.projectStatus, 'IN_PROGRESS');
        assert.equal(project!.projectStatus, 'IN_PROGRESS');
        assert.deepEqual(created, [
            {
                projectId: 1,
                updateType: 'WORK_REJECTED',
                updateText: 'The logo is the wrong colour',
            },
        ]);
    });

    it('is a 400 without a reason and changes nothing (T4.12.3)', async () => {
        for (const body of [{}, { reason: '' }, { reason: '   ' }]) {
            assert.ok(isApiError(400)(await rejectWork(RECEIVER, body)));
        }
        assert.equal(project!.projectStatus, 'AWAITING_ACCEPTANCE');
        assert.equal(created.length, 0);
    });

    it('is a 403 for the Provider and changes nothing', async () => {
        assert.ok(isApiError(403)(await rejectWork(PROVIDER)));
        assert.equal(project!.projectStatus, 'AWAITING_ACCEPTANCE');
        assert.equal(created.length, 0);
    });

    // Also what a second click gets once the first one moved it.
    it('is a 409 when the project is not AWAITING_ACCEPTANCE', async () => {
        project = projectIn('IN_PROGRESS');
        assert.ok(isApiError(409)(await rejectWork(RECEIVER)));
        assert.equal(project.projectStatus, 'IN_PROGRESS');
        assert.equal(created.length, 0);
    });
});

describe('POST /projects/:projectId/accept-work', () => {
    beforeEach(() => {
        project = projectIn('AWAITING_ACCEPTANCE');
    });

    it('completes the project and records the time (T4.13.3)', async () => {
        const startedAt = Date.now();
        const result = (await acceptWork(RECEIVER)) as {
            status: number;
            body: Project;
        };

        assert.equal(result.status, 200);
        assert.equal(result.body.projectStatus, 'COMPLETED');
        const completedAt = Date.parse(result.body.completedAt!);
        assert.ok(completedAt >= startedAt && completedAt <= Date.now());
        assert.equal(project!.projectStatus, 'COMPLETED');
    });

    it('is a 403 for the Provider and changes nothing (T4.13.4)', async () => {
        assert.ok(isApiError(403)(await acceptWork(PROVIDER)));
        assert.equal(project!.projectStatus, 'AWAITING_ACCEPTANCE');
        assert.equal(project!.completedAt, null);
    });

    it('is a 404 for a company outside the project', async () => {
        assert.ok(isApiError(404)(await acceptWork(OUTSIDER)));
        assert.equal(project!.projectStatus, 'AWAITING_ACCEPTANCE');
        assert.equal(project!.completedAt, null);
    });

    // Also what a second click gets once the first one completed it.
    it('is a 409 when the project is not AWAITING_ACCEPTANCE (T4.13.4)', async () => {
        project = projectIn('IN_PROGRESS');
        assert.ok(isApiError(409)(await acceptWork(RECEIVER)));
        assert.equal(project.projectStatus, 'IN_PROGRESS');
        assert.equal(project.completedAt, null);
    });
});

describe('POST /projects/:projectId/review', () => {
    beforeEach(() => {
        project = projectIn('COMPLETED');
    });

    it('creates a review on a completed job project by its receiver (201)', async () => {
        const result = (await postReview(RECEIVER)) as {
            status: number;
            body: Review;
        };

        assert.equal(result.status, 201);
        assert.equal(result.body.projectId, 1);
        assert.equal(result.body.workQualityScore, 5);
        assert.equal(result.body.serviceScore, 4);
        assert.equal(result.body.valueForMoneyScore, 4);
        assert.equal(result.body.deliveryTimeScore, 5);
        assert.equal(result.body.comment, 'Delivered top-notch quality!');
        assert.equal(result.body.createdAt, '2026-10-23T12:00:00.000Z');
        assert.equal(createdReviews.length, 1);
    });

    it('creates a review on a completed service project where sender is receiver (201)', async () => {
        project = projectOnService('COMPLETED');
        const result = (await postReview(RECEIVER, {
            workQualityScore: 4,
            serviceScore: 5,
            valueForMoneyScore: 3,
            deliveryTimeScore: 4,
        })) as {
            status: number;
            body: Review;
        };

        assert.equal(result.status, 201);
        assert.equal(result.body.projectId, 1);
        assert.equal(result.body.comment, null);
    });

    it('rejects an outsider with 404 Project not found', async () => {
        const result = await postReview(OUTSIDER);
        assert.ok(isApiError(404)(result));
        assert.equal(createdReviews.length, 0);
    });

    it('rejects an unknown project with 404 Project not found', async () => {
        project = null;
        const result = await postReview(RECEIVER);
        assert.ok(isApiError(404)(result));
        assert.equal(createdReviews.length, 0);
    });

    it('rejects the provider with 403 Only the Receiver can review the project', async () => {
        const result = await postReview(PROVIDER);
        assert.ok(isApiError(403)(result));
        assert.equal(createdReviews.length, 0);
    });

    it('rejects a non-COMPLETED project with 409 Project is not COMPLETED', async () => {
        project = projectIn('IN_PROGRESS');
        const result = await postReview(RECEIVER);
        assert.ok(isApiError(409)(result));
        assert.equal(createdReviews.length, 0);
    });

    it('rejects a second review on the same project with 409 Project has already been reviewed', async () => {
        reviewAlreadyExists = true;
        const result = await postReview(RECEIVER);
        assert.ok(isApiError(409)(result));
    });

    it('rejects invalid scores outside 1-5 with 400', async () => {
        const result = await postReview(RECEIVER, {
            workQualityScore: 6,
            serviceScore: 0,
            valueForMoneyScore: 3.5,
            deliveryTimeScore: 5,
        });
        assert.ok(isApiError(400)(result));
        assert.equal(createdReviews.length, 0);
    });

    it('rejects a comment longer than 500 characters with 400', async () => {
        const result = await postReview(RECEIVER, {
            workQualityScore: 5,
            serviceScore: 5,
            valueForMoneyScore: 5,
            deliveryTimeScore: 5,
            comment: 'a'.repeat(501),
        });
        assert.ok(isApiError(400)(result));
        assert.equal(createdReviews.length, 0);
    });
});

describe('GET /projects/:projectId/review', () => {
    it('returns the review for the Receiver (200)', async () => {
        project = projectIn('COMPLETED');
        await postReview(RECEIVER);

        const result = (await getProjectReview(RECEIVER)) as {
            status: number;
            body: Review;
        };

        assert.equal(result.status, 200);
        assert.equal(result.body.projectId, 1);
        assert.equal(result.body.workQualityScore, 5);
        assert.equal(result.body.comment, 'Delivered top-notch quality!');
    });

    it('returns the review for the Provider (200)', async () => {
        project = projectIn('COMPLETED');
        await postReview(RECEIVER);

        const result = (await getProjectReview(PROVIDER)) as {
            status: number;
            body: Review;
        };

        assert.equal(result.status, 200);
        assert.equal(result.body.projectId, 1);
        assert.equal(result.body.workQualityScore, 5);
    });

    it('answers 404 when the project has not been reviewed yet', async () => {
        project = projectIn('COMPLETED');
        const result = await getProjectReview(RECEIVER);
        assert.ok(isApiError(404)(result));
    });

    it('answers 404 for an outsider', async () => {
        project = projectIn('COMPLETED');
        await postReview(RECEIVER);
        const result = await getProjectReview(OUTSIDER);
        assert.ok(isApiError(404)(result));
    });

    it('answers 404 for an unknown project', async () => {
        project = null;
        const result = await getProjectReview(RECEIVER);
        assert.ok(isApiError(404)(result));
    });
});

describe('GET /companies/:companyId/completed-projects', () => {
    it('returns an empty list when the provider has no completed projects', async () => {
        const result = (await listProjects(String(PROVIDER_ID))) as {
            status: number;
            body: Paginated<CompletedProject>;
        };
        assert.equal(result.status, 200);
        assert.deepEqual(result.body.items, []);
        assert.deepEqual(result.body.pagination, {
            page: 1,
            pageSize: 12,
            totalItems: 0,
            totalPages: 0,
        });
    });

    it('returns completed projects for a Provider on Job listings (newest first)', async () => {
        projects.push(
            row(1, 'JOB', 'COMPLETED', new Date('2026-10-01T00:00:00Z')),
            row(2, 'JOB', 'COMPLETED', new Date('2026-10-15T00:00:00Z')),
        );

        const result = (await listProjects(String(PROVIDER_ID))) as {
            status: number;
            body: Paginated<CompletedProject>;
        };
        assert.equal(result.status, 200);
        assert.equal(result.body.items.length, 2);
        assert.equal(result.body.items[0]!.projectId, 2);
        assert.equal(result.body.items[1]!.projectId, 1);
        assert.deepEqual(result.body.items[0]!.receiver, brief(RECEIVER_ID));
        assert.equal(
            result.body.items[0]!.completedAt,
            '2026-10-15T00:00:00.000Z',
        );
    });

    it('returns completed projects for a Provider on Service listings (where Provider is service owner)', async () => {
        projects.push(
            row(3, 'SERVICE', 'COMPLETED', new Date('2026-10-05T00:00:00Z')),
        );

        const result = (await listProjects(String(PROVIDER_ID))) as {
            status: number;
            body: Paginated<CompletedProject>;
        };
        assert.equal(result.status, 200);
        assert.equal(result.body.items.length, 1);
        assert.equal(result.body.items[0]!.projectId, 3);
        assert.deepEqual(result.body.items[0]!.receiver, brief(RECEIVER_ID));
    });

    it('filters out non-COMPLETED projects', async () => {
        const otherStatuses = [
            'AWAITING_QUOTATION',
            'AWAITING_DEPOSIT',
            'IN_PROGRESS',
            'AWAITING_ACCEPTANCE',
            'CANCELLED',
        ];
        otherStatuses.forEach((status, i) => {
            projects.push(row(10 + i, 'JOB', status, null));
        });
        projects.push(
            row(99, 'JOB', 'COMPLETED', new Date('2026-10-20T00:00:00Z')),
        );

        const result = (await listProjects(String(PROVIDER_ID))) as {
            status: number;
            body: Paginated<CompletedProject>;
        };
        assert.equal(result.status, 200);
        assert.equal(result.body.items.length, 1);
        assert.equal(result.body.items[0]!.projectId, 99);
    });

    it('paginates completed projects according to query parameters', async () => {
        for (let i = 1; i <= 25; i++) {
            projects.push(
                row(i, 'JOB', 'COMPLETED', new Date(Date.UTC(2026, 0, i))),
            );
        }

        const result = (await listProjects(String(PROVIDER_ID), {
            page: '2',
            pageSize: '10',
        })) as {
            status: number;
            body: Paginated<CompletedProject>;
        };
        assert.equal(result.status, 200);
        assert.equal(result.body.items.length, 10);
        assert.equal(result.body.pagination.page, 2);
        assert.equal(result.body.pagination.pageSize, 10);
        assert.equal(result.body.pagination.totalItems, 25);
        assert.equal(result.body.pagination.totalPages, 3);
        // Newest first: page 1 was ids 25..16; page 2 is 15..6.
        assert.equal(result.body.items[0]!.projectId, 15);
        assert.equal(result.body.items[9]!.projectId, 6);
    });

    it('answers 404 for an unknown company', async () => {
        const result = await listProjects('9999');
        assert.ok(isApiError(404)(result));
    });

    it('answers 404 for a soft-deleted company', async () => {
        const result = await listProjects(String(DELETED_ID));
        assert.ok(isApiError(404)(result));
    });

    it('answers 404 for an ADMIN company', async () => {
        const result = await listProjects(String(ADMIN_ID));
        assert.ok(isApiError(404)(result));
    });

    it('answers 400 for an invalid companyId', async () => {
        assert.ok(isApiError(400)(await listProjects('abc')));
        assert.ok(isApiError(400)(await listProjects('0')));
        assert.ok(isApiError(400)(await listProjects('-5')));
        assert.ok(isApiError(400)(await listProjects('1.5')));
    });

    it('answers 400 for invalid pagination parameters', async () => {
        assert.ok(
            isApiError(400)(
                await listProjects(String(PROVIDER_ID), { page: '0' }),
            ),
        );
        assert.ok(
            isApiError(400)(
                await listProjects(String(PROVIDER_ID), { page: '-1' }),
            ),
        );
        assert.ok(
            isApiError(400)(
                await listProjects(String(PROVIDER_ID), { pageSize: '0' }),
            ),
        );
        assert.ok(
            isApiError(400)(
                await listProjects(String(PROVIDER_ID), { pageSize: '100' }),
            ),
        );
    });
});
