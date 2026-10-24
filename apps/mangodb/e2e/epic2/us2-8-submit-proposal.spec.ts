/*
 * US2-8 Submit a proposal to an open job posting — black-box test cases
 * TC-2-18 … TC-2-26 from docs/test-plan/test-plan.md §2.3. The Receiver
 * account posts one OPEN and one CLOSED [e2e] job first; the Provider account
 * then fills the real "Submit a proposal" form on the job search page. Serial,
 * because TC-2-20 (a second pending proposal) needs the one TC-2-18 sends.
 * Both jobs are closed afterwards.
 */
import { expect, test, type Page } from '@playwright/test';
import {
    closeJob,
    closeMyRunJobs,
    createJob,
    daysFromToday,
    loginAs,
    tag,
} from './helpers';

test.describe.configure({ mode: 'serial' });

const OPEN_JOB = tag('Proposal Target');
const CLOSED_JOB = tag('Closed Job');
let closedJobId: number;

const VALID = {
    terms: tag('We can deliver in phases.'),
    budget: '45000',
    duration: '2.5',
};

async function openJob(page: Page, title: string) {
    await page.goto('/jobs');
    const search = page.getByLabel('Search jobs by keyword');
    await search.fill(title);
    await search.press('Enter');
    // The run's own title is unique, so the search returns this one card.
    await expect(page.getByText(title).first()).toBeVisible();
    await page.getByRole('button', { name: 'View Detail' }).first().click();
}

async function submitProposal(page: Page, inputs: Partial<typeof VALID> = {}) {
    const values = { ...VALID, ...inputs };
    await openJob(page, OPEN_JOB);
    await page.getByRole('button', { name: 'Add Proposal' }).click();
    await page.locator('#proposal-terms').fill(values.terms);
    await page.locator('#proposal-budget').fill(values.budget);
    await page
        .locator('#proposal-estimated-duration-months')
        .fill(values.duration);
    await page.getByRole('button', { name: 'Submit', exact: true }).click();
}

test.describe('US2-8 Submit a proposal to an open job posting', () => {
    test.beforeAll(async ({ browser }) => {
        const page = await browser.newPage();
        await loginAs(page, 'RECEIVER');
        const job = {
            listingDesc: 'A job for the proposal tests.',
            minBudget: 20000,
            maxBudget: 80000,
            deadline: daysFromToday(60),
        };
        await createJob(page, { ...job, listingTitle: OPEN_JOB });
        closedJobId = await createJob(page, {
            ...job,
            listingTitle: CLOSED_JOB,
        });
        await closeJob(page, closedJobId);
        await page.close();
    });

    test.afterAll(async ({ browser }) => {
        const page = await browser.newPage();
        await loginAs(page, 'RECEIVER');
        await closeMyRunJobs(page);
        await page.close();
    });

    test.beforeEach(async ({ page }) => {
        await loginAs(page, 'PROVIDER');
    });

    test('TC-2-18: all valid inputs send a PENDING proposal', async ({
        page,
    }) => {
        await submitProposal(page);
        await expect(page.getByText('Proposal submitted')).toBeVisible();

        const res = await page.request.get('/api/proposals/mine?pageSize=50');
        const { items } = (await res.json()) as {
            items: { proposalTerms: string; proposalStatus: string }[];
        };
        const sent = items.find((p) => p.proposalTerms === VALID.terms);
        expect(sent?.proposalStatus).toBe('PENDING');
    });

    test('TC-2-19: a CLOSED job takes no proposal', async ({ page }) => {
        // The job search lists open jobs only, so the closed one has no
        // "Add Proposal" button to press.
        await page.goto('/jobs');
        const search = page.getByLabel('Search jobs by keyword');
        await search.fill(CLOSED_JOB);
        await search.press('Enter');
        await expect(
            page.getByRole('button', { name: 'Add Proposal' }),
        ).toHaveCount(0);

        // And sending one anyway is refused by the system.
        const res = await page.request.post(
            `/api/jobs/${closedJobId}/proposals`,
            {
                data: {
                    proposalTerms: VALID.terms,
                    proposalBudget: 45000,
                    duration: 2.5,
                },
            },
        );
        expect(res.status()).toBe(409);
        expect(JSON.stringify(await res.json())).toContain(
            'This job is not open for proposals',
        );
    });

    test('TC-2-20: a second pending proposal on the same job', async ({
        page,
    }) => {
        await submitProposal(page);
        await expect(
            page.getByText('You already have a pending proposal on this job'),
        ).toBeVisible();
    });

    test('TC-2-21: empty terms', async ({ page }) => {
        await submitProposal(page, { terms: '' });
        await expect(
            page.getByText('Proposal terms are required'),
        ).toBeVisible();
    });

    test('TC-2-22: empty budget', async ({ page }) => {
        await submitProposal(page, { budget: '' });
        await expect(
            page.getByText('Proposal budget is required'),
        ).toBeVisible();
    });

    test('TC-2-23: budget of zero', async ({ page }) => {
        await submitProposal(page, { budget: '0' });
        await expect(
            page.getByText('Proposal budget must be greater than zero'),
        ).toBeVisible();
    });

    test('TC-2-24: duration of zero', async ({ page }) => {
        await submitProposal(page, { duration: '0' });
        await expect(
            page.getByText('Duration must be greater than zero'),
        ).toBeVisible();
    });

    test('TC-2-25: duration over 120 months', async ({ page }) => {
        await submitProposal(page, { duration: '121' });
        await expect(
            page.getByText('Duration cannot exceed 120 months'),
        ).toBeVisible();
    });

    test('TC-2-26: duration not in half-month steps', async ({ page }) => {
        await submitProposal(page, { duration: '1.3' });
        await expect(
            page.getByText(
                'Duration must be in half-month increments (e.g. 0.5, 1, 1.5)',
            ),
        ).toBeVisible();
    });
});
