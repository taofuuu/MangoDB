# MangoDB — everything you need to write code for this project

You are reading this because someone sent you part of the MangoDB codebase and
asked for help. **You may not have the whole repo**, so this file contains the
rules themselves rather than pointing at files you cannot open. Paths below are
written from the repository root, in case you have more of it than this file.

Nine people build this with different AI assistants. That is how the same idea
ended up existing in three or four shapes, and why two refactors (after Sprint
1, and again before Sprint 3) were needed to cut it back to one. Everything
below exists to stop that recurring.

**If something is not in this file and not in the code you were given, say you
don't know.** Do not invent an endpoint, a column, a helper or a colour. A
confident guess is the expensive failure here, not an admission of ignorance.

---

## 1. What the project is

A B2B marketplace. Companies register as a **Provider** (offers services), a
**Receiver** (hires them), or **Both**. There is also an **Admin** account type.

| Part              | Stack                                                   |
| ----------------- | ------------------------------------------------------- |
| `apps/api`        | Express 5 + TypeScript, Prisma 7, PostgreSQL (Supabase) |
| `apps/mangodb`    | Next.js 16 App Router, React 19, Tailwind v4            |
| `packages/shared` | The wire types both sides import                        |

The browser only ever talks to the Next server. `/api/*` is proxied to Express,
so every request is same-origin and the session cookie works with no CORS.

The words, from the database up:

- A **listing** is one row in the `listing` table. It is either a **service**
  (a Provider offers work) or a **job** (a Receiver asks for it). Above the
  database it is always "service" or "job", never "service listing" or "job
  posting".
- A **proposal** is a Provider's offer on a job. Its **sender** is the company
  that wrote it, its **recipient** the company that owns the job, and it
  points at the job by `listingId`.
- Accepting a proposal creates a **project**. Projects, quotations and reviews
  are Sprint 3's.

---

## 2. Naming — the rule that breaks most often

**snake_case stops at the database.** Nothing above it uses snake_case.

```
DB column        company_name        (snake_case, only here)
Prisma field     companyName         @map("company_name")
API response     companyName
Shared type      companyName
React prop       companyName
```

Assistants get this wrong constantly, because most API tutorials use snake_case
and because this codebase _used_ to. If you see `profile.company_name` in
something you are asked to extend, it is old code — write `companyName`.

Words are spelled out: `categoryId`, `categoryName`, `projectId`, not `catId`
or `projId`. A status field is named after its row: `listingStatus`,
`proposalStatus`, `projectStatus`. The company that owns something is always
`company: CompanyBrief` (`companyId`, `companyName`, `companyPhoto`).

Names also flow one direction. Rename with this arrow or you rename twice:

```
DB column → backend DTO → shared type → frontend lib → component prop → UI text
```

---

## 3. The API shape

Every endpoint is built from the same four parts. Keep them separate:

| Part       | Lives in                                        | Holds                                          |
| ---------- | ----------------------------------------------- | ---------------------------------------------- |
| Schema     | `apps/api/src/schemas/<area>.schema.ts`         | Zod request validation                         |
| Lib        | `apps/api/src/lib/<area>.ts`                    | The `select`, the DTO mapper, ownership checks |
| Controller | `apps/api/src/controllers/<area>.controller.ts` | The work                                       |
| Route      | `apps/api/src/routes/<area>.routes.ts`          | Path and guards, **no logic**                  |

### Responses

| Answering with         | Body                              |
| ---------------------- | --------------------------------- |
| One resource           | the bare object                   |
| A collection           | a bare array                      |
| A paginated collection | `{ items, pagination }`           |
| Nothing                | no body — `res.status(204).end()` |

Never `{ message, resource }`. The status code already says it worked.
`pagination` is `{ page, pageSize, totalItems, totalPages }`.

### Status codes

| Code | When                                                         |
| ---- | ------------------------------------------------------------ |
| 200  | read, or a write that answers with the resource              |
| 201  | created — answer with the new resource                       |
| 204  | done, nothing to say                                         |
| 400  | malformed, or a rule about the body was broken               |
| 401  | not signed in, or the credential was wrong                   |
| 403  | signed in, but not allowed                                   |
| 404  | no such row, or the caller has no business knowing it exists |
| 409  | unique constraint, or a state conflict                       |
| 429  | too many failed logins — only the login limit sends it       |

401 and 403 must stay distinct: 401 is _who are you_, 403 is _I know who you
are, and no_.

### The error envelope — one shape, everywhere

```json
{
    "error": {
        "code": "VALIDATION_FAILED",
        "message": "Request body is invalid",
        "details": [{ "field": "email", "message": "Invalid email address" }]
    }
}
```

Produced by `ApiError` and a shared error handler. In a controller:

```ts
throw ApiError.badRequest('Provide at least one field to update');
// also: validationFailed, unauthorized, forbidden, notFound, conflict,
// tooManyRequests
```

**Never `throw new Error(...)` on a request path** — that is a 500 with no
message.

### Helpers that already exist — use them

| Need                                | Helper                                                                         |
| ----------------------------------- | ------------------------------------------------------------------------------ |
| Paging a list                       | `pageQueryFields` in the schema, `pageArgs` + `toPagination` in the controller |
| An id in a query string             | `queryId(name)`, `optionalQueryId(name)`                                       |
| A cleared field / a param not sent  | `blankToNull` / `blankToUndefined`                                             |
| "This listing is yours, or 403/404" | `assertListingOwned(id, type, companyId)`                                      |
| A write that may hit a missing row  | `orNotFound(write, message)` turns P2025 into a 404                            |
| Upload a file, write, roll back     | `saveWithUpload(...)`                                                          |
| Keyword search                      | `splitWords(q)`, `containsWord(word)`, `escapeLike`                            |
| A date-only column                  | `toDateOnly` / `fromDateOnly`                                                  |

Every `select` constant is `as const satisfies Prisma.<Model>Select`, so a
field that does not exist fails `tsc` instead of failing at runtime.

### Controller shape

```ts
export async function updateThing(req: Request, res: Response): Promise<void> {
    const { thingId } = parseParams(thingIdParamSchema, req.params);
    const body = parseBody(updateThingSchema, req.body);
    const companyId = req.auth!.companyId; // already a number

    const existing = await prisma.thing.findFirst({
        where: { thingId, companyId },
        select: thingSelect,
    });
    if (!existing) throw ApiError.notFound('Thing not found');

    const updated = await prisma.thing.update({
        where: { thingId },
        data: body,
        select: thingSelect,
    });
    res.json(toThing(updated));
}
```

- `Promise<void>`, and `res.json(...)` — not `return res.json(...)`
- `parseBody` / `parseParams` / `parseQuery`, never hand-written `if (!body.x)`
- Read before you write, so an unknown id is a clean 404
- Every query names a `select`; every response goes through the DTO
- Use `strictObject` for update bodies, so a typo is a 400 rather than a 200
  that wrote nothing

---

## 4. The frontend

### Calling the API — one way only

```ts
import {
    apiFetch,
    describeError,
    isNotSignedIn,
    NOT_SIGNED_IN,
} from '@/lib/api';

const data = await apiFetch<Thing>('/things/mine'); // GET
await apiFetch<Thing>('/things', { method: 'POST', body: JSON.stringify(x) });
await apiFetch<Thing>('/things/1', { method: 'PATCH', body: formData }); // multipart
```

Requests live in `lib/<area>.ts`. Reads use `cachedGet(path, () => apiFetch(path))`;
writes use `invalidateAfter(apiFetch(...), '/prefix')` so the reads they change
are dropped. A write that calls `apiFetch` directly leaves stale data on screen
for up to 30s.

`apiFetch` throws `ApiRequestError` with `.status`, `.code` and `.details`.
Do not write your own fetch wrapper, your own 401 check, or your own
"could not reach the server" message — all three exist:

```ts
catch (err) {
    if (isNotSignedIn(err)) { redirectToUnauthorized(); return; }
    setLoadError(describeError(err));
}
```

A page that loads data redirects to `/unauthorized` when `isNotSignedIn(err)`,
renders the error when it is anything else, or renders a neutral surface gate
while the data is loading.

A page that needs the signed-in company does not call `getMyProfile` itself:

```tsx
const me = useMyCompany('provider'); // or 'receiver', or no role
if (me.status !== 'ready') {
    return <PageGate state={me} roleMessage="You need a Provider account …" />;
}
// me.company is the signed-in company from here on
```

### Pages and where their pieces live

| Page                                   | Route                                                                                 |
| -------------------------------------- | ------------------------------------------------------------------------------------- |
| Your own profile                       | `/profile/view`, `/profile/edit`                                                      |
| Another company                        | `/companies/[companyId]` and `…/services`, `…/jobs`, `…/portfolios`, `…/certificates` |
| Jobs: search, yours, new, edit         | `/jobs`, `/jobs/mine`, `/jobs/create`, `/jobs/[jobId]/edit`                           |
| The proposals sent to one of your jobs | `/jobs/[jobId]/proposals`                                                             |
| The proposals you sent                 | `/proposals`                                                                          |
| Services: search, yours, new, edit     | `/services`, `/services/mine`, `/services/create`, `/services/[serviceId]/edit`       |

An id from the URL goes through `parseId` (from `@/lib/api`); `null` is shown
as not found.

| Need                         | From                                                     |
| ---------------------------- | -------------------------------------------------------- |
| A date column (`2026-09-01`) | `formatDateOnly` in `lib/dates` — never `new Date(day)`  |
| A timestamp                  | `formatDate`, `formatDateTime` in `lib/dates`            |
| An amount, a budget range    | `formatBaht`, `formatBudgetRange` in `lib/money`         |
| A page size                  | the constants in `lib/pagination`                        |
| A form rule the API also has | `lib/validation/<schema>.ts`, worded as the API words it |
| The category list for a form | `useCategories()` in `lib/useCategories`                 |
| A page of jobs with controls | `useJobList({ view })` in `lib/useJobList`               |

Components live in one folder per API noun (`components/jobs`,
`components/services`, …); `components/ui` holds only pieces that know no
resource. One default export per file, named after the file.

### Errors belong to the field they name

Not a banner at the top, not a line beside the Save button. `toFormErrors(err,
FIELD_MAP)` splits an API failure into `{ fields, message }` — `fields` go under
their inputs via the shared `FieldError` component, and `message` is the
leftover that belongs to no field.

### Typography — never Tailwind's own sizes

| Use                  | Not        |
| -------------------- | ---------- |
| `type-hd` (36px/700) | `text-4xl` |
| `type-lg` (24px/600) | `text-2xl` |
| `type-md` (18px/500) | `text-lg`  |
| `type-sm` (14px/400) | `text-sm`  |
| `type-xs` (12px/400) | `text-xs`  |

A `type-*` class sets its own weight and sits outside Tailwind's layers, so it
beats `font-semibold` beside it. Write the weight as `!font-[600]`.

### Colour — never a hex literal

Every colour is a token. Use as `bg-`, `text-` or `border-`:

```
brand  brand-dark  brand-light  brand-tint  brand-mist  brand-darker  brand-deep
danger  danger-hover  danger-deep  danger-tint  danger-wash
accent  accent-tint   orange   role-provider
surface  surface-white
ink  ink-soft  ink-placeholder
line  fill-muted  fill-subtle
```

Radii: `rounded-input` (4px), `rounded-button` (12px), `rounded-status` (20px),
`rounded-popup` (30px).

If none fits, ask whether the design needs a new colour — usually an existing
one is close enough. Four danger reds became one and nineteen greys became five
in the refactor; do not start that over. Tailwind's own palette (`gray-500`,
`slate-700`, `bg-white`) is a colour literal too. Greys go by role: headings
`ink`, helper lines `ink-soft`, placeholders and dates `ink-placeholder`,
borders `line`, light fills `fill-subtle`.

### Sizing

Figma is designed against a fixed 1920×1080, so px converts to `vw`/`vh`:
`w-[12.66vw]`, `h-[4.89vh]`. Keep a `min-h`/`min-w` on anything that must stay
tappable.

### Components that already exist — do not write a second one

| Need                      | Component                                                      |
| ------------------------- | -------------------------------------------------------------- |
| A modal                   | `ModalShell` — Escape, backdrop click, scroll lock, focus trap |
| "Are you sure?"           | `ConfirmModal` — async `onConfirm`, shows its error            |
| "It worked"               | `SuccessModal`                                                 |
| A pick-one box            | `Dropdown` — keyboard, outside click, Escape                   |
| A keyword box             | `SearchBar` — owns the 300 ms wait and the clear button        |
| A pick-many filter        | `FilterGroup` — chosen values as tags, a + for the rest        |
| A list with nothing in it | `EmptyState`                                                   |
| A status pill / filter    | `StatusBadge` (tone), `StatusTabs`                             |
| A company's picture       | `CompanyAvatar` — guards the host, falls back to initials      |
| One field's error         | `FieldError`                                                   |
| An image at full size     | `ImageModal`                                                   |
| Provider/Receiver chips   | `RoleTags`                                                     |
| A chip                    | `Tag`                                                          |
| A button                  | `Button`                                                       |
| Paginated list controls   | `Pagination` — count, page state and Previous/Next buttons     |
| A file picker             | `FileUpload` — PNG/JPEG/WebP, 5MB                              |
| Labelled input / textarea | `Input`, `Textarea` — both take an `error` prop                |
| A password box            | `PasswordInput` — `Input` with a show/hide eye                 |

An add form and an edit form for the same thing are one component with a mode
(`PortfolioForm`, `CertificateForm`, `ServiceForm`, `JobForm`), mounted only
while open.

A form keeps its values, checks and save in a hook beside it (`JobForm.tsx`
next to `useJobForm.ts`), so the component is mostly JSX. Copy `useJobForm`
for a new form:

```tsx
const { values, setField, errors, formError, isSaving, handleSubmit } =
    useJobForm(initialJob);

<Input
    value={values.title}
    onChange={(value) => setField('title', value)}
    error={errors.title}
/>;
```

- One `values` object, not one `useState` per field. `setField` also clears
  that field's error.
- The hook checks the `lib/validation` rules, sends the request, and puts an
  API failure under its fields with `toFormErrors`. It also does what comes
  after a save: `useJobForm` navigates, and a modal form's hook calls its
  `onSave` and `onClose`.
- The component keeps only what the screen shows, such as which modal is open.

Seven hand-rolled modal shells existed before `ModalShell`, and four of them
ignored the Escape key. That is the pattern to avoid.

### Images

- `next/image`, not `<img>`.
- `fill` **always** needs `sizes`, or the browser fetches the largest candidate.
- A URL from the database goes through a host guard first. Handing `next/image`
  a host that is not in `remotePatterns` **throws mid-render and kills the
  page** — one bad row takes down the whole view.

### A read-only page uses no form controls

A `readOnly` textarea still takes focus, still draws an input border, and still
reaches a screen reader as "textbox". Display values as a label and a `<p>`.

---

## 5. The shapes assistants actually produce here — and the fix

Every row has really happened on this codebase.

| Wrong                                                  | Right                               |
| ------------------------------------------------------ | ----------------------------------- |
| `profile.company_name`                                 | `profile.companyName`               |
| `className="text-sm"`                                  | `className="type-sm"`               |
| `bg-[#497B93]`                                         | `bg-brand`                          |
| `setError('no-token')`                                 | `setLoadError(NOT_SIGNED_IN)`       |
| `err instanceof ApiRequestError && err.status === 401` | `isNotSignedIn(err)`                |
| Hand-written "Could not reach the server"              | `describeError(err)`                |
| `<textarea readOnly value={x} />` to display a value   | a label and a `<p>`                 |
| `<img src={row.imageUrl} />`                           | host-guard, then `next/image`       |
| `<Image fill />` with no `sizes`                       | always pass `sizes`                 |
| A new modal wrapper                                    | `ModalShell`                        |
| Error text beside the submit button                    | `FieldError` under the input        |
| `throw new Error('...')` in a controller               | `throw ApiError.badRequest('...')`  |
| `{ message: 'Created', thing }`                        | the bare `thing`, with 201          |
| `/job-postings`, `JobPosting`, `jobPostingId`          | `/jobs`, `Job`, `jobId`             |
| `catId`, `projId`, `provider` on a proposal            | `categoryId`, `projectId`, `sender` |
| `new Date(job.deadline).toLocaleDateString()`          | `formatDateOnly(job.deadline)`      |
| `` `฿${n.toLocaleString()}` ``                         | `formatBaht(n)`                     |
| `getMyProfile()` and a role check in a page            | `useMyCompany(role)` + `PageGate`   |
| `type-sm font-semibold`                                | `type-sm !font-[600]`               |
| `text-gray-500`, `bg-white`                            | `text-ink-soft`, `bg-surface-white` |
| `alert(describeError(err))` after a confirm            | throw it; `ConfirmModal` shows it   |
| A `useState` per form field, submit in the component   | a `use<Thing>Form` hook beside it   |

---

## 6. Things that do not exist

Saying "that isn't built" is a useful answer. Inventing it is not.

- `/forgot-password` — no route and no story; the login form no longer links it
- `ProjectTimeline` — real layout, hardcoded mock data, no API
- Company search filters beyond its keyword do not exist. `GET /companies`
  supports `q`, `orderBy=nameAsc|nameDesc`, `page`, and `pageSize`.
- Job search filters beyond keyword and category. `GET /jobs` takes `q`,
  `category`, `companyId`, `status` and paging. The budget, deadline and order
  controls on `/jobs` send nothing yet.
- A delivery duration on a service. Its price is the listing's
  `minBudget`/`maxBudget` range, the same columns a job uses.
- Projects, quotations and reviews beyond the project row that accepting a
  proposal creates — Sprint 3 builds them.

---

## 7. Before you hand code back

- It must pass `npm run verify` — Prettier, ESLint, `tsc --noEmit` and the
  unit tests (`npm test`, Node's own runner). Node 22 or newer.
- 4-space indent, single quotes, semicolons, trailing commas (Prettier decides)
- Do not claim something works because the code looks right. Say what you
  verified and what you did not.
- If you changed an API response shape, say so — there is a recorded snapshot
  baseline (`bash scripts/snapshot-api.sh`, then `git diff snapshots/`) that
  has to be re-recorded.
- Migrations run against a database nine people share. Never
  `prisma migrate dev`, never the Supabase dashboard. Flag that a migration is
  needed rather than assuming it can just be applied.

---

## 8. If you can open files

Everything above is the whole rule set, so a chat window with a zip needs
nothing else. If you _do_ have the repo, these hold the detail this file
summarises — read them rather than guessing, and treat them as the authority
where they are more specific:

| File                            | What it is                                                               |
| ------------------------------- | ------------------------------------------------------------------------ |
| `packages/shared/index.ts`      | Every wire type. The answer to "what is this field called"               |
| `docs/conventions.md`           | The rules in full, 16 sections. Wins over this file on any disagreement  |
| `docs/adding-a-resource.md`     | Adding an endpoint, step by step, with a checklist                       |
| `apps/mangodb/app/globals.css`  | The colour tokens and type scale, with a note on why each exists         |
| `apps/api/prisma/schema.prisma` | The real columns                                                         |
| `apps/api/src/routes/`          | Whether an endpoint exists at all                                        |
| `docs/refactor/README.md`       | Why the codebase looks like this; round 2 is in `docs/refactor/round-2/` |

---

## 9. Commit messages, if you are asked for one

`type(scope): lowercase summary` — e.g. `feat(web): the portfolio card opens
its link`. Types: `feat` `fix` `refactor` `style` `perf` `docs` `test` `chore`.
Scopes: `web` `api` `shared` `scripts` `snapshots`.

No AI attribution — no `Co-Authored-By`, no "Generated with" line.
