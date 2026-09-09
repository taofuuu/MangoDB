/**
 * Creates the first Administrator account (US6-1).
 *
 * Why a script and not an endpoint: nothing reachable from the internet may
 * create an admin. registerSchema rejects ADMIN on purpose, and the profile
 * edit cannot change account_type, so there is no API path that produces one.
 * This is the only writer of account_type ADMIN.
 *
 * Why not by hand in Supabase: the password column holds a bcrypt hash, which
 * cannot be typed. Twenty of the seeded companies already have plain strings
 * there and can never log in; this avoids repeating that.
 *
 * An admin is a plain company row with account_type ADMIN and no provider or
 * receiver row, so login, requireAuth and requireRole all work unchanged.
 * Splitting admins into their own table is next sprint.
 *
 *   npm run create-admin
 *   npm run create-admin -- --reset-password
 */
import 'dotenv/config';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import {
    BCRYPT_MAX_BYTES,
    fitsBcryptLimit,
    hashPassword,
} from '../auth/password';
import {
    COMPANY_UNIQUE_FIELDS,
    companyFields,
} from '../schemas/company.schema';
import { uniqueViolationFields } from '../lib/prismaErrors';

// Overwrites an existing admin password. Off by default: one shared database
// means one shared admin, and silently changing its password would lock out
// whoever is mid-session.
const RESET_PASSWORD = process.argv.includes('--reset-password');

// Same rules the signup form uses, so an admin created here cannot be a shape
// the API would have rejected. The password rule is register's byte cap, not a
// character cap, for the reason BCRYPT_MAX_BYTES documents.
const adminSchema = z.object({
    email: companyFields.email,
    password: z
        .string()
        .min(8)
        .refine(
            fitsBcryptLimit,
            `Password must be at most ${BCRYPT_MAX_BYTES} bytes`,
        ),
    username: companyFields.username,
    company_name: companyFields.company_name,
    phone: companyFields.phone,
});

type AdminInput = z.infer<typeof adminSchema>;

// company_name and phone are NOT NULL on a table built for businesses, so an
// admin needs filler for both. They are overridable in case the defaults ever
// collide with a real company.
function readEnv(): AdminInput {
    const parsed = adminSchema.safeParse({
        email: process.env.ADMIN_EMAIL,
        password: process.env.ADMIN_PASSWORD,
        username: process.env.ADMIN_USERNAME ?? 'admin',
        company_name:
            process.env.ADMIN_COMPANY_NAME ?? 'MangoDB Administration',
        phone: process.env.ADMIN_PHONE ?? '0000000000',
    });

    if (!parsed.success) {
        console.error('Cannot create the admin. Check apps/api/.env:');
        for (const issue of parsed.error.issues) {
            const key = String(issue.path[0] ?? '').toUpperCase();
            console.error(`  ADMIN_${key}: ${issue.message}`);
        }
        process.exit(1);
    }

    return parsed.data;
}

async function main(): Promise<void> {
    const admin = readEnv();

    const existing = await prisma.company.findUnique({
        where: { email: admin.email },
        select: { company_id: true, username: true, account_type: true },
    });

    // A typo in ADMIN_EMAIL must not quietly promote a real business to admin.
    if (existing && existing.account_type !== 'ADMIN') {
        console.error(
            `Refusing: ${admin.email} is company ${existing.company_id}, account_type ` +
                `${existing.account_type}. This script will not promote an existing ` +
                `company to admin. Use a different ADMIN_EMAIL.`,
        );
        process.exit(1);
    }

    if (existing) {
        if (!RESET_PASSWORD) {
            console.log(
                `Admin already exists: ${admin.email} (company_id ${existing.company_id}, ` +
                    `username ${existing.username}). Nothing changed.`,
            );
            console.log(
                'Run with -- --reset-password to set its password to ADMIN_PASSWORD.',
            );
            return;
        }

        await prisma.company.update({
            where: { company_id: existing.company_id },
            data: { password: await hashPassword(admin.password) },
        });
        console.log(
            `Password reset for admin ${admin.email} (company_id ${existing.company_id}).`,
        );
        return;
    }

    // No company_type tags and no provider/receiver row: an admin is not an
    // industry and offers nothing. companyProfileSelect handles the missing
    // provider row already, the same way it does for a RECEIVER company.
    try {
        const created = await prisma.company.create({
            data: {
                company_name: admin.company_name,
                username: admin.username,
                email: admin.email,
                phone: admin.phone,
                password: await hashPassword(admin.password),
                account_type: 'ADMIN',
            },
            select: { company_id: true, email: true, username: true },
        });

        console.log(
            `Created admin: company_id ${created.company_id}, ${created.email}, ` +
                `username ${created.username}.`,
        );
        console.log('Verify with: log in, then GET /admin/ping (expect 200).');
    } catch (err) {
        // email was free, so a collision here is username. Reported by name
        // rather than as a raw P2002, which says nothing useful on a console.
        const fields = uniqueViolationFields(err, COMPANY_UNIQUE_FIELDS);
        if (fields?.length) {
            console.error(
                `Cannot create the admin: ${fields.join(' and ')} already taken. ` +
                    'Set ADMIN_USERNAME in .env to something else.',
            );
            process.exit(1);
        }
        throw err;
    }
}

main()
    .catch((err: unknown) => {
        console.error(err);
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
