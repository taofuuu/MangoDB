/*
 * US2-1 Create a service listing — black-box test cases TC-2-01 … TC-2-18
 * from the EPIC 2 test plan (Google Doc, "final" tab). Each test is one test
 * case: it types the case's inputs into the real "Add My Service" page and
 * checks the expected output. Runs against the real API and database; the
 * services made by the valid cases are deleted afterwards.
 */
import { expect, test, type Page } from '@playwright/test';
import { deleteMyRunServices, loginAs, tag } from './helpers';

type ServiceInputs = {
    title?: string;
    description?: string;
    categories?: number;
    techStack?: string[];
    min?: string;
    max?: string;
};

// The valid values from the test plan. A test case overrides some of them.
const VALID = {
    title: tag('Web App Service'),
    description: 'We build web apps.',
    categories: 1,
    techStack: ['React'],
    min: '10000',
    max: '',
};

type MyService = {
    listingTitle: string;
    listingDesc: string;
    minBudget: number | null;
    maxBudget: number | null;
    categoryIds: number[];
    techStack: string[];
};

async function openForm(page: Page) {
    await page.goto('/services/create');
    await expect(
        page.getByRole('heading', { name: 'Add My Service' }),
    ).toBeVisible();
}

async function addTech(page: Page, name: string) {
    const techInput = page.locator('#tech-stack-input');
    await techInput.fill(name);
    await techInput.press('Enter');
}

async function fillServiceForm(page: Page, inputs: ServiceInputs) {
    const values = { ...VALID, ...inputs };
    await openForm(page);

    await page
        .getByPlaceholder('Ex. Web Development with React')
        .fill(values.title);
    await page
        .getByPlaceholder('Ex. Full-stack development services...')
        .fill(values.description);
    // The category chips under "Service Category*", in catalog order.
    const chips = page
        .locator('label', { hasText: 'Service Category*' })
        .locator(
            'xpath=following-sibling::div[contains(@class,"flex-wrap")]//button',
        );
    for (let i = 0; i < values.categories; i++) {
        await chips.nth(i).click();
    }
    for (const name of values.techStack) {
        await addTech(page, name);
    }
    const budgets = page.locator('input[type="number"]');
    await budgets.nth(0).fill(values.min);
    await budgets.nth(1).fill(values.max);
    await page.getByRole('button', { name: 'Add Service' }).click();
}

// The caller's service with this title, read from GET /services/mine.
async function findMyService(page: Page, title: string) {
    const res = await page.request.get('/api/services/mine');
    const services = (await res.json()) as MyService[];
    return services.find((s) => s.listingTitle === title);
}

// The expected output of the valid cases: the popup, then My Services lists
// the service with the same details that were typed in.
async function expectCreated(
    page: Page,
    title: string,
    budgets: { min: number | null; max: number | null },
) {
    await expect(page.getByText('Service added successfully')).toBeVisible();

    await page.goto('/services/mine');
    await expect(page.getByText(title)).toBeVisible();

    const service = await findMyService(page, title);
    expect(service).toMatchObject({
        listingTitle: title,
        listingDesc: VALID.description,
        minBudget: budgets.min,
        maxBudget: budgets.max,
        techStack: VALID.techStack,
    });
    expect(service?.categoryIds).toHaveLength(1);
}

test.describe('US2-1 Create a service listing', () => {
    test.beforeEach(async ({ page }) => {
        await loginAs(page, 'PROVIDER');
    });

    test.afterAll(async ({ browser }) => {
        const page = await browser.newPage();
        await loginAs(page, 'PROVIDER');
        await deleteMyRunServices(page);
        await page.close();
    });

    test('TC-2-01: all valid inputs create the service', async ({ page }) => {
        await fillServiceForm(page, {});
        await expectCreated(page, VALID.title, { min: 10000, max: null });
    });

    test('TC-2-02: a Receiver account cannot create a service', async ({
        browser,
    }) => {
        const page = await browser.newPage();
        await loginAs(page, 'RECEIVER');
        await page.goto('/services/create');
        await expect(
            page.getByText('to create or manage service listings'),
        ).toBeVisible();
        await expect(
            page.getByRole('button', { name: 'Add Service' }),
        ).toHaveCount(0);
        await page.close();
    });

    test('TC-2-03: empty title', async ({ page }) => {
        await fillServiceForm(page, { title: '' });
        await expect(page.getByText('Title is required')).toBeVisible();
    });

    test('TC-2-04: empty description', async ({ page }) => {
        await fillServiceForm(page, { description: '' });
        await expect(page.getByText('Description is required')).toBeVisible();
    });

    test('TC-2-05: no category', async ({ page }) => {
        await fillServiceForm(page, { categories: 0 });
        await expect(
            page.getByText('Select at least one category.'),
        ).toBeVisible();
    });

    test('TC-2-06: negative minimum budget', async ({ page }) => {
        await fillServiceForm(page, { min: '-1', max: '50000' });
        await expect(
            page.getByText('Minimum budget cannot be negative'),
        ).toBeVisible();
    });

    test('TC-2-07: minimum budget above maximum', async ({ page }) => {
        await fillServiceForm(page, { min: '60000', max: '50000' });
        await expect(
            page.getByText('Minimum budget cannot exceed maximum budget'),
        ).toBeVisible();
    });

    test('TC-2-08: maximum budget of zero', async ({ page }) => {
        await fillServiceForm(page, { min: '', max: '0' });
        await expect(
            page.getByText('Maximum budget must be greater than zero'),
        ).toBeVisible();
    });

    test('TC-2-09: minimum budget that is not a whole number', async ({
        page,
    }) => {
        await fillServiceForm(page, { min: '100.5', max: '50000' });
        await expect(
            page.getByText('Minimum budget must be an integer'),
        ).toBeVisible();
    });

    test('TC-2-10: no tech stack', async ({ page }) => {
        await fillServiceForm(page, { techStack: [] });
        await expect(
            page.getByText('At least one tech stack item is required.'),
        ).toBeVisible();
    });

    test('TC-2-11: title longer than 255 characters', async ({ page }) => {
        await fillServiceForm(page, { title: 'a'.repeat(256) });
        await expect(
            page.getByText('Title cannot exceed 255 characters'),
        ).toBeVisible();
    });

    test('TC-2-12: description longer than 10,000 characters', async ({
        page,
    }) => {
        await fillServiceForm(page, { description: 'a'.repeat(10_001) });
        await expect(
            page.getByText('Description cannot exceed 10000 characters'),
        ).toBeVisible();
    });

    test('TC-2-13: more than 10 categories', async ({ page }) => {
        // The catalog has fewer than 11 categories, so the page cannot offer
        // 11 chips. The same rule is checked at the API the form posts to.
        await openForm(page);
        const chips = page
            .locator('label', { hasText: 'Service Category*' })
            .locator(
                'xpath=following-sibling::div[contains(@class,"flex-wrap")]//button',
            );
        const chipCount = await chips.count();
        test.skip(
            chipCount > 10,
            'The catalog now has 11+ categories: select them in the form.',
        );

        const res = await page.request.post('/api/services', {
            data: {
                listingTitle: VALID.title,
                listingDesc: VALID.description,
                minBudget: 10000,
                categoryIds: Array.from({ length: 11 }, (_, i) => i + 1),
                techStack: VALID.techStack,
            },
        });
        expect(res.status()).toBe(400);
        expect(await res.text()).toContain(
            'Cannot select more than 10 categories',
        );
    });

    test('TC-2-14: a 21st tech stack item', async ({ page }) => {
        await openForm(page);
        for (let i = 1; i <= 20; i++) {
            await addTech(page, `T${i}`);
        }
        await addTech(page, 'T21');
        await expect(
            page.getByText('You can select at most 20 tech stack items.'),
        ).toBeVisible();
        await expect(
            page.getByRole('button', { name: 'Remove T20' }),
        ).toBeVisible();
        await expect(
            page.getByRole('button', { name: 'Remove T21' }),
        ).toHaveCount(0);
    });

    test('TC-2-15: minimum budget only', async ({ page }) => {
        const title = tag('Web App Service min only');
        await fillServiceForm(page, { title, min: '10000', max: '' });
        await expectCreated(page, title, { min: 10000, max: null });
    });

    test('TC-2-16: maximum budget that is not a whole number', async ({
        page,
    }) => {
        await fillServiceForm(page, { min: '100', max: '500.5' });
        await expect(
            page.getByText('Maximum budget must be an integer'),
        ).toBeVisible();
    });

    test('TC-2-17: no budget at all', async ({ page }) => {
        const title = tag('Web App Service no budget');
        await fillServiceForm(page, { title, min: '', max: '' });
        await expectCreated(page, title, { min: null, max: null });
    });

    test('TC-2-18: maximum budget only', async ({ page }) => {
        const title = tag('Web App Service max only');
        await fillServiceForm(page, { title, min: '', max: '50000' });
        await expectCreated(page, title, { min: null, max: 50000 });
    });
});
