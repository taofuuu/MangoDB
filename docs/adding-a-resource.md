# Adding a resource

> **If you change this page, check `docs/ai-brief.md`.** It restates parts of
> this page for chat AIs that cannot follow a link.

How to add an endpoint so it looks like the rest of the API. The rules are in
[conventions.md](conventions.md); this page is the order to apply them in.

**Worked example:** the admin company endpoints. They use every piece below.

```
apps/api/src/schemas/admin-company.schema.ts
apps/api/src/controllers/admin-company.controller.ts
apps/api/src/routes/admin.routes.ts
apps/api/src/lib/adminCompany.ts
```

## The order

Work outwards from the database. Each step depends on the one before it.

```
1. schema.prisma → 2. schemas/ → 3. lib/ → 4. controllers/
                                                ↓
                   6. snapshot ← 5. routes/ + packages/shared
```

---

## 1. The table

**Check first that it does not exist.** `listing`, `service`,
`job_requirement`, `proposal` and `project` are all there — usually you are
adding columns, not a table ([conventions §7](conventions.md#7-what-a-listing-is)).

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

Then write and apply the migration as in
[CONTRIBUTING.md](../CONTRIBUTING.md#database). Never `prisma migrate dev`.

---

## 2. The schema — what a valid request looks like

`src/schemas/<resource>.schema.ts`. One definition per column, shared by every
schema that uses it, like `companyFields`:

```ts
export const serviceFields = {
    estimatedPrice: z.coerce.number().positive().max(99999999.99),
    deliveryDurationDays: z.coerce.number().int().positive().max(3650),
} as const;

export const createServiceSchema = z.object(serviceFields);

// strictObject: a plain z.object drops unknown keys, so a typo answers 200
// having written nothing.
export const updateServiceSchema = z
    .strictObject(serviceFields)
    .partial()
    .refine((body) => Object.keys(body).length > 0, {
        message: 'Provide at least one field to update',
    });

export const serviceIdParamSchema = z.object({
    // Path and query values arrive as strings, so z.coerce.
    serviceId: z.coerce.number().int().positive().max(2147483647),
});
```

- **Every number gets both bounds.** A `.min()` with no `.max()` accepts
  `999999`.
- **No `new Date()` at module scope.** It runs once, at import. Wrap it in a
  function.
- **A rule a PATCH also needs cannot live only in `.refine()`.** `.partial()`
  drops refinements. Export the check instead — see `expiryIsOnOrAfterIssue`.

---

## 3. The lib — the select, the DTO, the ownership check

`src/lib/<resource>.ts`.

**The select** names the columns, so a new column never ships by accident:

```ts
export const serviceSelect = {
    listingId: true,
    estimatedPrice: true,
    deliveryDurationDays: true,
    listing: { select: { listingTitle: true, listingStatus: true } },
} as const;
```

**The DTO** turns a row into the wire shape. Every handler goes through it:

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

**The ownership check** lives here once, never inlined in a handler:

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

Pick one of two shapes, and say why in a comment:

| Shape                                          | When                                   |
| ---------------------------------------------- | -------------------------------------- |
| 404 and 403 separate (`assertPortfolioOwned`)  | ids are discoverable anyway            |
| 403 folded into 404 (`assertCertificateOwned`) | ids are not, so a 403 confirms a guess |

---

## 4. The controller — what happens

`src/controllers/<resource>.controller.ts`:

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

- `Promise<void>` and `res.json(...)` — **not** `return res.json(...)`.
- `parseBody` / `parseQuery` / `parseParams` — no hand-written `if (!body.x)`.
- `req.auth!.companyId` is already a number. Never convert `sub` yourself.
- Read before you write, so an unknown id is a clean 404.
- Parse params before the body, so a bad id is the error reported.
- `throw ApiError.…` — never `throw new Error`.

---

## 5. The route and the shared type

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
```

Mount it once in `src/routes/index.ts`:

```ts
routes.use('/services', serviceRoutes);
```

> Some routes public → guard per route, like `portfolio.routes.ts`. Whole
> router private → guard once with `router.use`, like `admin.routes.ts`.

In `packages/shared/index.ts`, add the wire type:

```ts
export interface Service {
    serviceId: number;
    listingTitle: string;
    estimatedPrice: number;
    deliveryDurationDays: number;
}
```

Then add a line to `src/schemas/contract.ts`, so `tsc` fails if the Zod schema
and the shared type disagree.

---

## 6. The snapshot

Add your calls to `scripts/snapshot-api.sh` — the happy path, plus any error
the frontend branches on. `NN` is the next free number:

```bash
snap NN-services-mine GET /services/mine -H "$(bearer "$TOKEN_PROVIDER")"
```

- **Delete anything you create**, in the `cleanup` trap, so it runs on failure
  too.
- **Keep the numbering in call order.**

Run it and commit the new files:

```bash
bash scripts/snapshot-api.sh && git diff snapshots/
```

More: [refactor/phase-0-safety-net.md](refactor/phase-0-safety-net.md).

---

## 7. Say it exists

`src/routes/` is the endpoint list — there is no separate catalogue. Put the
_why_ in a comment next to the route, then tell the team in the group chat.

---

## Checklist

```
[ ] table/columns exist, camelCase + @map, migration file committed
[ ] schema in schemas/, fields shared, strictObject on the update body
[ ] select + DTO + ownership check in lib/
[ ] controller: Promise<void>, parseBody, req.auth!.companyId, ApiError
[ ] route with guards, mounted once in routes/index.ts
[ ] shared type in packages/shared, asserted in schemas/contract.ts
[ ] snapshot calls added, with cleanup, and the baseline re-recorded
[ ] npm run verify passes
```
