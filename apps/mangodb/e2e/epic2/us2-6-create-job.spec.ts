/*
 * US2-6 Create and publish a job posting — black-box test cases TC-2-19 …
 * TC-2-34 from the EPIC 2 test plan (Google Doc, "final" tab). Each test types one test
 * case's inputs into the real "Create Your Job Posting" page and checks the
 * expected output. The jobs made by the valid cases are closed afterwards
 * (jobs cannot be deleted, ADR 0013).
 */
import { expect, test, type Page } from '@playwright/test';
import {
    closeMyRunJobs,
    daysFromToday,
    deleteRunBoth,
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
    duration: '3 months',
};

// Today in the browser's own time zone, YYYY-MM-DD. The form compares the
// deadline with the local date, so the UTC date from daysFromToday(0) would
// read as yesterday in Thailand before 07:00.
function localToday(): string {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

// The caller's OPEN job with this title, read from GET /jobs/mine.
async function findMyJob(page: Page, title: string) {
    const res = await page.request.get('/api/jobs/mine?pageSize=50');
    const { items } = (await res.json()) as {
        items: {
            listingTitle: string;
            listingStatus: string;
            deadline: string | null;
            duration: string | null;
        }[];
    };
    return items.find((j) => j.listingTitle === title);
}

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
        await deleteRunBoth(page);
        await page.close();
    });

    test('TC-2-19: all valid inputs publish the job as OPEN', async ({
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

    test('TC-2-20: a Provider account cannot create a job', async ({
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

    test('TC-2-21: empty title', async ({ page }) => {
        await submitNewJob(page, { title: '' });
        await expect(page.getByText('Title is required')).toBeVisible();
    });

    test('TC-2-22: empty description', async ({ page }) => {
        await submitNewJob(page, { description: '' });
        await expect(page.getByText('Description is required')).toBeVisible();
    });

    test('TC-2-23: empty maximum budget', async ({ page }) => {
        await submitNewJob(page, { max: '' });
        await expect(
            page.getByText('Maximum budget is required'),
        ).toBeVisible();
    });

    test('TC-2-24: minimum budget above maximum', async ({ page }) => {
        await submitNewJob(page, { min: '90000', max: '80000' });
        await expect(
            page.getByText('Minimum budget cannot exceed maximum budget'),
        ).toBeVisible();
    });

    test('TC-2-25: deadline in the past', async ({ page }) => {
        await submitNewJob(page, { deadline: daysFromToday(-30) });
        await expect(
            page.getByText('Deadline cannot be in the past'),
        ).toBeVisible();
    });

    test('TC-2-26: title longer than 255 characters', async ({ page }) => {
        await submitNewJob(page, { title: 'a'.repeat(256) });
        await expect(
            page.getByText('Title cannot exceed 255 characters'),
        ).toBeVisible();
    });

    test('TC-2-27: description longer than 10,000 characters', async ({
        page,
    }) => {
        await submitNewJob(page, { description: 'a'.repeat(10_001) });
        await expect(
            page.getByText('Description cannot exceed 10000 characters'),
        ).toBeVisible();
    });

    test('TC-2-28: maximum budget is zero', async ({ page }) => {
        await submitNewJob(page, { max: '0' });
        await expect(
            page.getByText('Maximum budget must be greater than zero'),
        ).toBeVisible();
    });

    test('TC-2-29: negative minimum budget', async ({ page }) => {
        await submitNewJob(page, { min: '-1' });
        await expect(
            page.getByText('Minimum budget cannot be negative'),
        ).toBeVisible();
    });

    test('TC-2-30: minimum budget is not a whole number', async ({ page }) => {
        await submitNewJob(page, { min: '100.5' });
        await expect(
            page.getByText('Minimum budget must be an integer'),
        ).toBeVisible();
    });

    test('TC-2-31: a deadline of today is accepted', async ({ page }) => {
        const title = tag('Need a Mobile App today');
        const today = localToday();
        await submitNewJob(page, { title, deadline: today });
        await expect(page).toHaveURL(/\/jobs\/mine\?success=posted/);
        await expect(page.getByText('Job created successfully!')).toBeVisible();

        const job = await findMyJob(page, title);
        expect(job?.listingStatus).toBe('OPEN');
        expect(job?.deadline?.slice(0, 10)).toBe(today);
    });

    test('TC-2-32: a Both account can publish a job', async ({ browser }) => {
        const page = await browser.newPage();
        await loginAs(page, 'BOTH');
        await submitNewJob(page, {});
        await expect(page).toHaveURL(/\/jobs\/mine\?success=posted/);
        await expect(page.getByText('Job created successfully!')).toBeVisible();

        const job = await findMyJob(page, VALID.title);
        expect(job?.listingStatus).toBe('OPEN');

        // afterAll only signs in as the Receiver, so the Both account's job
        // is closed here.
        await closeMyRunJobs(page);
        await page.close();
    });

    test('TC-2-33: negative maximum budget', async ({ page }) => {
        await submitNewJob(page, { max: '-1' });
        await expect(
            page.getByText('Maximum budget must be greater than zero'),
        ).toBeVisible();
        await page.screenshot({ path: 'test-results/tc-2-33.png' });
    });

    test('TC-2-34: negative duration', async ({ page }) => {
        await submitNewJob(page, { duration: '-2 months' });
        await expect(
            page.getByText('Duration cannot be negative'),
        ).toBeVisible();
        await page.screenshot({ path: 'test-results/tc-2-34.png' });
    });
});
