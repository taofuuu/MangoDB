/*
 * US2-13 Edit a job posting — black-box test cases TC-2-27 … TC-2-32 from
 * docs/test-plan/test-plan.md §2.3. The Receiver account owns one OPEN and one
 * CLOSED [e2e] job, and the BOTH account owns a third (another company's job).
 * Each test opens the real "Edit Your Job Posting" page. All three jobs are
 * closed afterwards.
 */
import { expect, test, type Page } from '@playwright/test';
import {
    closeJob,
    closeMyRunJobs,
    createJob,
    daysFromToday,
    fillJobForm,
    loginAs,
    tag,
    type JobInputs,
} from './helpers';

const JOB = {
    listingDesc: 'A job for the edit tests.',
    minBudget: 20000,
    maxBudget: 80000,
    deadline: daysFromToday(60),
};

let openJobId: number;
let closedJobId: number;
let otherCompanyJobId: number;

async function editOpenJob(page: Page, inputs: JobInputs) {
    await page.goto(`/jobs/${openJobId}/edit`);
    await expect(
        page.getByRole('heading', { name: 'Edit Your Job Posting' }),
    ).toBeVisible();
    await fillJobForm(page, inputs);
    await page.getByRole('button', { name: 'Save Changes' }).click();
}

test.describe('US2-13 Edit a job posting', () => {
    test.beforeAll(async ({ browser }) => {
        const receiver = await browser.newPage();
        await loginAs(receiver, 'RECEIVER');
        openJobId = await createJob(receiver, {
            ...JOB,
            listingTitle: tag('Edit Me'),
        });
        closedJobId = await createJob(receiver, {
            ...JOB,
            listingTitle: tag('Closed Edit'),
        });
        await closeJob(receiver, closedJobId);
        await receiver.close();

        const other = await browser.newPage();
        await loginAs(other, 'BOTH');
        otherCompanyJobId = await createJob(other, {
            ...JOB,
            listingTitle: tag('Not Yours'),
        });
        await other.close();
    });

    test.afterAll(async ({ browser }) => {
        for (const role of ['RECEIVER', 'BOTH'] as const) {
            const page = await browser.newPage();
            await loginAs(page, role);
            await closeMyRunJobs(page);
            await page.close();
        }
    });

    test.beforeEach(async ({ page }) => {
        await loginAs(page, 'RECEIVER');
    });

    test('TC-2-27: valid changes to my OPEN job are saved', async ({
        page,
    }) => {
        const newTitle = tag('Need a Mobile App v2');
        await editOpenJob(page, {
            title: newTitle,
            min: '30000',
            max: '90000',
            deadline: daysFromToday(70),
        });
        await expect(page).toHaveURL(/\/jobs\/mine\?success=updated/);
        await expect(page.getByText('Job updated successfully!')).toBeVisible();

        const res = await page.request.get(`/api/jobs/${openJobId}`);
        const job = (await res.json()) as {
            listingTitle: string;
            minBudget: number;
            maxBudget: number;
        };
        expect(job).toMatchObject({
            listingTitle: newTitle,
            minBudget: 30000,
            maxBudget: 90000,
        });
    });

    test('TC-2-28: my CLOSED job cannot be edited', async ({ page }) => {
        await page.goto(`/jobs/${closedJobId}/edit`);
        await expect(
            page.getByText('Only open job postings can be edited.'),
        ).toBeVisible();
        await expect(
            page.getByRole('button', { name: 'Save Changes' }),
        ).toHaveCount(0);
    });

    test("TC-2-29: another company's job cannot be edited", async ({
        page,
    }) => {
        await page.goto(`/jobs/${otherCompanyJobId}/edit`);
        await expect(
            page.getByText('You are not authorized to edit this job posting.'),
        ).toBeVisible();
        await expect(
            page.getByRole('button', { name: 'Save Changes' }),
        ).toHaveCount(0);
    });

    test('TC-2-30: empty title', async ({ page }) => {
        await editOpenJob(page, { title: '' });
        await expect(page.getByText('Title is required')).toBeVisible();
    });

    test('TC-2-31: minimum budget above maximum', async ({ page }) => {
        await editOpenJob(page, { min: '95000', max: '90000' });
        await expect(
            page.getByText('Minimum budget cannot exceed maximum budget'),
        ).toBeVisible();
    });

    test('TC-2-32: deadline in the past', async ({ page }) => {
        await editOpenJob(page, { deadline: daysFromToday(-30) });
        await expect(
            page.getByText('Deadline cannot be in the past'),
        ).toBeVisible();
    });
});
