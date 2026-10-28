// Creates the admin account on a deployed database, or resets its password.
// seed.ts refuses NODE_ENV=production because its accounts have known
// passwords; this one takes the password from ADMIN_PASSWORD instead.
//
//   node --env-file=.env.alpha --import tsx src/create-admin.ts   (from apps/api)
//
// There is no forgot-password (ADR 0012), so running it again is also how a
// lost admin password is replaced.

import { adminCredentials } from './env';
import { prisma } from './lib/prisma';
import { hashPassword } from './auth/password';
import { companyFields } from './schemas/company.schema';

async function main(): Promise<void> {
    const { email, password } = adminCredentials();
    // The rule register uses, so the admin is no weaker than any company.
    companyFields.password.parse(password);

    // Upsert alone would reset a company's password if the email were theirs.
    const existing = await prisma.company.findUnique({
        where: { email },
        select: { accountType: true },
    });
    if (existing && existing.accountType !== 'ADMIN') {
        throw new Error(`${email} belongs to a company, not an admin`);
    }

    const hashed = await hashPassword(password);
    const admin = await prisma.company.upsert({
        where: { email },
        update: { password: hashed, deletedAt: null },
        create: {
            companyName: 'MangoDB Admin',
            username: 'admin',
            email,
            phone: '-',
            accountType: 'ADMIN',
            password: hashed,
        },
        select: { companyId: true },
    });
    console.log(`ok  admin ${email} is company ${admin.companyId}`);
}

main()
    .catch((err: unknown) => {
        console.error(err);
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
