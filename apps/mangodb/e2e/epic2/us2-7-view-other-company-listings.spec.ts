/*
 * US2-7 View another company's listings — black-box test cases TC-2-35 …
 * TC-2-48 from the EPIC 2 test plan (Google Doc, "final" tab). The Receiver
 * posts one tagged OPEN and one tagged CLOSED job, and the Provider posts one
 * tagged OPEN service, during setup. Temporary BOTH accounts cover the empty
 * profile and the deleted owner. Each test checks the page a user sees, plus
 * the API answer where the page alone cannot prove a listing is hidden.
 */
import { expect, test, type Page } from '@playwright/test';
import type {
    CompanyProfile,
    Job,
    Paginated,
    PublicCompanyProfile,
    RegisterAccountType,
    Service,
    ServiceSummary,
    SessionResponse,
} from '@mangodb/shared';
import {
    closeJob,
    closeMyRunJobs,
    createJob,
    deleteMyRunServices,
    loginAs,
    tag,
} from './helpers';

const PASSWORD = 'Passw0rd!';
const NOT_FOUND =
    'This company could not be found. It may have deleted its account.';

let receiver: CompanyProfile;
let provider: CompanyProfile;
let openJob: Job;
let closedJob: Job;
let openService: Service;

async function myProfile(page: Page): Promise<CompanyProfile> {
    const response = await page.request.get('/api/companies/me');
    expect(response.status()).toBe(200);
    return (await response.json()) as CompanyProfile;
}

async function postJob(page: Page, listingTitle: string): Promise<Job> {
    const response = await page.request.post('/api/jobs', {
        data: {
            listingTitle,
            listingDesc: 'A job created for US2-7 public-listing testing.',
            minBudget: 20000,
            maxBudget: 80000,
        },
    });
    expect(response.status(), `create ${listingTitle}`).toBe(201);
    return (await response.json()) as Job;
}

async function createService(
    page: Page,
    listingTitle: string,
): Promise<Service> {
    const response = await page.request.post('/api/services', {
        data: {
            listingTitle,
            listingDesc: 'A service created for US2-7 public-listing testing.',
            maxBudget: 80000,
            techStack: ['Playwright'],
        },
    });
    expect(response.status(), 'create service').toBe(201);
    return (await response.json()) as Service;
}

async function listServices(
    page: Page,
    companyId: number,
): Promise<Paginated<ServiceSummary>> {
    const response = await page.request.get(
        `/api/services?companyId=${companyId}&pageSize=50`,
    );
    expect(response.status()).toBe(200);
    return (await response.json()) as Paginated<ServiceSummary>;
}

async function registerTemporaryCompany(
    page: Page,
    accountType: RegisterAccountType,
    label: string,
): Promise<CompanyProfile> {
    const suffix = tag(label)
        .replace(/[^a-z0-9]/gi, '')
        .toLowerCase();
    const response = await page.request.post('/api/auth/register', {
        data: {
            companyName: tag(label),
            username: `us27_${suffix}`.slice(0, 50),
            email: `us27_${suffix}@example.test`.slice(0, 100),
            password: PASSWORD,
            phone: '0812345678',
            accountType,
            companyType: ['Software House'],
            tosAccepted: true,
        },
    });
    expect(response.status(), `register ${label}`).toBe(201);
    return ((await response.json()) as SessionResponse).company;
}

// Opens Search Jobs and waits for the list to load.
async function openSearchJobs(page: Page) {
    await page.goto('/jobs');
    await expect(page.getByRole('heading', { name: 'All Jobs' })).toBeVisible();
}

test.describe("US2-7 View another company's listings", () => {
    test.beforeAll(async ({ browser }) => {
        const receiverPage = await browser.newPage();
        await loginAs(receiverPage, 'RECEIVER');
        receiver = await myProfile(receiverPage);
        openJob = await postJob(receiverPage, tag('Public job'));
        closedJob = await postJob(receiverPage, tag('Private job'));
        await closeJob(receiverPage, closedJob.jobId);
        await receiverPage.close();

        const providerPage = await browser.newPage();
        await loginAs(providerPage, 'PROVIDER');
        provider = await myProfile(providerPage);
        openService = await createService(providerPage, tag('Public service'));
        await providerPage.close();
    });

    test.afterAll(async ({ browser }) => {
        const receiverPage = await browser.newPage();
        await loginAs(receiverPage, 'RECEIVER');
        await closeMyRunJobs(receiverPage);
        await receiverPage.close();

        const providerPage = await browser.newPage();
        await loginAs(providerPage, 'PROVIDER');
        await deleteMyRunServices(providerPage);
        await providerPage.close();
    });

    test('TC-2-35: Search Jobs while logged out goes to the login-required page', async ({
        page,
    }) => {
        await page.goto('/jobs');
        await expect(page).toHaveURL(/\/unauthorized/);
        await expect(
            page.getByText('You need to be logged in to access this page.'),
        ).toBeVisible();
    });

    test('TC-2-36: a Provider sees the tagged OPEN job card', async ({
        page,
    }) => {
        await loginAs(page, 'PROVIDER');
        await openSearchJobs(page);
        await expect(page.getByText(openJob.listingTitle)).toBeVisible();
    });

    test('TC-2-37: a Provider does not see the tagged CLOSED job card', async ({
        page,
    }) => {
        await loginAs(page, 'PROVIDER');
        await openSearchJobs(page);
        await expect(page.getByText(openJob.listingTitle)).toBeVisible();
        await expect(page.getByText(closedJob.listingTitle)).toHaveCount(0);
    });

    test('TC-2-38: View Detail shows the OPEN job and its Receiver owner', async ({
        page,
    }) => {
        await loginAs(page, 'PROVIDER');
        await openSearchJobs(page);
        const card = page
            .getByRole('heading', { name: openJob.listingTitle })
            .locator('xpath=ancestor::div[contains(@class, "relative")][1]');
        await card.getByRole('button', { name: 'View Detail' }).click();
        await expect(page.getByText(openJob.listingTitle).last()).toBeVisible();
        await expect(page.getByText(receiver.companyName).last()).toBeVisible();
    });

    test('TC-2-39: the tagged CLOSED job cannot be opened by its URL', async ({
        page,
    }) => {
        await loginAs(page, 'PROVIDER');
        const response = await page.request.get(`/api/jobs/${closedJob.jobId}`);
        expect(response.status()).toBe(404);

        await page.goto(`/jobs/${closedJob.jobId}`);
        await expect(page.getByText(closedJob.listingTitle)).toHaveCount(0);

        await openSearchJobs(page);
        await expect(page.getByText(closedJob.listingTitle)).toHaveCount(0);
    });

    test('TC-2-40: the Receiver sees its own CLOSED job under the CLOSED filter', async ({
        page,
    }) => {
        await loginAs(page, 'RECEIVER');
        await page.goto('/jobs/mine');
        await page
            .getByRole('group', { name: 'Filter jobs by status' })
            .getByRole('button', { name: 'CLOSED', exact: true })
            .click();
        await expect(page.getByText(closedJob.listingTitle)).toBeVisible();
    });

    test('TC-2-41: the Provider public profile shows company info, no private fields', async ({
        page,
    }) => {
        await loginAs(page, 'RECEIVER');
        const response = await page.request.get(
            `/api/companies/${provider.companyId}`,
        );
        expect(response.status()).toBe(200);
        const profile = (await response.json()) as PublicCompanyProfile;
        expect(profile).toMatchObject({
            companyId: provider.companyId,
            companyName: provider.companyName,
        });
        expect(profile).not.toHaveProperty('email');
        expect(profile).not.toHaveProperty('username');

        await page.goto(`/companies/${provider.companyId}`);
        await expect(
            page.getByRole('heading', { name: provider.companyName, level: 2 }),
        ).toBeVisible();
        await expect(page.getByText('Account Settings')).toHaveCount(0);
    });

    test('TC-2-42: an unknown company profile shows not found', async ({
        page,
    }) => {
        await loginAs(page, 'PROVIDER');
        await page.goto('/companies/2147483647');
        await expect(page.getByText(NOT_FOUND)).toBeVisible();
    });

    test('TC-2-43: the Services tab shows the OPEN service with no edit controls', async ({
        page,
    }) => {
        await loginAs(page, 'RECEIVER');
        await page.goto(`/companies/${provider.companyId}`);
        await page
            .getByRole('button', { name: 'Services', exact: true })
            .click();
        await expect(page.getByText(openService.listingTitle)).toBeVisible();
        await expect(page.getByRole('link', { name: 'Edit' })).toHaveCount(0);
        await expect(page.getByRole('button', { name: 'Edit' })).toHaveCount(0);
    });

    test('TC-2-44: the service detail shows its Provider and no edit control', async ({
        page,
    }) => {
        await loginAs(page, 'RECEIVER');
        await page.goto(`/companies/${provider.companyId}`);
        await page
            .getByRole('button', {
                name: `Details for ${openService.listingTitle}`,
            })
            .click();
        await expect(
            page.getByRole('link', { name: provider.companyName }).last(),
        ).toBeVisible();
        await expect(page.getByRole('link', { name: 'Edit' })).toHaveCount(0);
    });

    test('TC-2-45: the Job Listing shows only the OPEN job, read-only', async ({
        page,
    }) => {
        await loginAs(page, 'PROVIDER');
        await page.goto(`/companies/${receiver.companyId}`);
        await expect(page.getByText('Job Listing').first()).toBeVisible();
        await expect(page.getByText(openJob.listingTitle)).toBeVisible();
        await expect(page.getByText(closedJob.listingTitle)).toHaveCount(0);

        await page
            .getByRole('button', {
                name: `Details for ${openJob.listingTitle}`,
            })
            .click();
        await expect(
            page.getByRole('link', { name: receiver.companyName }).last(),
        ).toBeVisible();
        await expect(page.getByRole('link', { name: 'Edit' })).toHaveCount(0);
    });

    test('TC-2-46: a profile with no OPEN listings shows the empty states', async ({
        browser,
    }) => {
        const ownerPage = await browser.newPage();
        const emptyCompany = await registerTemporaryCompany(
            ownerPage,
            'BOTH',
            'Empty company',
        );

        const viewerPage = await browser.newPage();
        await loginAs(viewerPage, 'PROVIDER');
        await viewerPage.goto(`/companies/${emptyCompany.companyId}`);
        // The listings load after the profile card, slowly on the shared DB.
        await expect(viewerPage.getByText('No open listings.')).toBeVisible({
            timeout: 20_000,
        });
        await viewerPage.getByRole('button', { name: 'Job Listing' }).click();
        await expect(viewerPage.getByText('No open job listings.')).toBeVisible(
            { timeout: 20_000 },
        );

        const deletion = await ownerPage.request.delete('/api/companies/me', {
            data: { currentPassword: PASSWORD },
        });
        expect(deletion.status()).toBe(204);
        await viewerPage.close();
        await ownerPage.close();
    });

    test('TC-2-47: a deleted owner and its listings are hidden', async ({
        browser,
    }) => {
        const ownerPage = await browser.newPage();
        const deletedCompany = await registerTemporaryCompany(
            ownerPage,
            'BOTH',
            'Deleted company',
        );
        const deletedService = await createService(
            ownerPage,
            tag('Deleted owner service'),
        );
        const deletedJob = await createJob(ownerPage, {
            listingTitle: tag('Deleted owner job'),
            listingDesc: 'A job whose owner is deleted during the test.',
            minBudget: 20000,
            maxBudget: 80000,
        });
        const deletion = await ownerPage.request.delete('/api/companies/me', {
            data: { currentPassword: PASSWORD },
        });
        expect(deletion.status()).toBe(204);

        const viewerPage = await browser.newPage();
        await loginAs(viewerPage, 'PROVIDER');
        expect(
            (
                await viewerPage.request.get(
                    `/api/services/${deletedService.serviceId}`,
                )
            ).status(),
        ).toBe(404);
        expect(
            (await viewerPage.request.get(`/api/jobs/${deletedJob}`)).status(),
        ).toBe(404);
        const services = await listServices(
            viewerPage,
            deletedCompany.companyId,
        );
        expect(services.items).toHaveLength(0);

        await viewerPage.goto(`/companies/${deletedCompany.companyId}`);
        await expect(viewerPage.getByText(NOT_FOUND)).toBeVisible();
        await expect(
            viewerPage.getByText(deletedService.listingTitle),
        ).toHaveCount(0);

        await viewerPage.close();
        await ownerPage.close();
    });

    test('TC-2-48: a CLOSED service is not listed and cannot be opened', async ({
        browser,
    }) => {
        // The app has no way to close a service, so this uses a CLOSED
        // service the Provider account already owns in the shared database.
        const ownerPage = await browser.newPage();
        await loginAs(ownerPage, 'PROVIDER');
        const mine = await ownerPage.request.get(
            '/api/services/mine?status=CLOSED',
        );
        expect(mine.status()).toBe(200);
        const closed = ((await mine.json()) as Service[]).find(
            (s) => s.listingStatus === 'CLOSED',
        );
        await ownerPage.close();
        test.skip(!closed, 'The Provider account owns no CLOSED service.');
        if (!closed) return;

        const viewerPage = await browser.newPage();
        await loginAs(viewerPage, 'RECEIVER');
        await viewerPage.goto(`/companies/${provider.companyId}`);
        await viewerPage
            .getByRole('button', { name: 'Services', exact: true })
            .click();
        await expect(
            viewerPage.getByText(openService.listingTitle),
        ).toBeVisible();
        await expect(viewerPage.getByText(closed.listingTitle)).toHaveCount(0);

        const detail = await viewerPage.request.get(
            `/api/services/${closed.serviceId}`,
        );
        expect(detail.status()).toBe(404);
        await viewerPage.close();
    });
});
