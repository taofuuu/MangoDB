/*
 * US2-6 Create and publish a job posting — black-box test cases TC-2-11 …
 * TC-2-17 from docs/test-plan/test-plan.md §2.3. Each test types one test
 * case's inputs into the real "Create Your Job Posting" page and checks the
 * expected output. The job made by the valid case is closed afterwards (jobs
 * cannot be deleted, ADR 0013).
 */
import { expect, test, type Page } from '@playwright/test';
import {
    closeMyRunJobs,
    daysFromToday,
    fillJobForm,
    loginAs,
    tag,
    type JobInputs,
} from './helpers';

const VALID = {
    title: tag('Need a Mobile App'),
    description: 'iOS and Android app.',
    min: '20000',
    max: '80000',
    deadline: daysFromToday(60),
};

async function submitNewJob(page: Page, inputs: JobInputs) {
    await page.goto('/jobs/create');
    await expect(
        page.getByRole('heading', { name: 'Create Your Job Posting' }),
    ).toBeVisible();
    await fillJobForm(page, { ...VALID, ...inputs });
    await page.getByRole('button', { name: 'Post', exact: true }).click();
}

test.describe('US2-6 Create and publish a job posting', () => {
    test.beforeEach(async ({ page }) => {
        await loginAs(page, 'RECEIVER');
    });

    test.afterAll(async ({ browser }) => {
        const page = await browser.newPage();
        await loginAs(page, 'RECEIVER');
        await closeMyRunJobs(page);
        await page.close();
    });

    test('TC-2-11: all valid inputs publish the job as OPEN', async ({
        page,
    }) => {
        await submitNewJob(page, {});
        await expect(page).toHaveURL(/\/jobs\/mine\?success=posted/);
        await expect(page.getByText('Job created successfully!')).toBeVisible();

        const res = await page.request.get('/api/jobs/mine?pageSize=50');
        const { items } = (await res.json()) as {
            items: { listingTitle: string; listingStatus: string }[];
        };
        const job = items.find((j) => j.listingTitle === VALID.title);
        expect(job?.listingStatus).toBe('OPEN');
    });

    test('TC-2-12: a Provider account cannot create a job', async ({
        browser,
    }) => {
        const page = await browser.newPage();
        await loginAs(page, 'PROVIDER');
        await page.goto('/jobs/create');
        await expect(
            page.getByText(
                'You need a Receiver account to create job postings.',
            ),
        ).toBeVisible();
        await expect(
            page.getByRole('button', { name: 'Post', exact: true }),
        ).toHaveCount(0);
        await page.close();
    });

    test('TC-2-13: empty title', async ({ page }) => {
        await submitNewJob(page, { title: '' });
        await expect(page.getByText('Title is required')).toBeVisible();
    });

    test('TC-2-14: empty description', async ({ page }) => {
        await submitNewJob(page, { description: '' });
        await expect(page.getByText('Description is required')).toBeVisible();
    });

    test('TC-2-15: empty maximum budget', async ({ page }) => {
        await submitNewJob(page, { max: '' });
        await expect(
            page.getByText('Maximum budget is required'),
        ).toBeVisible();
    });

    test('TC-2-16: minimum budget above maximum', async ({ page }) => {
        await submitNewJob(page, { min: '90000', max: '80000' });
        await expect(
            page.getByText('Minimum budget cannot exceed maximum budget'),
        ).toBeVisible();
    });

    test('TC-2-17: deadline in the past', async ({ page }) => {
        await submitNewJob(page, { deadline: daysFromToday(-30) });
        await expect(
            page.getByText('Deadline cannot be in the past'),
        ).toBeVisible();
    });
});
