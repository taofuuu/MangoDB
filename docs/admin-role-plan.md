# Administrator role and the first admin account (US6-1)

Branch: `feature/admin-role`
Written: 2026-09-09

## Decision

**Option A: an admin is a `company` row with `account_type = 'ADMIN'`.**
No new table, no migration — `account_type` is already `VarChar(100)`, so
`'ADMIN'` is just a value.

Splitting admins into their own table is deferred to next sprint. See
"Next sprint" below, because the target matters.

## What already existed

Most of the plumbing was in place before this change:

- `UserRole` already included `'admin'`
- `GRANTS` already had `admin: ['admin']` (admin is **not** a superset — an
  admin token gets 403 from provider-only and receiver-only routes)
- `/admin/ping` was already guarded by `requireAuth, requireRole('admin')`
- `POST /auth/login` works unchanged: it finds the admin by email in `company`,
  and `accountTypeToRole` turns `ADMIN` into the `admin` role claim

What was missing was an admin to authenticate as.

## What changed

| File                                   | Change                                        |
| -------------------------------------- | --------------------------------------------- |
| `packages/shared/index.ts`             | `AccountType` gains `'ADMIN'`                 |
| `apps/api/src/auth/roles.ts`           | `ROLE_BY_ACCOUNT_TYPE` gains `ADMIN: 'admin'` |
| `apps/api/src/scripts/create-admin.ts` | New. Creates the first admin                  |
| `apps/api/package.json`                | New `create-admin` script                     |
| `apps/api/.env.example`                | `ADMIN_EMAIL`, `ADMIN_PASSWORD`               |

`apps/api/src/schemas/auth.schema.ts` was **deliberately not changed** — see
"Rules" below.

No auth code changed. No migration. No `db:generate` needed for this work.

## Creating the admin

```bash
cd apps/api
# add ADMIN_EMAIL and ADMIN_PASSWORD to .env first
npm run create-admin
```

Optional overrides, defaulted so two variables are enough:
`ADMIN_USERNAME` (`admin`), `ADMIN_COMPANY_NAME` (`MangoDB Administration`),
`ADMIN_PHONE` (`0000000000`).

The script:

- validates the env values with the **same zod rules the signup form uses**, so
  an admin cannot be a shape the API would have rejected
- hashes with `hashPassword` (bcrypt, cost 12). This is the point of the
  script: 20 of the seeded companies hold plain strings in `password` and can
  never log in, because `bcrypt.compare` will not match plain text
- is safe to run twice. If the admin exists it reports and changes nothing
- **refuses to promote an existing company.** If `ADMIN_EMAIL` matches a real
  business it exits 1 rather than flipping it to admin
- `-- --reset-password` overwrites the password of an existing admin. Off by
  default, because one shared database means one shared admin

### Verify

1. `POST /auth/login` with the admin credentials
2. `GET /admin/ping` with that token -> **200**
3. Log in as any normal company, `GET /admin/ping` -> **403**

## Rules

**1. `registerSchema` must never accept `ADMIN`.**

```ts
account_type: z.enum(['PROVIDER', 'RECEIVER', 'BOTH']),
```

When `'ADMIN'` was added to the `AccountType` type it became tempting to add it
here too, "for consistency". Do not. That one edit would let anyone create an
admin from the public signup form. The type and the registration enum are
_supposed_ to differ.

`updateCompanyProfileSchema` also excludes `account_type`, so a company cannot
promote itself later. Both gaps are intentional.

**2. Admins must be filtered out of any company list.**

An admin is a row in `company`, so it will appear in any browse or search page
unless excluded:

```ts
where: {
    account_type: {
        not: 'ADMIN';
    }
}
```

Nothing filters it today because **no `company.findMany` exists yet** — the
company API is only `GET /companies/me` and `PATCH /companies/me`. The first
person to need this is whoever builds `feature/view-registered-company-accounts`.
Tell them before they build it.

This is the same shape of trap as the soft-delete filter in
`project-review-history-plan.md`. Those queries will eventually need both:

```ts
where: { deleted_at: null, account_type: { not: 'ADMIN' } }
```

**3. `'ADMIN'` is an unconstrained string.**

`account_type` is `VarChar(100)` with no CHECK constraint, so `'Admin'` or
`'admin '` can be written by hand in Supabase. Such a row looks fine in the
table and then **500s on login**, because `accountTypeToRole` throws on an
unknown value.

Optional hardening, one line of raw SQL and no new table. Only `PROVIDER`,
`RECEIVER` and `BOTH` exist today, so it applies cleanly:

```sql
ALTER TABLE company ADD CONSTRAINT company_account_type_check
  CHECK (account_type IN ('PROVIDER','RECEIVER','BOTH','ADMIN'));
```

Prisma cannot express CHECK constraints, so it would live only in the migration
and not in `schema.prisma`. Not applied — decide as a team.

## Known compromises

- The admin carries a **fake company name and phone number**, because
  `company_name` and `phone` are `NOT NULL` on a table built for businesses
- It has **no `company_type` tags** and no `provider` or `receiver` row. An
  admin is not an industry and offers nothing. `companyProfileSelect` already
  handles a missing provider row, the same way it does for a RECEIVER company
- **One shared admin for the whole team**, since there is one shared Supabase.
  Nobody will be able to tell who did what

## Next sprint: which separate table?

The two options are very different amounts of work, so agree the target before
starting.

**A -> B (marker table keyed by `company_id`, mirroring `provider`/`receiver`)**
One `INSERT ... SELECT` migration and **zero** auth changes. `sub` stays a
`company_id`. Roughly an hour.

**A -> C (standalone table with its own primary key)**
The full auth surgery: a new `kind` claim in the token, `login` searching two
tables, a different login response shape, and **6 `Number(req.auth!.sub)` call
sites** to audit across `certificate.controller.ts`, `company.controller.ts`
and `portfolio.controller.ts`. Every one of those assumes `sub` is a company
id; with C, admin #1 and company #1 both produce `sub = "1"`. Since
`/companies/me` is authenticated but not role-restricted, an admin hitting it
would load company 1's profile. That is a privilege-confusion bug, not a
tidiness issue.

Starting with A costs nothing if the target is B. It costs nothing extra if the
target is C either — C is the same price whenever it is paid.

## Unrelated, but found while doing this

`npm run typecheck` currently fails with 13 errors on `main`, none of them from
this work:

- `cookie-parser`, `multer` and `@supabase/supabase-js` are in `package.json`
  but not installed — run `npm install`
- the generated Prisma client is stale (`portfolio_name` is in
  `schema.prisma` but not in the client) — run `npm run db:generate`
