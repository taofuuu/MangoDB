# Adding a resource

Sprint 2 adds three of these — services, job postings, proposals — written by
different people at the same time. This is the shape to copy, so they arrive
looking like one API instead of three.

The worked example throughout is the **administrator company endpoints**. They
are the reference because they are the only part of the API that already does
every one of these things: `ApiError` throughout, schemas in `schemas/`, DTO
mappers in `lib/`, routes with no logic, and the one paginated endpoint.

```
apps/api/src/schemas/admin-company.schema.ts
apps/api/src/controllers/admin-company.controller.ts
apps/api/src/routes/admin.routes.ts
apps/api/src/lib/adminCompany.ts
```

Read [conventions.md](conventions.md) first. This page is how to apply it; that
page is what the rules are.

---

## The order

Work outwards from the database. Each step depends on the one before it, and
doing them out of order means redoing them.

```
1. schema.prisma   →  2. schemas/  →  3. lib/  →  4. controllers/
                                                        ↓
7. api-guide.html  ←  6. snapshot  ←  5. routes/ + packages/shared
```

---

## 1. The table

If the table exists, you are adding columns. **Check first** — `listing`,
`service`, `job_requirement`, `proposal` and `project` all already exist, and
three Sprint 2 tasks are worded as if they do not. See
[conventions §7](conventions.md#7-what-a-listing-is).

In `apps/api/prisma/schema.prisma`, camelCase the field and `@map` the column:

```prisma
model Service {
  listingId             Int     @id @map("listing_id")
  estimatedPrice        Decimal @map("estimated_price") @db.Decimal(12, 2)
  deliveryDurationDays  Int     @map("delivery_duration_days")

  listing Listing @relation(fields: [listingId], references: [listingId])

  @@map("service")
}
```

Then:

```bash
npx prisma migrate dev --create-only --name add_service_price
```

…to write the migration file **without applying it**, read the SQL it produced,
and apply it with:

```bash
npm run db:migrate -w api
```

> Never plain `prisma migrate dev`, and never the Supabase dashboard. Both
> leave the database different from what is committed, and the next person to
> run `db:migrate` finds out the hard way.

```bash
npm run db:generate -w api
```

---

## 2. The schema — what a valid request looks like

`src/schemas/<resource>.schema.ts`. One definition per column, shared by every
schema that touches it, exactly as `companyFields` does:

```ts
export const serviceFields = {
    estimatedPrice: z.coerce.number().positive().max(99999999.99),
    deliveryDurationDays: z.coerce.number().int().positive().max(3650),
} as const;

export const createServiceSchema = z.object({
    listingTitle: listingFields.listingTitle,
    estimatedPrice: serviceFields.estimatedPrice,
    deliveryDurationDays: serviceFields.deliveryDurationDays,
});

// strictObject for an update body — a plain z.object drops a key it does not
// know, so a typo answers 200 having written nothing.
export const updateServiceSchema = z
    .strictObject(serviceFields)
    .partial()
    .refine((body) => Object.keys(body).length > 0, {
        message: 'Provide at least one field to update',
    });

export const serviceIdParamSchema = z.object({
    // Path and query values arrive as strings, so these need z.coerce.
    serviceId: z.coerce.number().int().positive().max(2147483647),
});
```

Rules that bite here:

- **Every number gets both bounds.** A `.min()` with no `.max()` accepts
  `999999`.
- **No `new Date()` at module scope.** It is evaluated once, at import, so a
  long-running server judges against a stale year. Wrap it in a function.
- **A rule a PATCH also needs cannot live only in `.refine()`.** `.partial()`
  drops refinements, and a partial body has to be merged with the stored row
  first. Export the predicate — see `expiryIsOnOrAfterIssue`.

---

## 3. The lib — the select, the DTO, the shared checks

`src/lib/<resource>.ts`. Three things live here.

**The select.** Name the columns. Without one, a column added later ships to
the browser without anyone deciding to send it.

```ts
export const serviceSelect = {
    listingId: true,
    estimatedPrice: true,
    deliveryDurationDays: true,
    listing: { select: { listingTitle: true, listingStatus: true } },
} as const;
```

**The DTO.** One function that turns a row into the wire shape, typed as the
shared type. Every handler returning this resource goes through it.

```ts
export function toService(row: SelectedService): Service {
    return {
        serviceId: row.listingId,
        estimatedPrice: Number(row.estimatedPrice), // Decimal → number
        deliveryDurationDays: row.deliveryDurationDays,
        listingTitle: row.listing.listingTitle,
    };
}
```

**The ownership check.** Never three lines inlined in a handler, and never
twice.

```ts
export async function assertServiceOwned(
    serviceId: number,
    companyId: number,
): Promise<void> {
    const service = await prisma.service.findUnique({
        where: { listingId: serviceId },
        select: { listing: { select: { companyId: true } } },
    });

    if (!service) throw ApiError.notFound('Service not found');
    if (service.listing.companyId !== companyId) {
        throw ApiError.forbidden('This service belongs to another company');
    }
}
```

There are two right shapes for that last one, and the choice is deliberate:

| Shape                                          | When                                                         |
| ---------------------------------------------- | ------------------------------------------------------------ |
| 404 and 403 separate (`assertPortfolioOwned`)  | The ids are discoverable, so hiding existence buys nothing   |
| 403 folded into 404 (`assertCertificateOwned`) | The ids are not discoverable, so a 403 only confirms a guess |

Whichever you pick, say why in a comment, or the next person picks the other.

---

## 4. The controller — what happens

`src/controllers/<resource>.controller.ts`.

```ts
export async function createService(
    req: Request,
    res: Response,
): Promise<void> {
    const body = parseBody(createServiceSchema, req.body);
    const companyId = req.auth!.companyId;

    const created = await prisma.service.create({
        data: { ...body, listing: { create: { companyId /* … */ } } },
        select: serviceSelect,
    });

    res.status(201).json(toService(created));
}
```

The shape, line by line:

- `Promise<void>`, and `res.json(...)` — **not** `return res.json(...)`.
- `parseBody` / `parseQuery` / `parseParams` from `middleware/validate.ts`. No
  hand-written `if (!body.x)` chains, and no schema declared inline here.
- `req.auth!.companyId` — already a number. Never coerce `sub` yourself.
- Read before you write, so an unknown id is a plain 404 rather than a Prisma
  P2025 surfacing from the middle of an update.
- Params before body: a request with both a bad id and a bad body should report
  the id, or you debug the wrong half.
- `throw ApiError.…` — never `throw new Error`, which is a 500 with no message.
- Every query names a `select`; every response goes through the DTO.

---

## 5. The route, and the shared type

`src/routes/<resource>.routes.ts` — paths and guards, no logic:

```ts
export const serviceRoutes = Router();

serviceRoutes.get('/mine', requireAuth, requireRole('provider'), getMyServices);
serviceRoutes.post('/', requireAuth, requireRole('provider'), createService);
serviceRoutes.patch(
    '/:serviceId',
    requireAuth,
    requireRole('provider'),
    updateService,
);
serviceRoutes.delete(
    '/:serviceId',
    requireAuth,
    requireRole('provider'),
    deleteService,
);
```

Mounted once, in `src/routes/index.ts`:

```ts
routes.use('/services', serviceRoutes);
```

> Guard per route, like `portfolio.routes.ts`, when some routes are public.
> Guard once with `router.use`, like `admin.routes.ts`, when the whole router
> is. A router with a guarded half and an unguarded half is a router someone
> will add a route to on the wrong side of the line.

In `packages/shared/index.ts`, the wire type and any status union:

```ts
export interface Service {
    serviceId: number;
    listingTitle: string;
    estimatedPrice: number;
    deliveryDurationDays: number;
}
```

Then add a line to `src/schemas/contract.ts` so `tsc` checks the Zod schema and
the shared type agree. Nothing else does.

---

## 6. The snapshot

Add your calls to `scripts/snapshot-api.sh` — the happy path plus whatever
error shapes the frontend branches on:

```bash
snap 48-services-mine GET /services/mine -H "$(bearer "$TOKEN_PROVIDER")"
snap 49-services-create POST /services -H "$(bearer "$TOKEN_PROVIDER")" \
    -H 'Content-Type: application/json' \
    -d '{"listingTitle":"Snapshot Probe service","estimatedPrice":5000,"deliveryDurationDays":14}'
```

Two rules, both learned the hard way:

- **Anything you create, delete again — including on failure.** Add it to the
  `cleanup` trap. A row left behind shows up in every later run's diff.
- **Keep the numbering.** New calls take the next free number, or file order
  stops matching call order.

Then run it and commit the new files:

```bash
bash scripts/snapshot-api.sh && git diff snapshots/
```

See [refactor/phase-0-safety-net.md](refactor/phase-0-safety-net.md).

---

## 7. The docs

`docs/api-guide.html` is the page the rest of the team reads. An endpoint that
is not in it is an endpoint someone will write a second time.

---

## The checklist

```
[ ] table/columns exist, camelCase + @map, migration file committed
[ ] schema in schemas/, fields shared, strictObject on the update body
[ ] select + DTO + ownership check in lib/
[ ] controller: Promise<void>, parseBody, req.auth!.companyId, ApiError
[ ] route with guards, mounted once in routes/index.ts
[ ] shared type in packages/shared, asserted in schemas/contract.ts
[ ] snapshot calls added, with cleanup, and the baseline re-recorded
[ ] docs/api-guide.html updated
[ ] npm run verify passes
```
