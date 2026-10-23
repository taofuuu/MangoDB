// Creates the rows scripts/snapshot-api.sh needs: a provider, a receiver, an
// admin, and one service listing with a portfolio and a certificate on it.
//
//   npm run db:seed -w api
//
// Safe to run twice — every write is an upsert keyed on something stable, so a
// second run repairs the rows rather than duplicating them.
//
// Why this exists: the 20 companies in the original seed data store the literal
// string `hash123` in `password` instead of a bcrypt hash, so verifyPassword
// rejects every one of them and nothing can sign in as them. Rather than
// rewrite that seed, this adds a small set of accounts that are ours: one
// prefix on every name, so this script can only ever touch rows it created.
//
// It also adds a second set, the `demo_` accounts, with a project in every
// status and its in-between states (F.11), so each project screen can be
// built before the whole flow works. They are kept apart from `snapshot_` so the snapshot baseline never
// sees them.
//
// It does not replace the existing seed data. It deletes only two things: the
// spent probe accounts the snapshot script leaves behind (pruneProbeAccounts),
// and the demo projects, which every run rebuilds (seedDemoProjects).

import type {
    ProjectStatus,
    ProjectUpdateType,
    QuotationStatus,
} from '@mangodb/shared';
import { IS_PRODUCTION, SEED_PASSWORD } from './env';
import { prisma } from './lib/prisma';
import { fromDateOnly } from './lib/dates';
import { hashPassword } from './auth/password';

// Everything this script owns is named with it, so a `snapshot_` row is always
// this file's and never somebody's real test account.
const PREFIX = 'snapshot';

// SEED_PASSWORD in .env, because the same password ends up in
// scripts/.env.snapshot and some people will want their own.
const PASSWORD = SEED_PASSWORD;

const LISTING_TITLE = 'Snapshot seed service listing';
const PORTFOLIO_LINK = 'https://snapshot.local/portfolio';
const CERT_TITLE = 'Snapshot seed certificate';

interface SeedAccount {
    username: string;
    email: string;
    companyName: string;
    accountType: 'PROVIDER' | 'RECEIVER' | 'ADMIN';
    phone: string;
    companyType: string[];
}

const ACCOUNTS: SeedAccount[] = [
    {
        username: `${PREFIX}_provider`,
        email: `provider@${PREFIX}.local`,
        companyName: 'Snapshot Seed Provider',
        accountType: 'PROVIDER',
        phone: '0810000001',
        companyType: ['Software House'],
    },
    {
        username: `${PREFIX}_receiver`,
        email: `receiver@${PREFIX}.local`,
        companyName: 'Snapshot Seed Receiver',
        accountType: 'RECEIVER',
        phone: '0810000002',
        companyType: ['SME'],
    },
    {
        username: `${PREFIX}_admin`,
        email: `admin@${PREFIX}.local`,
        companyName: 'Snapshot Seed Admin',
        accountType: 'ADMIN',
        phone: '0810000003',
        companyType: ['Platform'],
    },
];

// update as well as create: a run that found the account already there still
// resets the password and clears deletedAt, so reseeding always gets you back
// to an account you can sign in as.
async function upsertAccount(account: SeedAccount): Promise<number> {
    const password = await hashPassword(PASSWORD);
    const { companyType, ...columns } = account;

    const company = await prisma.company.upsert({
        where: { username: account.username },
        update: { ...columns, password, deletedAt: null },
        create: { ...columns, password },
        select: { companyId: true },
    });

    await prisma.companyType.createMany({
        data: companyType.map((tag) => ({
            companyId: company.companyId,
            companyType: tag,
        })),
        skipDuplicates: true,
    });

    // PROVIDER and RECEIVER are discriminators: the row on the side table is
    // what the API actually reads. ADMIN owns neither.
    if (account.accountType === 'PROVIDER') {
        await prisma.provider.upsert({
            where: { companyId: company.companyId },
            update: {},
            create: {
                companyId: company.companyId,
                serviceTerm: 'Delivery within 30 days of the agreed start.',
                warrantyPolicy: '90 days of bug fixes after handover.',
            },
        });
    }

    if (account.accountType === 'RECEIVER') {
        await prisma.receiver.upsert({
            where: { companyId: company.companyId },
            update: {},
            create: { companyId: company.companyId },
        });
    }

    return company.companyId;
}

// POST /portfolios refuses anything that is not attached to a service listing
// the caller owns, so the provider needs one before the snapshot script can
// exercise that endpoint at all.
async function upsertListing(providerId: number): Promise<number> {
    // No unique column to key on, so match the title this script writes.
    const existing = await prisma.listing.findFirst({
        where: { companyId: providerId, listingTitle: LISTING_TITLE },
        select: { listingId: true },
    });

    const listing =
        existing ??
        (await prisma.listing.create({
            data: {
                companyId: providerId,
                listingTitle: LISTING_TITLE,
                listingDesc:
                    'Owned by src/seed.ts so the snapshot script has a listing to post against.',
                minBudget: 50000,
                maxBudget: 200000,
                // OPEN | CLOSED (docs/conventions.md section 6, ADR 0010).
                listingStatus: 'OPEN',
                listingType: 'SERVICE',
            },
            select: { listingId: true },
        }));

    // listingType says this is a service; the service row is what the
    // service endpoints join on, so it has to exist as well.
    await prisma.service.upsert({
        where: { listingId: listing.listingId },
        update: {},
        create: { listingId: listing.listingId },
    });

    return listing.listingId;
}

async function upsertPortfolio(listingId: number): Promise<void> {
    await prisma.servicePortfolio.upsert({
        where: {
            listingId_portfolioLink: {
                listingId,
                portfolioLink: PORTFOLIO_LINK,
            },
        },
        update: {},
        create: {
            listingId,
            portfolioName: 'Snapshot seed portfolio',
            portfolioDescription:
                'A fixed row for GET /portfolios/:portfolioId to answer with.',
            developmentDate: new Date('2026-01-15T00:00:00Z'),
            // Not a Supabase URL on purpose: the snapshot script replaces real
            // storage URLs with a placeholder because they change every upload,
            // and this one should stay visible and stable in the baseline.
            portfolioImage: 'https://snapshot.local/portfolio.png',
            portfolioLink: PORTFOLIO_LINK,
        },
    });
}

async function upsertCertificate(providerId: number): Promise<void> {
    const existing = await prisma.certificate.findFirst({
        where: { providerId, certTitle: CERT_TITLE },
        select: { certificateId: true },
    });

    // Written on both paths, like the accounts above: a seed that only creates
    // cannot repair a row somebody edited, and this one has to stay fixed for
    // the snapshot baseline to reproduce.
    const fields = {
        organization: 'Snapshot Seed Authority',
        issueMonth: 6,
        issueYear: 2024,
        expireMonth: 6,
        expireYear: 2029,
        credentialId: 'SNAPSHOT-0001',
        credentialUrl: 'https://snapshot.local/credential',
        // Null, not a placeholder URL: next/image throws while rendering
        // on a host missing from next.config.ts remotePatterns, and the
        // certificate page has no guard like portfolioImageSrc. A fake
        // https URL here would take that page down on every seeded run.
        certImage: null,
    };

    if (existing) {
        await prisma.certificate.update({
            where: { certificateId: existing.certificateId },
            data: fields,
        });
        return;
    }

    await prisma.certificate.create({
        data: { providerId, certTitle: CERT_TITLE, ...fields },
    });
}

// Each snapshot run registers two throwaway companies and deletes them again,
// but DELETE is a soft delete — nothing in the API can remove the row, so they
// pile up. They are recognisable: scripts/snapshot-api.sh names them with this
// prefix and nothing else does. Only ones already soft-deleted are touched, so
// a run in progress is never pulled out from under itself.
const PROBE_PREFIX = 'snapshot_probe_';

async function pruneProbeAccounts(): Promise<number> {
    const { count } = await prisma.company.deleteMany({
        where: {
            username: { startsWith: PROBE_PREFIX },
            deletedAt: { not: null },
        },
    });
    return count;
}

// F.11. One login per role for the demo, apart from the snapshot accounts.
const DEMO_PREFIX = 'demo';

const DEMO_ACCOUNTS: SeedAccount[] = [
    {
        username: `${DEMO_PREFIX}_provider`,
        email: `provider@${DEMO_PREFIX}.local`,
        companyName: 'Demo Provider Co.',
        accountType: 'PROVIDER',
        phone: '0820000001',
        companyType: ['Software House'],
    },
    {
        username: `${DEMO_PREFIX}_receiver`,
        email: `receiver@${DEMO_PREFIX}.local`,
        companyName: 'Demo Receiver Co.',
        accountType: 'RECEIVER',
        phone: '0820000002',
        companyType: ['SME'],
    },
    {
        username: `${DEMO_PREFIX}_admin`,
        email: `admin@${DEMO_PREFIX}.local`,
        companyName: 'Demo Admin',
        accountType: 'ADMIN',
        phone: '0820000003',
        companyType: ['Platform'],
    },
];

// Every demo job starts with this, so a rerun finds its own and no one else's.
const DEMO_TITLE = 'Demo project:';
const DEMO_BUDGET = 120000;

// shortcut: a dead placeholder link, not a real PDF; upload one once the
// quotation upload (T4.1.3) has a storage bucket.
const DEMO_QUOTATION_FILE = 'https://demo.local/quotation.pdf';

interface DemoProject {
    projectStatus: ProjectStatus;
    title: string;
    // Oldest first. Only the last may be PENDING or ACCEPTED (ADR 0017).
    quotations: QuotationStatus[];
    updates: { updateType: ProjectUpdateType; updateText: string }[];
    // In-between states the status alone does not tell apart (issue #176).
    depositReported?: boolean;
    withoutReview?: boolean;
}

// One project per ADR 0015 status, each with the rows that status implies,
// plus the in-between states a project screen also has to show.
const DEMO_PROJECTS: DemoProject[] = [
    {
        projectStatus: 'AWAITING_QUOTATION',
        title: 'Landing page',
        quotations: [],
        updates: [],
    },
    {
        projectStatus: 'AWAITING_QUOTATION',
        title: 'Company website',
        quotations: ['PENDING'],
        updates: [],
    },
    {
        projectStatus: 'AWAITING_QUOTATION',
        title: 'Recruitment portal',
        quotations: ['REJECTED'],
        updates: [],
    },
    {
        projectStatus: 'AWAITING_DEPOSIT',
        title: 'Inventory app',
        quotations: ['REJECTED', 'ACCEPTED'],
        updates: [],
    },
    {
        projectStatus: 'AWAITING_DEPOSIT',
        title: 'Payroll tool',
        quotations: ['ACCEPTED'],
        updates: [],
        depositReported: true,
    },
    {
        projectStatus: 'IN_PROGRESS',
        title: 'Booking system',
        quotations: ['ACCEPTED'],
        updates: [
            { updateType: 'PROGRESS', updateText: 'Booking form is done.' },
            {
                updateType: 'WORK_REJECTED',
                updateText: 'The confirmation email is never sent.',
            },
        ],
    },
    {
        projectStatus: 'AWAITING_ACCEPTANCE',
        title: 'Sales dashboard',
        quotations: ['ACCEPTED'],
        updates: [
            { updateType: 'PROGRESS', updateText: 'Charts are connected.' },
            { updateType: 'PROGRESS', updateText: 'Ready for your review.' },
        ],
    },
    {
        projectStatus: 'COMPLETED',
        title: 'Mobile shop',
        quotations: ['ACCEPTED'],
        updates: [
            { updateType: 'PROGRESS', updateText: 'Checkout works.' },
            { updateType: 'PROGRESS', updateText: 'Published to the stores.' },
        ],
    },
    {
        projectStatus: 'COMPLETED',
        title: 'Blog platform',
        quotations: ['ACCEPTED'],
        updates: [{ updateType: 'PROGRESS', updateText: 'Blog is live.' }],
        withoutReview: true,
    },
    {
        projectStatus: 'CANCELLED',
        title: 'Chatbot',
        quotations: ['REJECTED'],
        updates: [],
    },
];

// The statuses the deposit has already been paid and confirmed in.
const PAID_STATUSES: ProjectStatus[] = [
    'IN_PROGRESS',
    'AWAITING_ACCEPTANCE',
    'COMPLETED',
];

// 9:00 UTC on a day of October 2026, so every timeline sorts the same way.
function october(day: number): Date {
    return new Date(Date.UTC(2026, 9, day, 9));
}

// ADR 0018: the completed project's one review, four 1-5 scores.
const DEMO_REVIEW = {
    workQualityScore: 5,
    serviceScore: 4,
    valueForMoneyScore: 4,
    deliveryTimeScore: 3,
    comment: 'Good work, a week later than planned.',
    createdAt: october(22),
};

// Deletes the demo jobs and builds them again, so a rerun also undoes any
// status the flow has moved since. Project ids change on every run.
async function seedDemoProjects(
    providerId: number,
    receiverId: number,
): Promise<void> {
    const demoJobs = {
        companyId: receiverId,
        listingTitle: { startsWith: DEMO_TITLE },
    };
    // project.proposal_id is ON DELETE RESTRICT, so projects go first. Their
    // quotations, updates and review cascade with them.
    await prisma.project.deleteMany({
        where: { proposal: { listing: demoJobs } },
    });
    await prisma.listing.deleteMany({ where: demoJobs });

    for (const demo of DEMO_PROJECTS) {
        const paid = PAID_STATUSES.includes(demo.projectStatus);
        const reported = paid || demo.depositReported === true;
        const completed = demo.projectStatus === 'COMPLETED';
        const reviewed = completed && demo.withoutReview !== true;

        // A job the Receiver posted and the Provider's accepted proposal on it,
        // the same rows accepting a proposal leaves behind.
        await prisma.listing.create({
            data: {
                companyId: receiverId,
                listingTitle: `${DEMO_TITLE} ${demo.title}`,
                listingDesc: `Seeded by src/seed.ts: a project that is ${demo.projectStatus}.`,
                minBudget: 100000,
                maxBudget: 150000,
                // Accepting a proposal closes its job.
                listingStatus: 'CLOSED',
                listingType: 'JOB',
                job: { create: {} },
                proposal: {
                    create: {
                        senderId: providerId,
                        proposalBudget: DEMO_BUDGET,
                        proposalTerms: 'Half up front, half on handover.',
                        duration: 30,
                        proposalStatus: 'ACCEPTED',
                        project: {
                            create: {
                                totalBudget: DEMO_BUDGET,
                                startDate: fromDateOnly('2026-10-01'),
                                projectStatus: demo.projectStatus,
                                depositReportedAt: reported ? october(5) : null,
                                depositConfirmedAt: paid ? october(6) : null,
                                completedAt: completed ? october(22) : null,
                                quotation: {
                                    create: demo.quotations.map(
                                        (quotationStatus, i) => ({
                                            quotationFile: DEMO_QUOTATION_FILE,
                                            quotationStatus,
                                            createdAt: october(2 + i),
                                        }),
                                    ),
                                },
                                projectUpdate: {
                                    create: demo.updates.map((update, i) => ({
                                        ...update,
                                        createdAt: october(10 + 5 * i),
                                    })),
                                },
                                // Spread, not review: undefined, which
                                // exactOptionalPropertyTypes refuses.
                                ...(reviewed && {
                                    review: { create: DEMO_REVIEW },
                                }),
                            },
                        },
                    },
                },
            },
        });
    }
}

async function upsertAccounts(
    accounts: SeedAccount[],
): Promise<Map<string, number>> {
    const ids = new Map<string, number>();
    for (const account of accounts) {
        ids.set(account.accountType, await upsertAccount(account));
        console.log(`ok  ${account.accountType.padEnd(8)} ${account.email}`);
    }
    return ids;
}

async function main(): Promise<void> {
    // These are known credentials. On a real deployment that is an open door.
    if (IS_PRODUCTION) {
        throw new Error('Refusing to seed with NODE_ENV=production');
    }

    const ids = await upsertAccounts(ACCOUNTS);

    const providerId = ids.get('PROVIDER');
    if (providerId === undefined) {
        throw new Error('Provider account was not created');
    }

    const pruned = await pruneProbeAccounts();
    if (pruned > 0) {
        console.log(`ok  pruned ${pruned} spent snapshot probe account(s)`);
    }

    const listingId = await upsertListing(providerId);
    await upsertPortfolio(listingId);
    await upsertCertificate(providerId);
    console.log(`ok  listing ${listingId}, with a portfolio and a certificate`);

    const demoIds = await upsertAccounts(DEMO_ACCOUNTS);
    await seedDemoProjects(demoIds.get('PROVIDER')!, demoIds.get('RECEIVER')!);
    console.log(`ok  ${DEMO_PROJECTS.length} demo projects, every status`);

    console.log('\nPut these in scripts/.env.snapshot:\n');
    for (const account of ACCOUNTS) {
        console.log(`${account.accountType}_EMAIL=${account.email}`);
        console.log(`${account.accountType}_PASSWORD=${PASSWORD}`);
    }
}

main()
    .catch((err: unknown) => {
        console.error(err);
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
