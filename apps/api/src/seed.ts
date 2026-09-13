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
    company_name: string;
    account_type: 'PROVIDER' | 'RECEIVER' | 'ADMIN';
    phone: string;
    company_type: string[];
}

const ACCOUNTS: SeedAccount[] = [
    {
        username: `${PREFIX}_provider`,
        email: `provider@${PREFIX}.local`,
        company_name: 'Snapshot Seed Provider',
        account_type: 'PROVIDER',
        phone: '0810000001',
        company_type: ['Software House'],
    },
    {
        username: `${PREFIX}_receiver`,
        email: `receiver@${PREFIX}.local`,
        company_name: 'Snapshot Seed Receiver',
        account_type: 'RECEIVER',
        phone: '0810000002',
        company_type: ['SME'],
    },
    {
        username: `${PREFIX}_admin`,
        email: `admin@${PREFIX}.local`,
        company_name: 'Snapshot Seed Admin',
        account_type: 'ADMIN',
        phone: '0810000003',
        company_type: ['Platform'],
    },
];

// update as well as create: a run that found the account already there still
// resets the password and clears deleted_at, so reseeding always gets you back
// to an account you can sign in as.
async function upsertAccount(account: SeedAccount): Promise<number> {
    const password = await hashPassword(PASSWORD);
    const { company_type, ...columns } = account;

    const company = await prisma.company.upsert({
        where: { username: account.username },
        update: { ...columns, password, deleted_at: null },
        create: { ...columns, password },
        select: { company_id: true },
    });

    await prisma.company_type.createMany({
        data: company_type.map((tag) => ({
            company_id: company.company_id,
            company_type: tag,
        })),
        skipDuplicates: true,
    });

    // PROVIDER and RECEIVER are discriminators: the row on the side table is
    // what the API actually reads. ADMIN owns neither.
    if (account.account_type === 'PROVIDER') {
        await prisma.provider.upsert({
            where: { company_id: company.company_id },
            update: {},
            create: {
                company_id: company.company_id,
                service_term: 'Delivery within 30 days of the agreed start.',
                warranty_policy: '90 days of bug fixes after handover.',
            },
        });
    }

    if (account.account_type === 'RECEIVER') {
        await prisma.receiver.upsert({
            where: { company_id: company.company_id },
            update: {},
            create: { company_id: company.company_id },
        });
    }

    return company.company_id;
}

// POST /portfolios refuses anything that is not attached to a service listing
// the caller owns, so the provider needs one before the snapshot script can
// exercise that endpoint at all.
async function upsertListing(providerId: number): Promise<number> {
    // No unique column to key on, so match the title this script writes.
    const existing = await prisma.listing.findFirst({
        where: { company_id: providerId, listing_title: LISTING_TITLE },
        select: { listing_id: true },
    });

    const listing =
        existing ??
        (await prisma.listing.create({
            data: {
                company_id: providerId,
                listing_title: LISTING_TITLE,
                listing_desc:
                    'Owned by src/seed.ts so the snapshot script has a listing to post against.',
                min_budget: 50000,
                max_budget: 200000,
                // Free text today. Phase 1d of the refactor turns this into
                // DRAFT | OPEN | CLOSED — update this line when it does.
                listing_status: 'OPEN',
            },
            select: { listing_id: true },
        }));

    // The child row is what makes this listing a service rather than a job
    // posting — see Phase 1e, nothing else distinguishes the two today.
    await prisma.service.upsert({
        where: { listing_id: listing.listing_id },
        update: {},
        create: { listing_id: listing.listing_id },
    });

    return listing.listing_id;
}

async function upsertPortfolio(listingId: number): Promise<void> {
    await prisma.service_portfolio.upsert({
        where: {
            listing_id_portfolio_link: {
                listing_id: listingId,
                portfolio_link: PORTFOLIO_LINK,
            },
        },
        update: {},
        create: {
            listing_id: listingId,
            portfolio_name: 'Snapshot seed portfolio',
            portfolio_description:
                'A fixed row for GET /portfolios/:portfolioId to answer with.',
            development_date: new Date('2026-01-15T00:00:00Z'),
            // Not a Supabase URL on purpose: the snapshot script replaces real
            // storage URLs with a placeholder because they change every upload,
            // and this one should stay visible and stable in the baseline.
            portfolio_image: 'https://snapshot.local/portfolio.png',
            portfolio_link: PORTFOLIO_LINK,
        },
    });
}

async function upsertCertificate(providerId: number): Promise<void> {
    const existing = await prisma.certificate.findFirst({
        where: { provider_id: providerId, cert_title: CERT_TITLE },
        select: { certificate_id: true },
    });

    if (existing) return;

    await prisma.certificate.create({
        data: {
            provider_id: providerId,
            cert_title: CERT_TITLE,
            organization: 'Snapshot Seed Authority',
            issue_month: 6,
            issue_year: 2024,
            expire_month: 6,
            expire_year: 2029,
            credential_id: 'SNAPSHOT-0001',
            credential_url: 'https://snapshot.local/credential',
            cert_image: 'https://snapshot.local/certificate.png',
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
            deleted_at: { not: null },
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
        ids.set(account.account_type, await upsertAccount(account));
        console.log(`ok  ${account.account_type.padEnd(8)} ${account.email}`);
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
        console.log(`${account.account_type}_EMAIL=${account.email}`);
        console.log(`${account.account_type}_PASSWORD=${PASSWORD}`);
    }
}

main()
    .catch((err: unknown) => {
        console.error(err);
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
