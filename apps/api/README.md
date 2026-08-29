# MangoDB API

Express 5 + TypeScript. Prisma 7 against Postgres (Supabase), through the
`@prisma/adapter-pg` driver adapter.

```bash
cp .env.example .env   # then fill JWT_SECRET, DATABASE_URL, DIRECT_URL
npm run db:generate    # regenerate Prisma Client (src/generated/prisma)
npm run dev            # tsx watch, http://localhost:4000
npm run typecheck      # tsc --noEmit — must pass before you open a PR
```

## Endpoint conventions

Read this before adding an endpoint. Every endpoint follows the same shape so
the frontend can handle all of them with one code path.

### Layout

| Directory          | Holds                                                     |
| ------------------ | --------------------------------------------------------- |
| `src/routes/`      | Paths and middleware only — no logic                      |
| `src/controllers/` | The work: validate, call Prisma, respond                  |
| `src/middleware/`  | Cross-cutting request handling (auth, errors, validation) |
| `src/lib/`         | Shared building blocks (`ApiError`, the Prisma client)    |
| `src/auth/`        | Token signing/verification, password hashing, denylist    |

`src/app.ts` builds the app without listening so tests can drive it with
supertest; `src/index.ts` is the only place that opens a port.

### Adding an endpoint

1. Write the handler in `src/controllers/<area>.controller.ts`.
2. Wire it in `src/routes/<area>.routes.ts`.
3. Mount the router once in `src/routes/index.ts` if the area is new.

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
  delete or logout. The one exception is `POST /auth/register`, which returns
  two things — `{ company, accessToken }` — because it also logs you in.
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
password: the handler lists the columns it returns with an explicit `select`.

Duplicate usernames and emails currently rely on the database's unique indexes:
the handler catches Prisma's `P2002` and maps it to `409 CONFLICT` with the
offending field in `details`. That block is a placeholder — Fang's
`company-uniqueness.ts` on `feature/username-email-uniqueness` does the
case-insensitive pre-check properly and should replace it once that branch is
rebased onto the current `main`. Note the handler lowercases username and email
before writing, because the unique index is case-sensitive and would otherwise
accept `CodeCrafters` next to `codecrafters`.

### Authentication

`requireAuth` verifies the bearer token, rejects revoked ones, and puts the
claims on `req.auth` (`sub`, `role`, `jti`, `exp`). `requireRole(...roles)`
runs after it. Logout revokes the token's `jti` through the denylist in
`src/auth/tokenDenylist.ts`, which is in-process today — see the note in that
file before deploying more than one instance.
