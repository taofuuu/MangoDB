/*
 * Unit tests for the listing and project helpers in src/lib: job.ts,
 * service.ts, company-search.ts and project.ts.
 *
 * Covers the row mappers with every optional part missing and present (no job
 * row, no deadline, no service row, no company, no review), each search
 * filter on and off, every sort order, the rating sort with rated and unrated
 * Providers in both directions, the tech-stack spelling rule, project parties
 * on a job and a service, every project status move (allowed, refused, lost
 * race) and the project view for each side.
 *
 * How: plain calls; the database is the Prisma fake.
 */
import { describe, expect, it } from '@jest/globals';
import {
    jobDeadlineWhere,
    jobOrderBy,
    jobSearchWhere,
    toJob,
} from '../../src/lib/job';
import {
    ensureTechStack,
    isRatingSortOrder,
    serviceFilterWhere,
    serviceOrderBy,
    serviceSearchWhere,
    sortServicesByRating,
    toService,
    toServiceFilterOptions,
    toServiceSummary,
} from '../../src/lib/service';
import {
    companyKeywordWhere,
    toCompanySummary,
} from '../../src/lib/company-search';
import {
    assertProjectParty,
    assertProjectStatus,
    createProjectFromProposal,
    moveProjectStatus,
    projectParties,
    providerCompletedProjectsWhere,
    toCompletedProject,
    toProjectDetail,
    toProjectSummary,
    toProjectUpdate,
    type CompletedProjectRow,
} from '../../src/lib/project';
import type { Prisma } from '../../src/generated/prisma/client';
import { db } from '../helpers/prisma-mock';
import { brief, NO_RATING, scores } from '../helpers/rows';

const tx = db as unknown as Prisma.TransactionClient;
const DAY = new Date('2026-03-04T00:00:00Z');

describe('job', () => {
    const row = {
        listingId: 1,
        companyId: 1,
        company: brief(),
        listingTitle: 'T',
        listingDesc: 'D',
        minBudget: null,
        maxBudget: null,
        listingStatus: 'OPEN',
        createdAt: DAY,
        listingCategory: [{ categoryId: 2, category: { categoryName: 'Web' } }],
    };

    it('maps a job with and without its job row and deadline', () => {
        expect(toJob({ ...row, job: null })).toMatchObject({
            locationPref: null,
            duration: null,
            deadline: null,
            categories: ['Web'],
        });
        expect(
            toJob({
                ...row,
                job: { locationPref: 'BKK', duration: '1m', deadline: DAY },
            }),
        ).toMatchObject({ locationPref: 'BKK', deadline: '2026-03-04' });
        expect(
            toJob({
                ...row,
                job: { locationPref: null, duration: null, deadline: null },
            }).deadline,
        ).toBeNull();
    });

    it('a deadline filter is on or before by default, or on or after', () => {
        expect(jobDeadlineWhere('2026-03-04')).toEqual({
            job: { deadline: { lte: DAY } },
        });
        expect(jobDeadlineWhere('2026-03-04', 'AFTER')).toEqual({
            job: { deadline: { gte: DAY } },
        });
    });

    it('no filters keep only the always-on rules', () => {
        expect(jobSearchWhere({}, 9).AND).toHaveLength(3);
    });

    it('every filter adds its own condition', () => {
        const where = jobSearchWhere(
            {
                status: 'OPEN',
                companyId: 1,
                q: 'react app',
                category: ['Web'],
                minBudget: 1,
                maxBudget: 2,
                deadline: '2026-03-04',
                deadlineType: 'AFTER',
            },
            9,
        );

        expect(where.AND).toHaveLength(11);
        expect(where.AND).toContainEqual({ job: { deadline: { gte: DAY } } });
    });

    it('deadline type ANY ignores the deadline; BEFORE uses it', () => {
        expect(
            jobSearchWhere({ deadline: '2026-03-04', deadlineType: 'ANY' }, 9)
                .AND,
        ).toHaveLength(3);
        expect(
            jobSearchWhere(
                { deadline: '2026-03-04', deadlineType: 'BEFORE' },
                9,
            ).AND,
        ).toContainEqual({ job: { deadline: { lte: DAY } } });
        expect(jobSearchWhere({ category: [] }, 9).AND).toHaveLength(3);
    });

    it('each sort order ends with the listingId tie-break', () => {
        for (const order of [
            'maxBudgetDesc',
            'maxBudgetAsc',
            'deadlineAsc',
            'deadlineDesc',
            'newest',
        ] as const) {
            expect(jobOrderBy(order)[1]).toEqual({ listingId: 'desc' });
        }
    });
});

describe('service', () => {
    it('maps a service, sorting its stack, with or without a service row', () => {
        const row = {
            listingId: 1,
            companyId: 1,
            listingTitle: 'T',
            listingDesc: 'D',
            minBudget: 1,
            maxBudget: 2,
            listingStatus: 'OPEN',
            listingCategory: [{ categoryId: 3 }],
            company: brief(),
        };
        const stack = {
            serviceTechStack: [
                { techStack: { techStackName: 'Vue' } },
                { techStack: { techStackName: 'Go' } },
            ],
        };

        expect(toService({ ...row, service: stack }).techStack).toEqual([
            'Go',
            'Vue',
        ]);
        expect(toService({ ...row, service: null }).techStack).toEqual([]);
    });

    it('reuses a stored spelling and adds only new names', async () => {
        db.techStack.findMany.mockResolvedValue([{ techStackName: 'React' }]);

        await expect(
            ensureTechStack(['react', 'REACT', 'Bun']),
        ).resolves.toEqual(['React', 'Bun']);
        expect(db.techStack.createMany).toHaveBeenCalledWith({
            data: [{ techStackName: 'React' }, { techStackName: 'Bun' }],
            skipDuplicates: true,
        });
    });

    it('no names write nothing', async () => {
        await expect(ensureTechStack([])).resolves.toEqual([]);

        expect(db.techStack.findMany).not.toHaveBeenCalled();
        expect(db.techStack.createMany).not.toHaveBeenCalled();
    });

    it('filters: none, then each group', () => {
        expect(serviceFilterWhere({})).toEqual([]);
        expect(
            serviceFilterWhere({
                companyId: 1,
                category: ['Web'],
                techStack: ['Go'],
                minPrice: 1,
                maxPrice: 2,
            }),
        ).toHaveLength(5);
    });

    it('the search joins keyword words and filters in one AND', () => {
        expect(serviceSearchWhere({ q: 'a b', companyId: 1 }).AND).toHaveLength(
            3,
        );
    });

    it('knows the rating orders and gives each order its tie-breaks', () => {
        expect(isRatingSortOrder('ratingDesc')).toBe(true);
        expect(isRatingSortOrder('ratingAsc')).toBe(true);
        expect(isRatingSortOrder('newest')).toBe(false);
        expect(serviceOrderBy('priceAsc')).toHaveLength(3);
        expect(serviceOrderBy('priceDesc')[1]).toEqual({
            maxBudget: { sort: 'desc', nulls: 'first' },
        });
        expect(serviceOrderBy('newest')).toEqual(serviceOrderBy('ratingAsc'));
        expect(serviceOrderBy('ratingDesc')).toHaveLength(2);
    });

    it('sorts by rating both ways with unrated Providers last', () => {
        const rated = (n: number) => ({
            proposal: [{ project: { review: scores(n) } }],
            listing: [],
        });
        const rows = [
            { id: 'none', company: null },
            { id: 'low', company: rated(2) },
            { id: 'unrated', company: NO_RATING },
            { id: 'high', company: rated(5) },
            { id: 'none2', company: null },
        ];

        expect(
            sortServicesByRating(rows, 'ratingDesc').map((r) => r.id),
        ).toEqual(['high', 'low', 'none', 'unrated', 'none2']);
        expect(
            sortServicesByRating(rows, 'ratingAsc').map((r) => r.id),
        ).toEqual(['low', 'high', 'none', 'unrated', 'none2']);
    });

    it('a summary carries the rating, sorted categories and stack', () => {
        const row = {
            listingId: 1,
            listingTitle: 'T',
            listingDesc: 'D',
            minBudget: null,
            maxBudget: null,
            listingCategory: [
                { category: { categoryName: 'Web' } },
                { category: { categoryName: 'AI' } },
            ],
            service: null,
            company: { ...brief(), ...NO_RATING },
        };

        expect(toServiceSummary(row)).toMatchObject({
            categories: ['AI', 'Web'],
            averageRating: null,
            ratingCount: 0,
        });
        expect(() => toServiceSummary({ ...row, company: null })).toThrow(
            'Listing has no owning company',
        );
        expect(
            toServiceFilterOptions(
                [{ categoryName: 'AI' }],
                [{ techStackName: 'Go' }],
            ),
        ).toEqual({ categories: ['AI'], techStack: ['Go'] });
    });
});

describe('company-search', () => {
    it('one word looks at the company and its services', () => {
        expect(companyKeywordWhere('go').OR).toHaveLength(3);
    });

    it('a card lists each category and tech once, sorted', () => {
        const stack = (name: string) => ({
            serviceTechStack: [{ techStack: { techStackName: name } }],
        });
        const summary = toCompanySummary({
            companyId: 1,
            companyName: 'A',
            companyDescription: null,
            companyPhoto: null,
            accountType: 'PROVIDER',
            contactEmail: null,
            phone: '0',
            website: null,
            listing: [
                {
                    listingCategory: [{ category: { categoryName: 'Web' } }],
                    service: stack('Go'),
                },
                {
                    listingCategory: [
                        { category: { categoryName: 'Web' } },
                        { category: { categoryName: 'AI' } },
                    ],
                    service: stack('Go'),
                },
            ],
        });

        expect(summary.categories).toEqual(['AI', 'Web']);
        expect(summary.techStack).toEqual(['Go']);
    });
});

describe('project', () => {
    const jobProposal = {
        senderId: 2,
        listing: { listingType: 'JOB', companyId: 1 },
    };
    const serviceProposal = {
        senderId: 2,
        listing: { listingType: 'SERVICE', companyId: 1 },
    };

    it('the sender is the Provider on a job and the Receiver on a service', () => {
        expect(projectParties(jobProposal)).toEqual({
            providerId: 2,
            receiverId: 1,
        });
        expect(projectParties(serviceProposal)).toEqual({
            providerId: 1,
            receiverId: 2,
        });
        expect(() =>
            projectParties({
                senderId: 2,
                listing: { listingType: 'JOB', companyId: null },
            }),
        ).toThrow('Listing has no owning company');
        expect(providerCompletedProjectsWhere(1).OR).toHaveLength(2);
    });

    it('a new project waits for a quotation and logs the accept', async () => {
        db.project.create.mockResolvedValue({
            projectId: 5,
            proposalId: 6,
            totalBudget: 100,
            startDate: DAY,
            projectStatus: 'AWAITING_QUOTATION',
            depositReportedAt: DAY,
            depositConfirmedAt: null,
            completedAt: null,
        });

        const project = await createProjectFromProposal(tx, {
            proposalId: 6,
            proposalBudget: 100 as unknown as Prisma.Decimal,
        });

        expect(project).toMatchObject({
            totalBudget: 100,
            startDate: '2026-03-04',
            depositReportedAt: DAY.toISOString(),
            depositConfirmedAt: null,
        });
        expect(db.projectUpdate.create).toHaveBeenCalledWith({
            data: { projectId: 5, updateType: 'PROPOSAL_ACCEPTED' },
        });
    });

    describe('assertProjectParty', () => {
        const row = {
            proposalId: 6,
            projectStatus: 'IN_PROGRESS',
            proposal: jobProposal,
        };

        it('is 404 when missing or for an outsider', async () => {
            db.project.findUnique.mockResolvedValueOnce(null);
            await expect(assertProjectParty(1, 1)).rejects.toMatchObject({
                status: 404,
            });
            db.project.findUnique.mockResolvedValueOnce(row);
            await expect(assertProjectParty(1, 99)).rejects.toMatchObject({
                status: 404,
            });
        });

        it('names each party’s role', async () => {
            db.project.findUnique.mockResolvedValueOnce(row);
            await expect(assertProjectParty(1, 2)).resolves.toMatchObject({
                myRole: 'provider',
            });
            db.project.findUnique.mockResolvedValueOnce(row);
            await expect(assertProjectParty(1, 1)).resolves.toMatchObject({
                myRole: 'receiver',
            });
        });
    });

    it('assertProjectStatus is a 409 for any other status', () => {
        expect(() =>
            assertProjectStatus(
                { projectStatus: 'IN_PROGRESS' },
                'IN_PROGRESS',
            ),
        ).not.toThrow();
        expect(() =>
            assertProjectStatus({ projectStatus: 'COMPLETED' }, 'IN_PROGRESS'),
        ).toThrow('Project is not IN_PROGRESS');
    });

    it('moveProjectStatus: a refused move, a lost race, a move', async () => {
        await expect(
            moveProjectStatus(tx, 1, 'COMPLETED', 'IN_PROGRESS'),
        ).rejects.toThrow('Project cannot move from COMPLETED to IN_PROGRESS');
        expect(db.project.updateMany).not.toHaveBeenCalled();

        db.project.updateMany.mockResolvedValueOnce({ count: 0 });
        await expect(
            moveProjectStatus(tx, 1, 'IN_PROGRESS', 'AWAITING_ACCEPTANCE'),
        ).rejects.toThrow('Project is not IN_PROGRESS');

        db.project.updateMany.mockResolvedValueOnce({ count: 1 });
        await expect(
            moveProjectStatus(tx, 1, 'AWAITING_ACCEPTANCE', 'COMPLETED'),
        ).resolves.toBeUndefined();
    });

    describe('project view', () => {
        const project = {
            projectId: 5,
            proposalId: 6,
            totalBudget: 100 as unknown as Prisma.Decimal,
            startDate: DAY,
            projectStatus: 'IN_PROGRESS',
            depositReportedAt: null,
            depositConfirmedAt: null,
            completedAt: null,
        };
        function view(listingType: string) {
            return {
                ...project,
                proposal: {
                    senderId: 2,
                    sender: brief(2, 'Sender'),
                    listing: {
                        listingId: 4,
                        listingType,
                        listingTitle: 'L',
                        companyId: 1,
                        company: brief(1, 'Owner'),
                    },
                },
            };
        }

        it('a summary shows the other party for each side', () => {
            expect(toProjectSummary(view('JOB'), 2)).toMatchObject({
                myRole: 'provider',
                otherParty: { companyName: 'Owner' },
            });
            expect(toProjectSummary(view('JOB'), 1)).toMatchObject({
                myRole: 'receiver',
                otherParty: { companyName: 'Sender' },
            });
        });

        it('a detail names both parties on a service', () => {
            expect(toProjectDetail(view('SERVICE'), 1)).toMatchObject({
                myRole: 'provider',
                provider: { companyName: 'Owner' },
                receiver: { companyName: 'Sender' },
                listingId: 4,
            });
        });
    });

    describe('toCompletedProject', () => {
        function row(
            listingType: string,
            review: CompletedProjectRow['review'],
        ): CompletedProjectRow {
            return {
                projectId: 1,
                startDate: DAY,
                completedAt: DAY,
                review,
                proposal: {
                    sender: brief(2, 'Sender'),
                    listing: {
                        listingTitle: 'L',
                        listingDesc: 'D',
                        listingType,
                        company: brief(1, 'Owner'),
                        listingCategory: [
                            { category: { categoryName: 'Web' } },
                        ],
                        service: {
                            serviceTechStack: [
                                { techStack: { techStackName: 'Go' } },
                            ],
                        },
                    },
                },
            };
        }

        it('a service shows its stack, its owner as Provider and the review', () => {
            expect(
                toCompletedProject(
                    row('SERVICE', { ...scores(4), comment: 'ok' }),
                ),
            ).toMatchObject({
                provider: { companyName: 'Owner' },
                receiver: { companyName: 'Sender' },
                techStack: ['Go'],
                rating: 4,
                reviewComment: 'ok',
            });
        });

        it('a job has no stack; no review means no rating', () => {
            expect(toCompletedProject(row('JOB', null))).toMatchObject({
                provider: { companyName: 'Sender' },
                techStack: [],
                rating: null,
                reviewComment: null,
            });
        });

        it('a completed project with no completedAt is a 500', () => {
            expect(() =>
                toCompletedProject({ ...row('JOB', null), completedAt: null }),
            ).toThrow('Completed project has no completedAt');
        });
    });

    it('maps a timeline entry', () => {
        expect(
            toProjectUpdate({
                projectUpdateId: 1,
                projectId: 2,
                updateType: 'PROGRESS',
                updateText: 'half',
                createdAt: DAY,
            }).createdAt,
        ).toBe(DAY.toISOString());
    });
});
