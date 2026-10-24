/*
 * US2-1 Create a service listing — black-box test cases TC-2-01 … TC-2-10
 * from docs/test-plan/test-plan.md §2.3. Each test is one test case: it types
 * the case's inputs into the real "Add My Service" page and checks the
 * expected output. Runs against the real API and database; the service made by
 * the valid case is deleted afterwards.
 */
import { expect, test, type Page } from '@playwright/test';
import { deleteMyRunServices, loginAs, tag } from './helpers';

type ServiceInputs = {
    title?: string;
    description?: string;
    category?: boolean;
    techStack?: string;
    min?: string;
    max?: string;
};

// The valid values from the test plan. A test case overrides one of them.
const VALID = {
    title: tag('Web App Service'),
    description: 'We build web apps.',
    category: true,
    techStack: 'React',
    min: '10000',
    max: '50000',
};

async function fillServiceForm(page: Page, inputs: ServiceInputs) {
    const values = { ...VALID, ...inputs };
    await page.goto('/services/create');
    await expect(
        page.getByRole('heading', { name: 'Add My Service' }),
    ).toBeVisible();

    await page
        .getByPlaceholder('Ex. Web Development with React')
        .fill(values.title);
    await page
        .getByPlaceholder('Ex. Full-stack development services...')
        .fill(values.description);
    if (values.category) {
        // The first category chip under "Service Category*".
        await page
            .locator('label', { hasText: 'Service Category*' })
            .locator(
                'xpath=following-sibling::div[contains(@class,"flex-wrap")]//button',
            )
            .first()
            .click();
    }
    if (values.techStack) {
        const techInput = page.getByPlaceholder(
            'Type technology and press Enter...',
        );
        await techInput.fill(values.techStack);
        await techInput.press('Enter');
    }
    const budgets = page.locator('input[type="number"]');
    await budgets.nth(0).fill(values.min);
    await budgets.nth(1).fill(values.max);
    await page.getByRole('button', { name: 'Add Service' }).click();
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
        await expect(
            page.getByText('Service added successfully'),
        ).toBeVisible();

        await page.goto('/services/mine');
        await expect(page.getByText(VALID.title)).toBeVisible();
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
        await fillServiceForm(page, { category: false });
        await expect(
            page.getByText('Select at least one category.'),
        ).toBeVisible();
    });

    test('TC-2-06: negative minimum budget', async ({ page }) => {
        await fillServiceForm(page, { min: '-1' });
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
        await fillServiceForm(page, { min: '100.5' });
        await expect(
            page.getByText('Minimum budget must be an integer'),
        ).toBeVisible();
    });

    test('TC-2-10: no tech stack', async ({ page }) => {
        await fillServiceForm(page, { techStack: '' });
        await expect(
            page.getByText('At least one tech stack item is required.'),
        ).toBeVisible();
    });
});
