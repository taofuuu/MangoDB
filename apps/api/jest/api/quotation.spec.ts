/*
 * API tests for quotations: upload on a project, the project's list, and
 * accept, reject and delete of one quotation.
 *
 * Covers: upload by the Provider, refused with no PDF, for the Receiver, in
 * the wrong project status, with one already pending, and when a concurrent
 * upload wins the unique index (the PDF is removed again); the list as signed
 * links; accept and reject by the Receiver only, and the lost race when the
 * quotation is no longer pending; delete by the Provider only, keeping a PDF
 * another row still uses and removing one nobody uses.
 *
 * How: the real app on a random port; the database and storage are fakes.
 * The project is on a job: PROVIDER sent the proposal, RECEIVER owns the job.
 */
import { describe, expect, it, jest } from '@jest/globals';
import {
    call,
    formWith,
    PDF,
    PROVIDER,
    RECEIVER,
    useApi,
} from '../helpers/http';
import { db } from '../helpers/prisma-mock';
import { bucket, publicUrl } from '../helpers/storage-mock';

useApi();
jest.setTimeout(30_000);

const STORED = publicUrl('quotation', 'quotations/q.pdf');
const quotationRow = {
    quotationId: 60,
    projectId: 40,
    quotationFile: STORED,
    quotationStatus: 'PENDING',
    createdAt: new Date('2026-02-01T00:00:00Z'),
};
const parties = {
    senderId: PROVIDER.companyId,
    listing: { listingType: 'JOB', companyId: RECEIVER.companyId },
};

function projectParty(projectStatus: string) {
    db.project.findUnique.mockResolvedValueOnce({
        proposalId: 30,
        projectStatus,
        proposal: parties,
    });
}

function quotationParty(projectStatus: string) {
    db.quotation.findUnique.mockResolvedValueOnce({
        projectId: 40,
        project: { proposalId: 30, projectStatus, proposal: parties },
    });
}

const pdf = () =>
    formWith({}, { field: 'file', bytes: PDF, type: 'application/pdf' });

describe('POST /projects/:id/quotations', () => {
    it('the Provider uploads one, sent back as a signed link', async () => {
        projectParty('AWAITING_QUOTATION');
        db.quotation.findFirst.mockResolvedValue(null);
        db.quotation.create.mockResolvedValue(quotationRow);
        bucket.createSignedUrls.mockResolvedValue({
            data: [{ path: 'quotations/q.pdf', signedUrl: 'https://signed/q' }],
            error: null,
        });

        const res = await call('POST', '/projects/40/quotations', {
            as: PROVIDER,
            form: pdf(),
        });

        expect(res.status).toBe(201);
        expect(res.body.quotationFile).toBe('https://signed/q');
    });

    it('no PDF is a 400 that asks for one', async () => {
        const res = await call('POST', '/projects/40/quotations', {
            as: PROVIDER,
            form: formWith({}),
        });

        expect(res.body.error.details).toEqual([
            { field: 'file', message: 'Choose a PDF first' },
        ]);
    });

    it('Receiver 403, wrong status 409, one already pending 409', async () => {
        projectParty('AWAITING_QUOTATION');
        const receiver = await call('POST', '/projects/40/quotations', {
            as: RECEIVER,
            form: pdf(),
        });
        projectParty('IN_PROGRESS');
        const status = await call('POST', '/projects/40/quotations', {
            as: PROVIDER,
            form: pdf(),
        });
        projectParty('AWAITING_QUOTATION');
        db.quotation.findFirst.mockResolvedValue({ quotationId: 1 });
        const pending = await call('POST', '/projects/40/quotations', {
            as: PROVIDER,
            form: pdf(),
        });

        expect(receiver.status).toBe(403);
        expect(status.status).toBe(409);
        expect(pending.body.error.message).toBe(
            'A quotation is already pending',
        );
        expect(bucket.upload).not.toHaveBeenCalled();
    });

    it('a concurrent upload that wins is a 409, and our PDF is removed', async () => {
        projectParty('AWAITING_QUOTATION');
        db.quotation.findFirst.mockResolvedValue(null);
        db.quotation.create.mockRejectedValue({ code: 'P2002' });

        const res = await call('POST', '/projects/40/quotations', {
            as: PROVIDER,
            form: pdf(),
        });

        expect(res.status).toBe(409);
        expect(bucket.remove).toHaveBeenCalledTimes(1);
    });
});

describe('GET /projects/:id/quotations', () => {
    it('lists them for a party', async () => {
        projectParty('AWAITING_QUOTATION');
        db.quotation.findMany.mockResolvedValue([quotationRow]);

        const res = await call('GET', '/projects/40/quotations', {
            as: RECEIVER,
        });

        expect(res.body).toHaveLength(1);
        expect(res.body[0].quotationId).toBe(60);
    });
});

describe('POST /quotations/:id/accept', () => {
    it('the Receiver accepts; the project moves to AWAITING_DEPOSIT', async () => {
        quotationParty('AWAITING_QUOTATION');
        db.quotation.update.mockResolvedValue({
            ...quotationRow,
            quotationStatus: 'ACCEPTED',
        });
        db.project.updateMany.mockResolvedValue({ count: 1 });

        const res = await call('POST', '/quotations/60/accept', {
            as: RECEIVER,
        });

        expect(res.body.quotationStatus).toBe('ACCEPTED');
        expect(db.project.updateMany.mock.calls[0]![0].data).toEqual({
            projectStatus: 'AWAITING_DEPOSIT',
        });
    });

    it('the Provider cannot; a decided one is a 409', async () => {
        quotationParty('AWAITING_QUOTATION');
        const provider = await call('POST', '/quotations/60/accept', {
            as: PROVIDER,
        });
        quotationParty('AWAITING_QUOTATION');
        db.quotation.update.mockRejectedValueOnce({ code: 'P2025' });
        const decided = await call('POST', '/quotations/60/accept', {
            as: RECEIVER,
        });

        expect(provider.status).toBe(403);
        expect(decided.body.error.message).toBe('Quotation is not PENDING');
    });
});

describe('POST /quotations/:id/reject', () => {
    it('the Receiver rejects; the project stays', async () => {
        quotationParty('AWAITING_QUOTATION');
        db.quotation.update.mockResolvedValue({
            ...quotationRow,
            quotationStatus: 'REJECTED',
        });

        const res = await call('POST', '/quotations/60/reject', {
            as: RECEIVER,
        });

        expect(res.body.quotationStatus).toBe('REJECTED');
        expect(db.project.updateMany).not.toHaveBeenCalled();
    });

    it('the Provider cannot; a project moved on is a 409', async () => {
        quotationParty('AWAITING_QUOTATION');
        const provider = await call('POST', '/quotations/60/reject', {
            as: PROVIDER,
        });
        quotationParty('CANCELLED');
        const moved = await call('POST', '/quotations/60/reject', {
            as: RECEIVER,
        });

        expect(provider.status).toBe(403);
        expect(moved.status).toBe(409);
    });
});

describe('DELETE /quotations/:id', () => {
    it('removes the PDF when no row uses it any more', async () => {
        quotationParty('AWAITING_QUOTATION');
        db.quotation.delete.mockResolvedValue({ quotationFile: STORED });
        db.quotation.count.mockResolvedValue(0);

        const res = await call('DELETE', '/quotations/60', { as: PROVIDER });

        expect(res.status).toBe(204);
        expect(bucket.remove).toHaveBeenCalledWith(['quotations/q.pdf']);
    });

    it('keeps a PDF another row still uses', async () => {
        quotationParty('AWAITING_QUOTATION');
        db.quotation.delete.mockResolvedValue({ quotationFile: STORED });
        db.quotation.count.mockResolvedValue(2);

        await call('DELETE', '/quotations/60', { as: PROVIDER });

        expect(bucket.remove).not.toHaveBeenCalled();
    });

    it('the Receiver cannot; a cancelled project is a 409', async () => {
        quotationParty('AWAITING_QUOTATION');
        const receiver = await call('DELETE', '/quotations/60', {
            as: RECEIVER,
        });
        quotationParty('CANCELLED');
        const cancelled = await call('DELETE', '/quotations/60', {
            as: PROVIDER,
        });

        expect(receiver.status).toBe(403);
        expect(cancelled.status).toBe(409);
    });
});
