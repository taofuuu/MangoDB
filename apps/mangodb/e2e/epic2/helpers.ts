// Shared setup for the EPIC 2 black-box tests (docs/test-plan/test-plan.md
// §2.3). Accounts come from scripts/.env.snapshot, the same gitignored file
// scripts/snapshot-api.sh reads, so no credential is written in this repo.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { expect, type Page } from '@playwright/test';

export type Role = 'PROVIDER' | 'RECEIVER' | 'BOTH';

// Run from apps/mangodb, where playwright.config.ts lives.
const ENV_FILE = path.resolve(process.cwd(), '../../scripts/.env.snapshot');

function readEnvFile(): Record<string, string> {
    const env: Record<string, string> = {};
    for (const line of readFileSync(ENV_FILE, 'utf8').split(/\r?\n/)) {
        const [, key, value] = /^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/.exec(line) ?? [];
        if (key && value !== undefined) {
            env[key] = value.replace(/^['"]|['"]$/g, '');
        }
    }
    return env;
}

const env = readEnvFile();

export function credentials(role: Role): { email: string; password: string } {
    const email = env[`${role}_EMAIL`];
    const password = env[`${role}_PASSWORD`];
    if (!email || !password) {
        throw new Error(
            `${role}_EMAIL / ${role}_PASSWORD missing in ${ENV_FILE}`,
        );
    }
    return { email, password };
}

// Every row a test creates carries this tag, plus the run's own id, so a
// keyword search finds only this run's rows and cleanup cannot touch real
// data.
export const RUN_ID = Date.now().toString(36);
export const tag = (title: string) => `[e2e] ${title} ${RUN_ID}`;

// Signs in through the API. The session cookie lands in the page's browser
// context, so the pages opened afterwards are signed in too.
export async function loginAs(page: Page, role: Role): Promise<void> {
    const res = await page.request.post('/api/auth/login', {
        data: credentials(role),
    });
    expect(res.status(), `login as ${role}`).toBe(200);
}

// A date string N days from today, YYYY-MM-DD, for the deadline fields.
export function daysFromToday(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().slice(0, 10);
}

// The job form, shared by create (US2-6) and edit (US2-13). A field left out
// keeps what the form already holds.
export type JobInputs = {
    title?: string;
    description?: string;
    min?: string;
    max?: string;
    deadline?: string;
};

export async function fillJobForm(page: Page, inputs: JobInputs) {
    const fields: [keyof JobInputs, ReturnType<Page['locator']>][] = [
        ['title', page.getByPlaceholder('Ex: Build a responsive website')],
        [
            'description',
            page.getByPlaceholder(
                'Describe the job requirements and expected work...',
            ),
        ],
        ['min', page.getByPlaceholder('Ex: 20000')],
        ['max', page.getByPlaceholder('Ex: 50000')],
        ['deadline', page.locator('input[type="date"]')],
    ];
    for (const [key, field] of fields) {
        const value = inputs[key];
        if (value !== undefined) await field.fill(value);
    }
}

type JobBody = {
    listingTitle: string;
    listingDesc: string;
    minBudget?: number;
    maxBudget: number;
    deadline?: string;
};

// Setup for the proposal and edit tests: a job made through the API, so each
// test starts from a known row instead of whatever the database holds.
export async function createJob(page: Page, body: JobBody): Promise<number> {
    const res = await page.request.post('/api/jobs', { data: body });
    expect(res.status(), 'create job').toBe(201);
    return ((await res.json()) as { jobId: number }).jobId;
}

export async function closeJob(page: Page, jobId: number): Promise<void> {
    const res = await page.request.post(`/api/jobs/${jobId}/close`);
    expect(res.ok(), `close job ${jobId}`).toBe(true);
}

// Cleanup. Jobs cannot be deleted (ADR 0013), so this run's open jobs are
// closed; services can, so this run's services are deleted.
export async function closeMyRunJobs(page: Page): Promise<void> {
    const res = await page.request.get('/api/jobs/mine?pageSize=50');
    const { items } = (await res.json()) as {
        items: { jobId: number; listingTitle: string; listingStatus: string }[];
    };
    for (const job of items) {
        if (job.listingTitle.endsWith(RUN_ID) && job.listingStatus === 'OPEN') {
            await closeJob(page, job.jobId);
        }
    }
}

export async function deleteMyRunServices(page: Page): Promise<void> {
    const res = await page.request.get('/api/services/mine');
    const services = (await res.json()) as {
        serviceId: number;
        listingTitle: string;
    }[];
    for (const service of services) {
        if (service.listingTitle.endsWith(RUN_ID)) {
            const del = await page.request.delete(
                `/api/services/${service.serviceId}`,
            );
            expect(del.ok(), `delete service ${service.serviceId}`).toBe(true);
        }
    }
}
