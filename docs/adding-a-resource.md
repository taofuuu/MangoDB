# Adding a resource

> **If you change this page, check `docs/ai-brief.md`.** It restates parts of
> this page for chat AIs that cannot follow a link.

How to add a resource so it looks like the rest of the app: the endpoint
first, then the page that uses it. The rules are in
[conventions.md](conventions.md); this page is the order to apply them in, and
the helpers that already do each part.

**The example is made up.** A _bookmark_ — a company saving a listing to come
back to — does not exist and is not planned. It is used here because its
names collide with nothing real, so nobody copies half of it by mistake. Every
helper it calls does exist. For a real resource built this way, read
`job.schema.ts`, `lib/job.ts`, `job.controller.ts` and `job.routes.ts`, and on
the frontend `lib/jobs.ts`, `app/jobs/mine/page.tsx` and `components/jobs/`.

## The order

Work outwards from the database. Each step depends on the one before it.

```
1. schema.prisma → 2. schemas/ → 3. lib/ → 4. controllers/ → 5. routes/
                                                                  ↓
             8. say it exists ← 7. snapshots ← 6. shared type + tests
                    ↓
9. web lib/ → 10. the page → 11. components/ → 12. check it in the browser
```

---

## 1. The table

**Check first that it does not exist.** `listing`, `service`,
`job_requirement`, `proposal` and `project` are all there; usually the task is
adding columns, not a table ([conventions §7](conventions.md#7-what-a-listing-is)).

In `apps/api/prisma/schema.prisma`: a camelCase field, the column with
`@map`, the table with `@@map`, `NOT NULL` on a foreign key the row means
nothing without, and `created_at` on anything listed by time:

```prisma
model Bookmark {
  bookmarkId Int      @id @default(autoincrement()) @map("bookmark_id")
  companyId  Int      @map("company_id")
  listingId  Int      @map("listing_id")
  note       String?  @db.VarChar(500)
  createdAt  DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  company    Company  @relation(fields: [companyId], references: [companyId], onDelete: Cascade)
  listing    Listing  @relation(fields: [listingId], references: [listingId], onDelete: Cascade)

  @@unique([companyId, listingId])
  @@map("bookmark")
}
```

Write the migration with `prisma migrate diff`, exactly as in
[CONTRIBUTING.md](../CONTRIBUTING.md#database), and say in the group chat
before anyone applies it: the database is shared. **Never `prisma migrate
dev`, never `db:pull`, never the Supabase dashboard**
([conventions §14](conventions.md#14-migrations)).

---

## 2. The schema — what a valid request looks like

`src/schemas/bookmark.schema.ts`. One rule per column, shared by every schema
that uses it, and the shared helpers from `common.schema.ts` for the parts
every endpoint has:

```ts
import { z } from 'zod';
import {
    blankToNull,
    int4Id,
    optionalQueryId,
    pageQueryFields,
} from './common.schema';

const bookmarkFields = {
    listingId: int4Id,
    // A cleared box is null: the note is emptied.
    note: z.preprocess(blankToNull, z.string().trim().max(500).nullable()),
} as const;

// strictObject on every body: a misspelled key is a 400, not a 201 without it.
export const createBookmarkSchema = z.strictObject({
    listingId: bookmarkFields.listingId,
    note: bookmarkFields.note.optional(),
});

export const updateBookmarkSchema = z
    .strictObject({ note: bookmarkFields.note })
    .partial()
    .refine((body) => Object.keys(body).length > 0, {
        message: 'Provide at least one field to update',
    });

export const bookmarkIdParamSchema = z.object({ bookmarkId: int4Id });

// GET /bookmarks/mine: the same paging as every list, and one filter.
export const bookmarkListQuerySchema = z.object({
    ...pageQueryFields,
    listingId: optionalQueryId('listingId'),
});
```

- **Every number gets both bounds.** A `.min()` with no `.max()` accepts
  `999999`. `int4Id` has the ceiling of an `Int` column built in.
- **A blank value has one of two meanings.** `blankToUndefined`: not sent
  (`?page=`). `blankToNull`: cleared (an emptied form field).
- **Anything checked against "now" goes in `.refine()`.** A value passed to
  `.max()` is computed once, when the file loads.
- **A rule a PATCH also needs cannot live only in `.refine()`.** `.partial()`
  drops refinements. Export the check and call it on the merged row — see
  `expiryIsOnOrAfterIssue`, or `assertBudgetRange` in `lib/listing.ts`.

---

## 3. The lib — the select, the DTO, the ownership check

`src/lib/bookmark.ts` — kebab-case, the same name as the other three files.

```ts
import type { Bookmark } from '@mangodb/shared';
import type { Prisma } from '../generated/prisma/client';
import { ApiError } from './api-error';
import { prisma } from './prisma';
import { isUniqueViolation } from './prisma-errors';

// The columns a response carries. satisfies makes a field the model does not
// have a compile error instead of a throw on the first request.
export const bookmarkSelect = {
    bookmarkId: true,
    listingId: true,
    note: true,
    createdAt: true,
} as const satisfies Prisma.BookmarkSelect;

type BookmarkRow = {
    bookmarkId: number;
    listingId: number;
    note: string | null;
    createdAt: Date;
};

// The one place a row becomes the wire shape. Every handler goes through it.
export function toBookmark(row: BookmarkRow): Bookmark {
    return { ...row, createdAt: row.createdAt.toISOString() };
}

// A bookmark is private, so another company's is 404, not 403: a 403 would
// confirm the id exists.
export async function assertBookmarkOwned(
    bookmarkId: number,
    companyId: number,
): Promise<void> {
    const bookmark = await prisma.bookmark.findFirst({
        where: { bookmarkId, companyId },
        select: { bookmarkId: true },
    });
    if (!bookmark) throw ApiError.notFound('Bookmark not found');
}

// @@unique([companyId, listingId]): this service is bookmarked already. A 409,
// or null when err is something else; the handler throws what it gets back.
export function bookmarkRepeat(err: unknown): ApiError | null {
    return isUniqueViolation(err)
        ? ApiError.conflict('This service is bookmarked already')
        : null;
}
```

Pick the ownership shape on purpose, and say why in a comment:

| Shape                                          | When                                   |
| ---------------------------------------------- | -------------------------------------- |
| 404 and 403 separate (`assertListingOwned`)    | ids are discoverable anyway            |
| 403 folded into 404 (`assertCertificateOwned`) | ids are not, so a 403 confirms a guess |

Use what exists before writing a helper:

| Need                                        | Helper                                                                          |
| ------------------------------------------- | ------------------------------------------------------------------------------- |
| a service or job the caller owns            | `assertListingOwned(id, 'SERVICE' \| 'JOB', companyId)`                         |
| a listing anyone may read, else 404         | `assertListingVisible(listing, callerId, type)`                                 |
| the company that owns a row                 | `companyBriefSelect` + `toCompanyBrief` (`lib/company-profile.ts`)              |
| a date-only column                          | `fromDateOnly` / `toDateOnly` (`lib/dates.ts`)                                  |
| a keyword search                            | `splitWords` + `containsWord` (`lib/search.ts`)                                 |
| an upload stored with the row               | `saveWithUpload` (`lib/upload.ts`)                                              |
| a write whose row may be gone (P2025 → 404) | `orNotFound(write, message)` (`lib/prisma-errors.ts`)                           |
| a 409 from a unique index                   | a small function like `portfolioLinkConflict`, built on `uniqueViolationFields` |

If a helper would be the same for a service and a job with `'SERVICE'`
swapped for `'JOB'`, it belongs in `lib/listing.ts`, once.

---

## 4. The controller — what happens

`src/controllers/bookmark.controller.ts`:

```ts
// POST /bookmarks. A company may bookmark any service it could open.
export async function createBookmark(
    req: Request,
    res: Response,
): Promise<void> {
    const body = parseBody(createBookmarkSchema, req.body);
    const companyId = req.auth!.companyId;

    // Read before the write, so an unknown or private service is a clean 404.
    const listing = await prisma.listing.findUnique({
        where: {
            listingId: body.listingId,
            listingType: 'SERVICE' satisfies ListingType,
            company: { deletedAt: null },
        },
        select: { listingStatus: true, companyId: true },
    });
    assertListingVisible(listing, companyId, 'SERVICE');

    try {
        const created = await prisma.bookmark.create({
            data: {
                companyId,
                listingId: body.listingId,
                note: body.note ?? null,
            },
            select: bookmarkSelect,
        });
        res.status(201).json(toBookmark(created));
    } catch (err) {
        throw bookmarkRepeat(err) ?? err;
    }
}

// GET /bookmarks/mine. Paged like every list.
export async function listMyBookmarks(
    req: Request,
    res: Response,
): Promise<void> {
    const { page, pageSize, listingId } = parseQuery(
        bookmarkListQuerySchema,
        req.query,
    );
    const where = {
        companyId: req.auth!.companyId,
        ...(listingId && { listingId }),
    };

    const [totalItems, rows] = await prisma.$transaction([
        prisma.bookmark.count({ where }),
        prisma.bookmark.findMany({
            where,
            orderBy: [{ createdAt: 'desc' }, { bookmarkId: 'desc' }],
            ...pageArgs({ page, pageSize }),
            select: bookmarkSelect,
        }),
    ]);

    const body: Paginated<Bookmark> = {
        items: rows.map(toBookmark),
        pagination: toPagination(totalItems, { page, pageSize }),
    };
    res.json(body);
}

// PATCH /bookmarks/:bookmarkId.
export async function updateBookmark(
    req: Request,
    res: Response,
): Promise<void> {
    const { bookmarkId } = parseParams(bookmarkIdParamSchema, req.params);
    const body = parseBody(updateBookmarkSchema, req.body);
    const companyId = req.auth!.companyId;

    await assertBookmarkOwned(bookmarkId, companyId);

    // The owner again in the write: a row deleted in between is a 404.
    const updated = await orNotFound(
        prisma.bookmark.update({
            where: { bookmarkId, companyId },
            data: omitUndefined(body),
            select: bookmarkSelect,
        }),
        'Bookmark not found',
    );
    res.json(toBookmark(updated));
}
```

- `Promise<void>` and `res.json(...)` — **not** `return res.json(...)`.
- `parseParams` before `parseBody`, so a bad id is the error reported. Never a
  hand-written `if (!body.x)`.
- `req.auth!.companyId` is already a number. Never convert `sub` yourself.
- Read before you write, and put the owner in the write's `where` too.
- `throw ApiError.…`, never `throw new Error`. One rule, one status code, one
  wording ([conventions §4](conventions.md#4-status-codes)): reuse the message
  another route already answers with.
- A transaction that a later feature might want with a step left out is a list
  of lib steps — see `acceptProposal` in `proposal.controller.ts`.

---

## 5. The route

`src/routes/bookmark.routes.ts` — paths and guards, no logic:

```ts
export const bookmarkRoutes = Router();

// Company accounts only; admins manage accounts, they do not bookmark.
bookmarkRoutes.post(
    '/',
    requireAuth,
    requireRole('provider', 'receiver'),
    createBookmark,
);
bookmarkRoutes.get(
    '/mine',
    requireAuth,
    requireRole('provider', 'receiver'),
    listMyBookmarks,
);
// Owner-only: owning the bookmark is checked in the handler.
bookmarkRoutes.patch('/:bookmarkId', requireAuth, updateBookmark);
```

- **The role goes on create; ownership guards edit and delete.** Owning a row
  already means the role.
- `requireRole` reads what `requireAuth` set, so it always comes after it.
- Mount it once in `src/routes/index.ts`: `routes.use('/bookmarks', bookmarkRoutes);`

---

## 6. The shared type, the contract and the tests

In `packages/shared/index.ts`:

```ts
export interface Bookmark {
    bookmarkId: number;
    listingId: number;
    note: string | null;
    createdAt: string;
}

export interface CreateBookmarkRequest {
    listingId: number;
    note?: string | null | undefined;
}
```

A list answers `Paginated<Bookmark>` — never a new `BookmarkListResponse`. A
union is derived from a const array ([conventions §6](conventions.md#6-status-vocabulary)).

Then assert each request schema against its type in
`src/schemas/contract.ts`, both directions, so `tsc` fails when they drift:

```ts
type CreateBookmarkInput = z.infer<typeof createBookmarkSchema>;
type _CreateBookmarkMatchesContract = Assert<
    CreateBookmarkInput,
    CreateBookmarkRequest
>;
type _ContractMatchesCreateBookmark = Assert<
    CreateBookmarkRequest,
    CreateBookmarkInput
>;
```

**A unit test** goes beside the controller (`bookmark.controller.test.ts`) for
anything a snapshot cannot see: a transaction that must write nothing when it
refuses, a rollback, a rule that depends on the clock. Copy the shape of
`proposal.controller.test.ts`: replace `lib/prisma` with `mock.module` before
the controller loads, with a fake that answers only the queries this
controller sends. `npm test` runs it, and `npm run verify` runs `npm test`.

---

## 7. The snapshots

Add your calls to `scripts/snapshot-api.sh`: the happy path, and every error
the frontend shows. A name is `<area>-<what>`, or `error-<area>-<what>` for a
rejection — `jobs-close`, `error-portfolios-list-no-filter`:

```bash
api POST /bookmarks -H "$(bearer "$TOKEN_RECEIVER")" \
    -H 'Content-Type: application/json' \
    -d "{\"listingId\":$NEW_SERVICE_ID}" >/dev/null
NEW_BOOKMARK_ID="$(jget bookmarkId)"
SUBS+=(--id "bookmark_id=$NEW_BOOKMARK_ID")

snap bookmarks-mine GET /bookmarks/mine -H "$(bearer "$TOKEN_RECEIVER")"
```

- **A row the run creates is deleted again**, in the `cleanup` trap, in the
  order the foreign keys need.
- **An id rule covers every key the id appears under.** One row can be a
  `jobId` in one response and a `listingId` in another.
- **A date that is "today" is named per snapshot**, like `proposals-accept`
  does, not with a run-wide rule.
- **Never commit while the script runs.** lint-staged stashes files under it.

Run it, read the diff, and commit the new files:

```bash
bash scripts/snapshot-api.sh && git diff snapshots/
```

More: [refactor/phase-0-safety-net.md](refactor/phase-0-safety-net.md) and
[refactor/round-2/phase-0-safety-net.md](refactor/round-2/phase-0-safety-net.md).

---

## 8. Say it exists

`src/routes/` is the endpoint list — there is no separate catalogue. Put the
_why_ in a comment beside the route, then tell the team in the group chat.

---

## 9. The requests — `apps/mangodb/lib/bookmarks.ts`

One file per noun holds every request for it, named after the API: `list…`
for a collection, `get…` for one, then the verb. Reads go through `cachedGet`,
writes through `invalidateAfter` with the prefixes they make stale:

```ts
import type {
    Bookmark,
    CreateBookmarkRequest,
    Paginated,
} from '@mangodb/shared';
import { apiFetch } from './api';
import { cachedGet, invalidateAfter } from './apiCache';

export function listMyBookmarks(
    page: number,
    pageSize: number,
): Promise<Paginated<Bookmark>> {
    const query = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
    });
    const path = `/bookmarks/mine?${query.toString()}`;
    return cachedGet(path, () => apiFetch<Paginated<Bookmark>>(path));
}

export function createBookmark(body: CreateBookmarkRequest): Promise<Bookmark> {
    return invalidateAfter(
        apiFetch<Bookmark>('/bookmarks', {
            method: 'POST',
            body: JSON.stringify(body),
        }),
        '/bookmarks',
    );
}
```

A write that skips `invalidateAfter` leaves the old list on screen for up to
30 seconds. The page size is a constant in `lib/pagination.ts`
(`BOOKMARK_PAGE_SIZE`), not a number in the page.

---

## 10. The page — `apps/mangodb/app/bookmarks/page.tsx`

The URL mirrors the API ([conventions §2.9](conventions.md#29-frontend-routes-mirror-the-api-nouns)).
A page that needs the signed-in company starts with `useMyCompany` and shows
`PageGate` until it is ready; a 401 while loading redirects:

```tsx
'use client';

export default function BookmarksPage() {
    const me = useMyCompany('receiver');
    const [page, setPage] = useState(1);
    const [result, setResult] = useState<Paginated<Bookmark> | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (me.status !== 'ready') return;
        let cancelled = false;
        listMyBookmarks(page, BOOKMARK_PAGE_SIZE)
            .then((data) => {
                if (!cancelled) setResult(data);
            })
            .catch((err: unknown) => {
                if (cancelled) return;
                if (isNotSignedIn(err)) {
                    redirectToUnauthorized();
                    return;
                }
                setError(describeError(err));
            });
        return () => {
            cancelled = true;
        };
    }, [me.status, page]);

    if (me.status !== 'ready') {
        return (
            <PageGate state={me} roleMessage="You need a Receiver account." />
        );
    }

    return (
        <main className="min-h-screen bg-surface">
            <h1 className="type-hd">Bookmarks</h1>
            {error && <p className="type-sm text-danger">{error}</p>}
            {result?.items.length === 0 && (
                <EmptyState title="No bookmarks yet" />
            )}
            {result?.items.map((bookmark) => (
                <BookmarkCard key={bookmark.bookmarkId} bookmark={bookmark} />
            ))}
            <Pagination
                pagination={result?.pagination}
                onPageChange={setPage}
                ariaLabel="Bookmark pages"
            />
        </main>
    );
}
```

An id in the URL (`/bookmarks/[bookmarkId]`) goes through `parseId` first;
`null` is shown as not found.

---

## 11. The components — `apps/mangodb/components/bookmarks/`

- **One default export per file, named after it**: `BookmarkCard.tsx`
  exports `BookmarkCard`. A piece that knows no resource goes in `ui/`
  instead.
- **Reuse before you write.** `ConfirmModal` for "are you sure", with an async
  `onConfirm` that throws so the dialog shows the error; `SuccessModal`,
  `Dropdown`, `SearchBar`, `EmptyState`, `StatusBadge`, `StatusTabs`,
  `CompanyAvatar`, `Input`, `Textarea`, `FieldError`, `Pagination`.
- **Add and edit are one form with a mode**, mounted only while open. Its
  checks live in `lib/validation/bookmark.ts`, worded as the API words them;
  an API failure goes through `toFormErrors` and under the input it names.
- **Dates and money through `lib/`**: `formatDate(bookmark.createdAt)`,
  `formatBaht`, `formatDateOnly`. Never `new Date(day)` or `toLocaleString`.
- **Tokens only**: `bg-surface-white`, `text-ink-soft`, `border-line`, and the
  `type-*` scale, with `!font-[n]` for a different weight.

---

## 12. Check it in the browser

`npm run verify` again, then start both dev servers, sign in as a seeded
`snapshot_` account (`npm run db:seed -w api` creates them), and walk the page:
the list, the empty state, an error, and a signed-out visit, which must land
on `/unauthorized`. The console stays clean.

---

## Checklist

```
[ ] table/columns exist: camelCase + @map, NOT NULL foreign keys, migration via migrate diff, announced
[ ] schemas/: fields shared, strictObject bodies, pageQueryFields, optionalQueryId, blankToNull/blankToUndefined
[ ] lib/: select satisfies Prisma.XSelect, one DTO, ownership check, existing helpers reused
[ ] controller: Promise<void>, parse* first, req.auth!.companyId, owner in the write, ApiError, one wording
[ ] route: role on create, ownership on the rest, mounted once in routes/index.ts
[ ] shared type in packages/shared, Paginated<T> for lists, asserted in schemas/contract.ts
[ ] unit test for what a snapshot cannot see
[ ] snapshot calls added, with cleanup and id rules, the diff read
[ ] web lib/<noun>.ts: cachedGet reads, invalidateAfter writes, page size in lib/pagination
[ ] page: URL mirrors the API, useMyCompany + PageGate, 401 redirects, parseId for ids
[ ] components: in components/<noun>/, existing ui pieces reused, one form with a mode
[ ] dates and money through lib/, tokens and type-* only
[ ] npm run verify passes (format, lint, typecheck, tests), and the page walked in the browser
```
