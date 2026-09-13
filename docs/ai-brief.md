# MangoDB — everything you need to write code for this project

You are reading this because someone sent you part of the MangoDB codebase and
asked for help. **You may not have the whole repo**, so this file contains the
rules themselves rather than pointing at files you cannot open. Paths below are
written from the repository root, in case you have more of it than this file.

Nine people build this with different AI assistants. That is how the same idea
ended up existing in three or four shapes and why a 62-commit refactor was
needed to cut it back to one. Everything below exists to stop that recurring.

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
// also: validationFailed, unauthorized, forbidden, notFound, conflict
```

**Never `throw new Error(...)` on a request path** — that is a 500 with no
message.

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

`apiFetch` throws `ApiRequestError` with `.status`, `.code` and `.details`.
Do not write your own fetch wrapper, your own 401 check, or your own
"could not reach the server" message — all three exist:

```ts
catch (err) {
    if (isNotSignedIn(err)) { setLoadError(NOT_SIGNED_IN); return; }
    setLoadError(describeError(err));
}
```

A page that loads data shows one of three things: the sign-in prompt when
`loadError === NOT_SIGNED_IN`, the error when it is anything else, or "Loading…"
while the data is null.

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

### Colour — never a hex literal

Every colour is a token. Use as `bg-`, `text-` or `border-`:

```
brand  brand-dark  brand-light  brand-tint  brand-mist  brand-darker  brand-deep
danger  danger-hover  danger-deep  danger-tint  danger-wash
accent  accent-tint   orange   role-provider
surface  surface-white
ink  ink-soft  ink-placeholder
line  fill-muted
```

Radii: `rounded-input` (4px), `rounded-button` (12px), `rounded-status` (20px),
`rounded-popup` (30px).

If none fits, ask whether the design needs a new colour — usually an existing
one is close enough. Four danger reds became one and nineteen greys became five
in the refactor; do not start that over.

### Sizing

Figma is designed against a fixed 1920×1080, so px converts to `vw`/`vh`:
`w-[12.66vw]`, `h-[4.89vh]`. Keep a `min-h`/`min-w` on anything that must stay
tappable.

### Components that already exist — do not write a second one

| Need                      | Component                                                      |
| ------------------------- | -------------------------------------------------------------- |
| A modal                   | `ModalShell` — Escape, backdrop click, scroll lock, focus trap |
| One field's error         | `FieldError`                                                   |
| An image at full size     | `ImageModal`                                                   |
| Provider/Receiver chips   | `RoleTags`                                                     |
| A chip                    | `Tag`                                                          |
| A button                  | `Button`                                                       |
| A file picker             | `FileUpload` — PNG/JPEG/WebP, 5MB                              |
| Labelled input / textarea | `Input`, `Textarea` — both take an `error` prop                |

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

| Wrong                                                  | Right                              |
| ------------------------------------------------------ | ---------------------------------- |
| `profile.company_name`                                 | `profile.companyName`              |
| `className="text-sm"`                                  | `className="type-sm"`              |
| `bg-[#497B93]`                                         | `bg-brand`                         |
| `setError('no-token')`                                 | `setLoadError(NOT_SIGNED_IN)`      |
| `err instanceof ApiRequestError && err.status === 401` | `isNotSignedIn(err)`               |
| Hand-written "Could not reach the server"              | `describeError(err)`               |
| `<textarea readOnly value={x} />` to display a value   | a label and a `<p>`                |
| `<img src={row.imageUrl} />`                           | host-guard, then `next/image`      |
| `<Image fill />` with no `sizes`                       | always pass `sizes`                |
| A new modal wrapper                                    | `ModalShell`                       |
| Error text beside the submit button                    | `FieldError` under the input       |
| `throw new Error('...')` in a controller               | `throw ApiError.badRequest('...')` |
| `{ message: 'Created', thing }`                        | the bare `thing`, with 201         |

---

## 6. Things that do not exist

Saying "that isn't built" is a useful answer. Inventing it is not.

- `/forgot-password` — linked from the login form, no route behind it
- `ServicesSection`, `ProjectTimeline`, `JobListing` — real layout, hardcoded
  mock data, no API
- Provider search — undecided
- Several Sprint 2 columns are not in the schema yet

---

## 7. Before you hand code back

- It must pass `npm run verify` — Prettier, ESLint, `tsc --noEmit`
- 4-space indent, single quotes, semicolons, trailing commas (Prettier decides)
- Do not claim something works because the code looks right. Say what you
  verified and what you did not.
- If you changed an API response shape, say so — there is a recorded snapshot
  baseline that has to be re-recorded.
- Migrations run against a database nine people share. Never bare
  `prisma migrate dev`, never the Supabase dashboard. Flag that a migration is
  needed rather than assuming it can just be applied.

---

## 8. If you can open files

Everything above is the whole rule set, so a chat window with a zip needs
nothing else. If you _do_ have the repo, these hold the detail this file
summarises — read them rather than guessing, and treat them as the authority
where they are more specific:

| File                            | What it is                                                              |
| ------------------------------- | ----------------------------------------------------------------------- |
| `packages/shared/index.ts`      | Every wire type. The answer to "what is this field called"              |
| `docs/conventions.md`           | The rules in full, 15 sections. Wins over this file on any disagreement |
| `docs/adding-a-resource.md`     | Adding an endpoint, step by step, with a checklist                      |
| `apps/mangodb/app/globals.css`  | The colour tokens and type scale, with a note on why each exists        |
| `apps/api/prisma/schema.prisma` | The real columns                                                        |
| `apps/api/src/routes/`          | Whether an endpoint exists at all                                       |
| `docs/refactor/README.md`       | Why the codebase looks like this                                        |

---

## 9. Commit messages, if you are asked for one

`type(scope): lowercase summary` — e.g. `feat(web): the portfolio card opens
its link`. Types: `feat` `fix` `refactor` `style` `perf` `docs` `test` `chore`.
Scopes: `web` `api` `shared` `scripts` `snapshots`.

No AI attribution — no `Co-Authored-By`, no "Generated with" line.
