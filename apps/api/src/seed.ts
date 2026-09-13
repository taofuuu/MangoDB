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
// It does not replace the existing seed data and does not delete anything.

import { prisma } from './lib/prisma';
import { hashPassword } from './auth/password';

// Everything this script owns is named with it, so a `snapshot_` row is always
// this file's and never somebody's real test account.
const PREFIX = 'snapshot';

// Overridable, because the same password ends up in scripts/.env.snapshot and
// some people will want their own. The default is fine for a local database
// and is meant to look like what it is.
const PASSWORD = process.env.SEED_PASSWORD ?? 'snapshot-dev-password';

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
                // Free text today. docs/conventions.md section 6 turns this
                // into DRAFT | OPEN | CLOSED — update this line when it does.
                listingStatus: 'OPEN',
            },
            select: { listingId: true },
        }));

    // The child row is what makes this listing a service rather than a job
    // posting — see Phase 1e, nothing else distinguishes the two today.
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

    if (existing) return;

    await prisma.certificate.create({
        data: {
            providerId,
            certTitle: CERT_TITLE,
            organization: 'Snapshot Seed Authority',
            issueMonth: 6,
            issueYear: 2024,
            expireMonth: 6,
            expireYear: 2029,
            credentialId: 'SNAPSHOT-0001',
            credentialUrl: 'https://snapshot.local/credential',
            certImage: 'https://snapshot.local/certificate.png',
        },
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

async function main(): Promise<void> {
    // These are known credentials. On a real deployment that is an open door.
    if (process.env.NODE_ENV === 'production') {
        throw new Error('Refusing to seed with NODE_ENV=production');
    }

    const ids = new Map<string, number>();
    for (const account of ACCOUNTS) {
        ids.set(account.accountType, await upsertAccount(account));
        console.log(`ok  ${account.accountType.padEnd(8)} ${account.email}`);
    }

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
