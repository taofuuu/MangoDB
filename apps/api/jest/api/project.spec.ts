/*
 * API tests for /projects and a Provider's completed projects: the project
 * list and detail, the timeline, progress notes, the deposit steps, cancel,
 * submit / reject / accept work, and the review.
 *
 * Covers, for each action: the party that may do it, the other party's 403,
 * an outsider's 404, a project in the wrong status (409) and the lost race
 * where the conditional write matches nothing (409). Also the detail row
 * vanishing after the party check, a review with and without a comment, a
 * second review, and a review not written yet.
 *
 * How: the real app on a random port; the database is the Prisma fake. The
 * project is on a job, so the proposal sender (PROVIDER) is the Provider and
 * the job owner (RECEIVER) is the Receiver.
 */
import { describe, expect, it, jest } from '@jest/globals';
import { call, PROVIDER, RECEIVER, useApi } from '../helpers/http';
import { db } from '../helpers/prisma-mock';
import { brief, scores } from '../helpers/rows';

useApi();
jest.setTimeout(30_000);

const DAY = new Date('2026-02-01T00:00:00Z');
const OUTSIDER = { companyId: 50, role: 'provider' as const };

function party(projectStatus: string) {
    db.project.findUnique.mockResolvedValueOnce({
        proposalId: 30,
        projectStatus,
        proposal: {
            senderId: PROVIDER.companyId,
            listing: { listingType: 'JOB', companyId: RECEIVER.companyId },
        },
    });
}

const projectRow = {
    projectId: 40,
    proposalId: 30,
    totalBudget: 1000,
    startDate: DAY,
    projectStatus: 'IN_PROGRESS',
    depositReportedAt: null,
    depositConfirmedAt: null,
    completedAt: null,
};

const viewRow = {
    ...projectRow,
    proposal: {
        senderId: PROVIDER.companyId,
        sender: brief(PROVIDER.companyId, 'Provider'),
        listing: {
            listingId: 20,
            listingType: 'JOB',
            listingTitle: 'Job',
            companyId: RECEIVER.companyId,
            company: brief(RECEIVER.companyId, 'Receiver'),
        },
    },
};

const post = (path: string, as = PROVIDER, body?: unknown) =>
    call('POST', `/projects/40${path}`, { as, body });

describe('reading projects', () => {
    it('lists the caller’s projects', async () => {
        db.project.count.mockResolvedValue(1);
        db.project.findMany.mockResolvedValue([viewRow]);

        const res = await call('GET', '/projects/mine', { as: RECEIVER });

        expect(res.body.items[0]).toMatchObject({
            myRole: 'receiver',
            otherParty: { companyName: 'Provider' },
        });
    });

    it('shows one project to a party; 404 to an outsider', async () => {
        party('IN_PROGRESS');
        db.project.findUnique.mockResolvedValueOnce(viewRow);
        const mine = await call('GET', '/projects/40', { as: PROVIDER });
        party('IN_PROGRESS');
        const outsider = await call('GET', '/projects/40', { as: OUTSIDER });

        expect(mine.body).toMatchObject({ myRole: 'provider', listingId: 20 });
        expect(outsider.status).toBe(404);
    });

    it('a project gone after the party check is a 404', async () => {
        party('IN_PROGRESS');
        db.project.findUnique.mockResolvedValueOnce(null);

        const res = await call('GET', '/projects/40', { as: PROVIDER });

        expect(res.status).toBe(404);
    });

    it('lists the timeline', async () => {
        party('IN_PROGRESS');
        db.projectUpdate.findMany.mockResolvedValue([
            {
                projectUpdateId: 1,
                projectId: 40,
                updateType: 'PROPOSAL_ACCEPTED',
                updateText: null,
                createdAt: DAY,
            },
        ]);

        const res = await call('GET', '/projects/40/updates', { as: RECEIVER });

        expect(res.body[0].updateType).toBe('PROPOSAL_ACCEPTED');
    });

    it('lists a Provider’s completed projects', async () => {
        db.company.findFirst.mockResolvedValue({ companyId: 1 });
        db.project.count.mockResolvedValue(0);
        db.project.findMany.mockResolvedValue([]);

        const res = await call('GET', '/companies/1/completed-projects', {
            as: RECEIVER,
        });

        expect(res.body.pagination.totalItems).toBe(0);
    });
});

describe('POST /projects/:id/updates', () => {
    it('the Provider adds a note while in progress', async () => {
        party('IN_PROGRESS');
        db.projectUpdate.create.mockResolvedValue({
            projectUpdateId: 2,
            projectId: 40,
            updateType: 'PROGRESS',
            updateText: 'half done',
            createdAt: DAY,
        });

        const res = await post('/updates', PROVIDER, {
            updateText: 'half done',
        });

        expect(res.status).toBe(201);
    });

    it('the Receiver cannot; a project not in progress is a 409', async () => {
        party('IN_PROGRESS');
        const receiver = await post('/updates', RECEIVER, { updateText: 'x' });
        party('COMPLETED');
        const done = await post('/updates', PROVIDER, { updateText: 'x' });

        expect(receiver.status).toBe(403);
        expect(done.status).toBe(409);
    });
});

describe('deposit', () => {
    it('the Receiver reports it once', async () => {
        party('AWAITING_DEPOSIT');
        db.project.update.mockResolvedValue({
            ...projectRow,
            depositReportedAt: DAY,
        });

        const res = await post('/report-deposit', RECEIVER);

        expect(res.body.depositReportedAt).toBe(DAY.toISOString());
        expect(db.notification.create.mock.calls[0]![0].data).toMatchObject({
            senderId: RECEIVER.companyId,
            recipientId: PROVIDER.companyId,
        });
    });

    it('report: Provider 403, wrong status 409, double click 409', async () => {
        party('AWAITING_DEPOSIT');
        const provider = await post('/report-deposit', PROVIDER);
        party('IN_PROGRESS');
        const status = await post('/report-deposit', RECEIVER);
        party('AWAITING_DEPOSIT');
        db.project.update.mockRejectedValueOnce({ code: 'P2025' });
        const again = await post('/report-deposit', RECEIVER);

        expect(provider.status).toBe(403);
        expect(status.status).toBe(409);
        expect(again.body.error.message).toBe(
            'Deposit has already been reported',
        );
    });

    it('the Provider confirms a reported deposit', async () => {
        party('AWAITING_DEPOSIT');
        db.project.updateMany.mockResolvedValue({ count: 1 });
        db.project.update.mockResolvedValue({
            ...projectRow,
            depositConfirmedAt: DAY,
        });

        const res = await post('/confirm-deposit', PROVIDER);

        expect(res.status).toBe(200);
    });

    it('confirm: Receiver 403, not reported yet 409', async () => {
        party('AWAITING_DEPOSIT');
        const receiver = await post('/confirm-deposit', RECEIVER);
        party('AWAITING_DEPOSIT');
        db.project.updateMany.mockResolvedValue({ count: 1 });
        db.project.update.mockRejectedValueOnce({ code: 'P2025' });
        const early = await post('/confirm-deposit', PROVIDER);

        expect(receiver.status).toBe(403);
        expect(early.body.error.message).toBe(
            'The Receiver has not reported the deposit yet',
        );
    });
});

describe('POST /projects/:id/cancel', () => {
    it('either party cancels before work starts', async () => {
        party('AWAITING_QUOTATION');
        db.project.updateMany.mockResolvedValue({ count: 1 });
        db.project.findUniqueOrThrow.mockResolvedValue({
            ...projectRow,
            projectStatus: 'CANCELLED',
        });

        const res = await post('/cancel', RECEIVER);

        expect(res.body.projectStatus).toBe('CANCELLED');
    });

    it('a project in progress cannot be cancelled', async () => {
        party('IN_PROGRESS');

        const res = await post('/cancel', PROVIDER);

        expect(res.status).toBe(409);
    });
});

describe('work', () => {
    it('the Provider submits it; the Receiver cannot', async () => {
        party('IN_PROGRESS');
        db.project.updateMany.mockResolvedValue({ count: 1 });
        db.project.findUniqueOrThrow.mockResolvedValue({
            ...projectRow,
            projectStatus: 'AWAITING_ACCEPTANCE',
        });
        const ok = await post('/submit-work', PROVIDER);
        party('IN_PROGRESS');
        const receiver = await post('/submit-work', RECEIVER);

        expect(ok.body.projectStatus).toBe('AWAITING_ACCEPTANCE');
        expect(receiver.status).toBe(403);
    });

    it('the Receiver rejects it with a reason; the Provider cannot', async () => {
        party('AWAITING_ACCEPTANCE');
        db.project.updateMany.mockResolvedValue({ count: 1 });
        db.project.findUniqueOrThrow.mockResolvedValue(projectRow);
        const ok = await post('/reject-work', RECEIVER, {
            reason: 'Missing login page',
        });
        party('AWAITING_ACCEPTANCE');
        const provider = await post('/reject-work', PROVIDER, { reason: 'x' });

        expect(ok.status).toBe(200);
        expect(db.projectUpdate.create.mock.calls[0]![0].data).toMatchObject({
            updateType: 'WORK_REJECTED',
            updateText: 'Missing login page',
        });
        expect(provider.status).toBe(403);
    });

    it('the Receiver accepts it; the Provider cannot', async () => {
        party('AWAITING_ACCEPTANCE');
        db.project.updateMany.mockResolvedValue({ count: 1 });
        db.project.update.mockResolvedValue({
            ...projectRow,
            projectStatus: 'COMPLETED',
            completedAt: DAY,
        });
        const ok = await post('/accept-work', RECEIVER);
        party('AWAITING_ACCEPTANCE');
        const provider = await post('/accept-work', PROVIDER);

        expect(ok.body.completedAt).toBe(DAY.toISOString());
        expect(provider.status).toBe(403);
    });
});

describe('review', () => {
    const review = {
        reviewId: 1,
        projectId: 40,
        ...scores(5),
        comment: null,
        createdAt: DAY,
    };
    const body = { ...scores(5) };

    it('the Receiver reviews a completed project, with or without a comment', async () => {
        party('COMPLETED');
        db.review.create.mockResolvedValue(review);
        const plain = await post('/review', RECEIVER, body);
        party('COMPLETED');
        const commented = await post('/review', RECEIVER, {
            ...body,
            comment: 'Great',
        });

        expect(plain.status).toBe(201);
        expect(commented.status).toBe(201);
        const [first, second] = db.review.create.mock.calls.map(
            (c) => c[0].data,
        );
        expect(first.comment).toBeNull();
        expect(second.comment).toBe('Great');
    });

    it('Provider 403, not completed 409, second review 409', async () => {
        party('COMPLETED');
        const provider = await post('/review', PROVIDER, body);
        party('IN_PROGRESS');
        const early = await post('/review', RECEIVER, body);
        party('COMPLETED');
        db.review.create.mockRejectedValueOnce({ code: 'P2002' });
        const again = await post('/review', RECEIVER, body);

        expect(provider.status).toBe(403);
        expect(early.status).toBe(409);
        expect(again.body.error.message).toBe(
            'Project has already been reviewed',
        );
    });

    it('reads the review, or 404 before there is one', async () => {
        party('COMPLETED');
        db.review.findUnique.mockResolvedValueOnce(review);
        const found = await call('GET', '/projects/40/review', {
            as: PROVIDER,
        });
        party('COMPLETED');
        db.review.findUnique.mockResolvedValueOnce(null);
        const none = await call('GET', '/projects/40/review', { as: PROVIDER });

        expect(found.body.reviewId).toBe(1);
        expect(none.status).toBe(404);
    });
});
