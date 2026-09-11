# MangoDB API

Express 5 + TypeScript. Prisma 7 against Postgres (Supabase), through the
`@prisma/adapter-pg` driver adapter.

```bash
cp .env.example .env   # then fill JWT_SECRET, DATABASE_URL, DIRECT_URL
npm run db:generate    # regenerate Prisma Client (src/generated/prisma)
npm run dev            # tsx watch, http://localhost:4000
npm run typecheck      # tsc --noEmit — must pass before you open a PR
```

## Migrations

`prisma/migrations/` is the history, and it is new. Before it existed the
schema was introspected from the live Supabase database with `db:pull`, so
Prisma had nothing to diff against and `migrate dev` would have read every
table as drift and offered to reset the database. `0_init` is a baseline: it
describes the database as it already was, and is marked applied rather than
run.

Two things follow from that:

- **`npm run db:pull` is no longer the workflow.** The direction has reversed.
  Edit `prisma/schema.prisma`, run `npx prisma migrate dev --name <what>`, then
  commit the generated folder. Hand-editing tables in Supabase and pulling
  afterwards fights the history.
- **Commit `prisma/migrations/`.** If it is not in git, nobody else can apply
  what you changed.

If the team shares one Supabase instance, a migration changes everyone's
database the moment it runs. Say so before running one, and have people pull
the new migration folder afterwards.

## Endpoint conventions

Read this before adding an endpoint. Every endpoint follows the same shape so
the frontend can handle all of them with one code path.

### Layout

| Directory          | Holds                                                     |
| ------------------ | --------------------------------------------------------- |
| `src/routes/`      | Paths and middleware only — no logic                      |
| `src/controllers/` | The work: validate, call Prisma, respond                  |
| `src/middleware/`  | Cross-cutting request handling (auth, errors, validation) |
| `src/schemas/`     | zod request schemas, one file per area                    |
| `src/lib/`         | Shared building blocks (`ApiError`, Prisma, serializers)  |
| `src/auth/`        | Token signing/verification, password hashing, roles       |

`src/app.ts` builds the app without listening so tests can drive it with
supertest; `src/index.ts` is the only place that opens a port.

### Adding an endpoint

1. Put the request schema in `src/schemas/<area>.schema.ts`.
2. Write the handler in `src/controllers/<area>.controller.ts`.
3. Wire it in `src/routes/<area>.routes.ts`.
4. Mount the router once in `src/routes/index.ts` if the area is new.

A controller should read as handlers and nothing else. Anything reusable — a
response shape, error translation, a query helper — belongs in `src/lib/`, so
the next endpoint gets it for free instead of copying it.

```ts
// src/controllers/company.controller.ts
import type { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { parseBody } from '../middleware/validate';
import { ApiError } from '../lib/ApiError';

const updateProfileSchema = z.object({
    company_name: z.string().min(1).max(255),
    email: z.email().max(100),
    phone: z.string().min(1).max(20),
});

export async function updateProfile(req: Request, res: Response) {
    const body = parseBody(updateProfileSchema, req.body); // typed from the schema

    const company = await prisma.company.findUnique({
        where: { company_id: Number(req.auth!.sub) },
    });
    if (!company) {
        throw ApiError.notFound('Company not found');
    }

    res.json(
        await prisma.company.update({
            where: { company_id: company.company_id },
            data: body,
        }),
    );
}
```

```ts
// src/routes/company.routes.ts
export const companyRoutes = Router();
companyRoutes.patch('/me', requireAuth, updateProfile);
```

### Rules

- **Never call `res.status(4xx)` or `res.status(5xx)`.** Throw an `ApiError`
  instead. Express 5 forwards it — including from a rejected `async` handler,
  so controllers need no `try`/`catch` and no wrapper — to `errorHandler`,
  which is the single place that formats failures.
- **Validate with `parseBody` / `parseQuery`** from `src/middleware/validate.ts`.
  They take a zod schema, return a value typed from it, and throw the right
  `ApiError` on bad input. No hand-written `if (!body.email)` chains.
- **Success responses return the resource unwrapped** — `res.json(company)`,
  not `res.json({ data: company })`. `204` with no body for a successful
  delete or logout. Three endpoints are exceptions, all returning
  `{ company, accessToken }` because all three hand you a session:
  `POST /auth/register`, `POST /auth/login`, and
  `PATCH /companies/me/credentials`, which _re_-logs you in — it revokes the
  token it was called with, so it has to return the replacement. All three go
  through `sendSession` in `src/lib/session.ts`, which also sets the
  `access_token` cookie — see Authentication below.
- **Guard admin-only routers once** with `router.use(requireAuth, requireRole('admin'))`
  rather than repeating the guards per route, so a new route cannot miss them.
- **Never put a secret, a stack trace, or a Prisma error in a response.**
  `errorHandler` logs the real error and returns a generic `INTERNAL` body.

### Error envelope

Every non-2xx response has this body, and nothing else:

```json
{
    "error": {
        "code": "VALIDATION_FAILED",
        "message": "Request body is invalid",
        "details": [{ "field": "email", "message": "Invalid email address" }]
    }
}
```

`details` is present only for field-level failures. `code` is the stable,
machine-readable half — the frontend switches on it, so renaming one is a
breaking change for both sides. `message` is for humans and can be reworded.
The types live in `@mangodb/shared` (`ApiErrorCode`, `ApiErrorResponse`), so
the frontend imports the same definitions.

| Code                | Status | Use for                                          |
| ------------------- | ------ | ------------------------------------------------ |
| `BAD_REQUEST`       | 400    | Malformed request that is not field-level        |
| `VALIDATION_FAILED` | 400    | Field-level rejection (carries `details`)        |
| `UNAUTHORIZED`      | 401    | No token, bad token, ended session               |
| `FORBIDDEN`         | 403    | Authenticated but the role may not do it         |
| `NOT_FOUND`         | 404    | Unknown route or missing resource                |
| `CONFLICT`          | 409    | Existing data blocks the write (username taken)  |
| `INTERNAL`          | 500    | Anything unplanned — a bug, never thrown by hand |

`401` means "we do not know who you are", `403` means "we know, and no". A
missing token is never `403`.

### Account types and roles

`company.account_type` holds `PROVIDER`, `RECEIVER`, or `BOTH` — uppercase, as
the seeded rows have it. It is a discriminator: a company with `PROVIDER` has a
row in `provider`, `RECEIVER` has one in `receiver`, and `BOTH` has both. Every
endpoint that creates a company must keep that invariant, or later features
find a company with no subtype row.

`account_type` is not the token role. `src/auth/roles.ts` maps one to the other
(`BOTH` → `'both'`) and answers the separate question of what a role may act
as: `both` grants `provider` and `receiver`, so `requireRole('provider')` lets a
BOTH company through. `admin` grants only `admin` — it is not a superset.

`company_type` is a different thing again: repeatable industry tags (`SME`,
`Software House`, `FinTech`), at least one per company.

### Registration

`POST /auth/register` is public. It hashes the password, creates the company,
its tags, and its subtype rows in one nested `create` — a single transaction —
then returns `201 { company, accessToken }`. The company never carries its
password: `companyProfileSelect` in `src/lib/companyProfile.ts` names the
columns that may be returned, and `toCompanyProfile` flattens the tag rows.
Reuse both for any endpoint that returns a company — US1-4 included.

Duplicate usernames and emails are caught twice, on purpose.
`assertCompanyIdentityAvailable` in `src/lib/companyIdentity.ts` runs the
case-insensitive pre-check before the insert, so a caller colliding on both
columns is told about both. The unique indexes are still what enforce
uniqueness: two registrations claiming one username can both clear the check,
and the loser surfaces as Prisma's `P2002`, which `uniqueViolationFields` in
`src/lib/prismaErrors.ts` turns into the same `409 CONFLICT` body. Note the
handler lowercases username and email before writing, because the unique index
is case-sensitive and would otherwise accept `CodeCrafters` next to
`codecrafters`.

`POST /auth/check-availability` (US1-1.9) is the same check exposed on its own,
public, returning `{ usernameAvailable, emailAvailable }` for the signup form's
inline hint. It is advisory — it reserves nothing, so `register` re-checks.

### Account credentials

`PATCH /companies/me/credentials` (`requireAuth`) changes the three fields a
company signs in with. Send `current_password` plus any of `username`, `email`,
and `new_password`; `current_password` alone is a `400`, because it changes
nothing.

| Method  | Path                        | Middleware    |
| ------- | --------------------------- | ------------- |
| `PATCH` | `/companies/me/credentials` | `requireAuth` |

The current password gates all three, not just the password. Each of them is a
way to take an account over — move the email and you own the login — so a token
alone is not enough. That is also why **`PATCH /companies/me` no longer accepts
`username` or `email`**: leaving them there would make the gate decorative,
since anyone holding a token could walk around it with one request. The profile
edit still writes `contact_email`, which is a different, non-unique column.

A wrong `current_password` is `401`, the same answer login gives, and it is
checked before anything is written. A username or email another company holds
is `409` with one `details` entry per rejected field — the same
`assertCompanyIdentityAvailable` pre-check registration uses, passed
`excludeCompanyId` so re-submitting your own value is not a collision.

On success it revokes the token it was called with and returns
`{ company, accessToken }` — plus a replacement cookie, so a browser stays
signed in with nothing to do. Skipping that cookie would sign the caller out
the moment they changed their own email. See the response-shape rule above for
why this wraps.

### Authentication

`requireAuth` takes the token from an `Authorization: Bearer` header or, failing
that, the `access_token` cookie — header first. It verifies it, rejects revoked
ones, and puts the claims on `req.auth` (`sub`, `role`, `jti`, `exp`).
`requireRole(...roles)` runs after it.

The cookie is how the web app authenticates: `sendSession` sets it `httpOnly`
(so page scripts cannot read the token) and `SameSite=Lax` (so it is not sent
on a cross-site POST, which is what stops CSRF). The frontend stores nothing and
attaches nothing — `apiFetch` sends `credentials: 'include'` and the browser
does the rest. The header path stays for callers that are not a browser, like
curl and Postman. The web app reaches the API at `/api/*`, proxied by
`next.config.ts`, so its requests are same-origin and need no CORS. Two endpoints revoke a token's `jti` through the denylist in
`src/auth/tokenDenylist.ts` — `POST /auth/logout`, and
`PATCH /companies/me/credentials`, which ends the session its change was made
with. Both revoke one token, not every session the company holds: there is no
per-company token version, so a second device stays signed in until its own
token expires. The denylist lives in `public.revoked_token`, so it survives a
restart and is shared between instances.

There are two login endpoints, and they are mirrors: each turns away exactly
the accounts the other accepts, so a token from either is never a surprise to
the page that asked for it.

| Endpoint                 | ADMIN account                                           | Company account                              |
| ------------------------ | ------------------------------------------------------- | -------------------------------------------- |
| `POST /auth/login`       | `403` "Administrators must use the administrator login" | `200`                                        |
| `POST /auth/admin/login` | `200`                                                   | `403` "This is not an administrator account" |

Both share `verifyCredentials`, so a bad credential answers `401` with the same
message and the same timing either way. Both rejections above are `403` and not
`401` on purpose: the password checked out, so we know who is calling — the
answer is just no. `POST /auth/admin/login` sits on the public `authRoutes`
because `/admin` is guarded by `requireAuth`, and a login route there would
need a token to get a token.

Logout is the same endpoint for both: `POST /auth/logout` revokes whatever
token it is given.

### Administrator: company accounts

`adminRoutes` is guarded once at the router, per the rule above — do not repeat
the middleware per route, and do not register anything above the guard.

| Method  | Path                          | Guard                                         |
| ------- | ----------------------------- | --------------------------------------------- |
| `GET`   | `/admin/companies`            | router: `requireAuth`, `requireRole('admin')` |
| `GET`   | `/admin/companies/:companyId` | same                                          |
| `PATCH` | `/admin/companies/:companyId` | same                                          |

The `PATCH` writes **profile columns only** — the same field set
`PATCH /companies/me` takes — so it reuses `updateCompanyProfileSchema` rather
than declaring a second one. Username, email and password are unreachable here
on purpose: each is a way to take an account over, and the current-password
gate that gates them is one an administrator cannot satisfy for someone else.
The schema is a `strictObject`, so sending one of them is a `400` naming the
key rather than a `200` that quietly ignored half the request.

`companyProfileUpdateData` in `src/lib/companyProfile.ts` is the shared write
shape. Both this endpoint and `updateMyProfile` call it; they differ only in
their `select`, their serializer and their error messages. Add a profile column
to `updateCompanyProfileSchema` and both endpoints get it. Its nested provider
write is an `upsert`: `account_type` is not proof the `provider` row exists —
nothing in the schema enforces that — so a missing one is created rather than
raising `P2025` and reading as a `404` for a company that plainly exists.

`service_term` and `warranty_policy` live on `provider`, so **who may send them
is a different question here**. `PATCH /companies/me` asks `roleGrants` about
the caller's own token; an admin token says nothing about the company being
edited, so this endpoint asks `ownsProviderRow` about the target's
`account_type` instead. A `RECEIVER` or `ADMIN` target owns no `provider` row
and gets a `400` with one `details` entry per offending field — not a `403`,
because the administrator is not the one being refused. The refusal is
per-field in the error response. The request remains atomic, so no fields in
the same body are saved when any provider-only field is rejected.

The target is read before the write, like `updatePortfolio`: an unknown id is a
plain `404` rather than a `P2025` surfacing mid-update, and the same lookup
supplies the `account_type` the check above needs.

The response is the full `CompanyAccountDetail` — what the detail `GET`
returns, ratings included — so the admin UI re-renders without a second fetch.
Note that `company_type` is a set replacement: the request carries the whole
set and omitted tags are deleted, so an edit form must pre-fill all of them.

### Portfolio

`service_portfolio` holds a provider's work-sample links, one row per link,
reached through `listing -> service`. It has no owner column: the company is
three hops away, and `getOwnedPortfolio` in `src/lib/portfolio.ts` walks that
chain in a single nested `select`. Reuse it for anything that touches a
portfolio row — it returns the row, throws `404` when the id is unknown and
`403` when the listing belongs to another company.

`portfolio_id` is a surrogate key, added so a row can be named in a URL; the
table used to be identified by `(listing_id, portfolio_link)`. That pair is
still unique — `@@unique([listing_id, portfolio_link])` — so a listing cannot
carry the same link twice. A surrogate key replaces the natural key as
identity, never as a constraint; dropping the `@@unique` would quietly allow
duplicates that the old composite primary key made impossible.

| Method   | Path                       | Guard                                    |
| -------- | -------------------------- | ---------------------------------------- |
| `PATCH`  | `/portfolios/:portfolioId` | `requireAuth`, `requireRole('provider')` |
| `DELETE` | `/portfolios/:portfolioId` | `requireAuth`, `requireRole('provider')` |

`PATCH` is a partial update — send any subset of `portfolio_name`,
`portfolio_description`, `development_date`, `portfolio_image`,
`portfolio_link` and only those columns change; an empty body is a `400`.
`portfolio_description` is the only nullable one. Returns the full row;
retargeting a link the listing already carries is a `409`. `DELETE` returns
`204` and hard-deletes — nothing references a portfolio row, and a
soft-deleted one would keep its slot in the unique index, blocking that link
from ever being added back. Both
check ownership before any write, and the two failure cases stay distinct:
an id that does not exist is `404`, one that belongs to another company is
`403`. Creating a row (`POST`) is a separate story and is not wired yet.
