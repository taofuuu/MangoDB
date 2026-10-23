# apps/mangodb — the web app

Next.js 16 (App Router), React 19 and Tailwind v4. The rules for writing code
here are in [`docs/conventions.md`](../../docs/conventions.md) (§16 is this
app's layout) and, shorter, in [`docs/ai-brief.md`](../../docs/ai-brief.md).
This page is how to run it and where things are.

## Run it

Node 22 or newer. From the repository root:

```bash
npm install
cp apps/mangodb/.env.example apps/mangodb/.env
npm run dev -w api
npm run dev -w mangodb
```

The app is on [http://localhost:3000](http://localhost:3000). Pages that read
or write data need the API running on port 4000 (the second command).

Sign in at [`/login`](http://localhost:3000/login), or
[`/admin/login`](http://localhost:3000/admin/login) for an administrator.
`npm run db:seed -w api` creates the `snapshot_` accounts you can use, and the
`demo_` ones, which have one project in every status to build project screens
against. The 20
original seeded companies cannot sign in: their `password` column holds a
plain string, not a hash.

## Check it

```bash
npm run verify          # format, lint, typecheck and unit tests, both apps
npm test -w mangodb     # only this app's unit tests (lib/**/*.test.ts)
npm run build -w mangodb
```

CI runs `verify` and `build` on every pull request.

## Talking to the API

**The browser never calls the API directly.** `next.config.ts` rewrites
`/api/*` to the API server, so every request is same-origin. That lets the
session cookie work with no CORS, and keeps working when the two halves are
deployed to different hosts. The API's address is `API_URL`, a server-side
variable rather than `NEXT_PUBLIC_*`, because only the Next server needs it.

**The session is an httpOnly cookie, and nothing here stores it.**
`POST /auth/login` sets it and the browser carries it. There is nothing in
`localStorage` and no token to attach. JavaScript cannot read the cookie,
which is the point: an injected script cannot steal a session it cannot see.
`lib/session.ts` has `login`, `adminLogin`, `register`, `logout` and
`redirectToUnauthorized`.

**Every endpoint has a function in `lib/<noun>.ts`** (`jobs.ts`,
`services.ts`, `proposals.ts`, …). Reads go through `cachedGet`, writes through
`invalidateAfter`. `lib/api.ts` is the client underneath: `apiFetch`, and the
`ApiRequestError` it throws, with `describeError(err)` for the sentence to
show and `isNotSignedIn(err)` for the redirect.

## Where things are

| Folder               | Holds                                                                                    |
| -------------------- | ---------------------------------------------------------------------------------------- |
| `app/<route>/`       | One page per URL. URLs mirror the API: `/jobs/[jobId]/proposals`                         |
| `components/<noun>/` | One folder per API noun: `jobs`, `services`, `proposals`, …                              |
| `components/ui/`     | Pieces that know no resource: `ModalShell`, `Dropdown`, …                                |
| `lib/`               | Requests, and the helpers: `dates`, `money`, `pagination`, `validation/`, `useMyCompany` |

## Styling

Colours are tokens declared in `app/globals.css` (`bg-brand`, `text-ink`,
`border-line`), never hex values or Tailwind's own palette. Sizes are the
`type-hd` to `type-xs` scale, not Tailwind's `text-*`. Figma is drawn at
1920×1080, so a pixel size becomes `vw`/`vh` against that frame.

Native scrollbars are styled once, globally, in `app/globals.css`; do not add
a page-specific scrollbar class.
