/*
 * US2-7: viewing another company's public profile and listings.
 *
 * The companion status suite covers the job-status equivalence classes. This
 * suite covers the rest of the story at its public HTTP and browser seams:
 * profiles, services, read-only profile pages, empty states, owner details,
 * and the hiding of a soft-deleted company's listings.
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

test.describe.serial("US2-7 View another company's listings", () => {
    test.beforeAll(async ({ browser }) => {
        const receiverPage = await browser.newPage();
        await loginAs(receiverPage, 'RECEIVER');
        receiver = await myProfile(receiverPage);
        openJob = (await receiverPage.request
            .post('/api/jobs', {
                data: {
                    listingTitle: tag('Public job'),
                    listingDesc:
                        'A job created for US2-7 public-listing testing.',
                    minBudget: 20000,
                    maxBudget: 80000,
                },
            })
            .then(async (response) => {
                expect(response.status(), 'create public job').toBe(201);
                return response.json();
            })) as Job;
        closedJob = (await receiverPage.request
            .post('/api/jobs', {
                data: {
                    listingTitle: tag('Private job'),
                    listingDesc:
                        'A closed job created for US2-7 public-listing testing.',
                    minBudget: 20000,
                    maxBudget: 80000,
                },
            })
            .then(async (response) => {
                expect(response.status(), 'create private job').toBe(201);
                return response.json();
            })) as Job;
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

    test('TC-2-39: another company profile is public but excludes sign-in fields', async ({
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
    });

    test('TC-2-40: an unknown company is not found in the API and UI', async ({
        page,
    }) => {
        await loginAs(page, 'PROVIDER');
        const response = await page.request.get('/api/companies/2147483647');
        expect(response.status()).toBe(404);

        await page.goto('/companies/2147483647');
        await expect(
            page.getByText(
                'This company could not be found. It may have deleted its account.',
            ),
        ).toBeVisible();
    });

    test('TC-2-41: another company can list and open an OPEN service with its owner', async ({
        page,
    }) => {
        await loginAs(page, 'RECEIVER');
        const services = await listServices(page, provider.companyId);
        expect(services.items.map((service) => service.serviceId)).toContain(
            openService.serviceId,
        );

        const detail = await page.request.get(
            `/api/services/${openService.serviceId}`,
        );
        expect(detail.status()).toBe(200);
        expect((await detail.json()) as Service).toMatchObject({
            serviceId: openService.serviceId,
            listingStatus: 'OPEN',
            company: {
                companyId: provider.companyId,
                companyName: provider.companyName,
            },
        });
    });

    test('TC-2-42: another company profile shows an OPEN service read-only', async ({
        page,
    }) => {
        await loginAs(page, 'RECEIVER');
        await page.goto(`/companies/${provider.companyId}`);
        await expect(page.getByText(openService.listingTitle)).toBeVisible();
        await expect(page.getByRole('link', { name: 'Edit' })).toHaveCount(0);

        await page
            .getByRole('button', {
                name: `Details for ${openService.listingTitle}`,
            })
            .click();
        await expect(
            page.getByRole('link', { name: provider.companyName }).last(),
        ).toBeVisible();
    });

    test('TC-2-43: another company profile shows only OPEN job postings', async ({
        page,
    }) => {
        await loginAs(page, 'PROVIDER');
        await page.goto(`/companies/${receiver.companyId}`);
        await expect(page.getByText(openJob.listingTitle)).toBeVisible();
        await expect(page.getByText(closedJob.listingTitle)).toHaveCount(0);
        await expect(page.getByRole('link', { name: 'Edit' })).toHaveCount(0);

        await page
            .getByRole('button', {
                name: `Details for ${openJob.listingTitle}`,
            })
            .click();
        await expect(
            page.getByRole('link', { name: receiver.companyName }).last(),
        ).toBeVisible();
    });

    test('TC-2-46: the owner job list shows cards and a CLOSED status badge', async ({
        page,
    }) => {
        await loginAs(page, 'RECEIVER');
        await page.goto('/jobs/mine');
        await expect(page.getByText(openJob.listingTitle)).toBeVisible();
        await expect(page.getByText(closedJob.listingTitle)).toBeVisible();
        await expect(page.getByText('Closed').first()).toBeVisible();
    });

    test('TC-2-44: an empty another-company profile uses the open-listings empty states', async ({
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
        await expect(viewerPage.getByText('No open listings.')).toBeVisible();
        await viewerPage.getByRole('button', { name: 'Job Listing' }).click();
        await expect(
            viewerPage.getByText('No open job listings.'),
        ).toBeVisible();

        const deletion = await ownerPage.request.delete('/api/companies/me');
        expect(deletion.status()).toBe(204);
        await viewerPage.close();
        await ownerPage.close();
    });

    test('TC-2-45: a deleted owner and its open listings are hidden everywhere', async ({
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
        const deletion = await ownerPage.request.delete('/api/companies/me');
        expect(deletion.status()).toBe(204);

        const viewerPage = await browser.newPage();
        await loginAs(viewerPage, 'PROVIDER');
        const profile = await viewerPage.request.get(
            `/api/companies/${deletedCompany.companyId}`,
        );
        expect(profile.status()).toBe(404);
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
        const jobs = await viewerPage.request.get(
            `/api/jobs?companyId=${deletedCompany.companyId}&pageSize=50`,
        );
        expect(jobs.status()).toBe(200);
        expect(((await jobs.json()) as Paginated<Job>).items).toHaveLength(0);

        await viewerPage.close();
        await ownerPage.close();
    });
});
