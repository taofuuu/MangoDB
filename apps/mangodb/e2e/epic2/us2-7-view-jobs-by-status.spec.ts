/*
 * US2-7 View jobs by status. These black-box tests use the public jobs API:
 * OPEN jobs are discoverable by every company; a CLOSED job is private to its
 * owner and is indistinguishable from a missing job to other companies.
 */
import { expect, test, type Page } from '@playwright/test';
import { LISTING_STATUSES, type Job, type Paginated } from '@mangodb/shared';
import { closeJob, closeMyRunJobs, createJob, loginAs, tag } from './helpers';

const [OPEN_STATUS, CLOSED_STATUS] = LISTING_STATUSES;

let openJobId: number;
let closedJobId: number;
let openJobTitle: string;
let closedJobTitle: string;

async function listJobs(page: Page, status: (typeof LISTING_STATUSES)[number]) {
    const response = await page.request.get(
        `/api/jobs?status=${status}&pageSize=50`,
    );
    expect(response.status()).toBe(200);
    return (await response.json()) as Paginated<Job>;
}

test.describe('US2-7 View jobs by status', () => {
    test.beforeAll(async ({ browser }) => {
        const page = await browser.newPage();
        await loginAs(page, 'RECEIVER');
        openJobTitle = tag('Visible job');
        closedJobTitle = tag('Private job');
        openJobId = await createJob(page, openJobTitle);
        closedJobId = await createJob(page, closedJobTitle);
        await closeJob(page, closedJobId);
        await page.close();
    });

    test.afterAll(async ({ browser }) => {
        const page = await browser.newPage();
        await loginAs(page, 'RECEIVER');
        await closeMyRunJobs(page);
        await page.close();
    });

    test('TC-2-33: an unauthenticated caller cannot list jobs', async ({
        browser,
    }) => {
        const page = await browser.newPage();
        const response = await page.request.get('/api/jobs');
        expect(response.status()).toBe(401);
        await page.close();
    });

    test('TC-2-34: a Provider sees another company’s OPEN job', async ({
        browser,
    }) => {
        const page = await browser.newPage();
        await loginAs(page, 'PROVIDER');
        const jobs = await listJobs(page, OPEN_STATUS);
        expect(jobs.items.map((job) => job.jobId)).toContain(openJobId);
        await page.close();
    });

    test('TC-2-35: a Provider cannot list another company’s CLOSED job', async ({
        browser,
    }) => {
        const page = await browser.newPage();
        await loginAs(page, 'PROVIDER');
        const jobs = await listJobs(page, CLOSED_STATUS);
        expect(jobs.items.map((job) => job.jobId)).not.toContain(closedJobId);
        await page.close();
    });

    test('TC-2-36: a Provider can read an OPEN job detail', async ({
        browser,
    }) => {
        const page = await browser.newPage();
        await loginAs(page, 'PROVIDER');
        const response = await page.request.get(`/api/jobs/${openJobId}`);
        expect(response.status()).toBe(200);
        expect((await response.json()) as Job).toMatchObject({
            jobId: openJobId,
            listingStatus: OPEN_STATUS,
            listingTitle: openJobTitle,
        });
        await page.close();
    });

    test('TC-2-37: a Provider gets not found for another company’s CLOSED job', async ({
        browser,
    }) => {
        const page = await browser.newPage();
        await loginAs(page, 'PROVIDER');
        const response = await page.request.get(`/api/jobs/${closedJobId}`);
        expect(response.status()).toBe(404);
        await page.close();
    });

    test('TC-2-38: the owner can list its own CLOSED job', async ({ page }) => {
        await loginAs(page, 'RECEIVER');
        const jobs = await listJobs(page, CLOSED_STATUS);
        expect(jobs.items.map((job) => job.jobId)).toContain(closedJobId);
    });
});
