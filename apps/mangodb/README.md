This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Talking to the API

Pages that read or write data need `apps/api` running on port 4000.

**The browser never calls the API directly.** `next.config.ts` rewrites
`/api/*` to the API server, so every request the browser makes is same-origin.
That is what lets the session cookie work with no CORS involved, and keeps it
working when the two halves are deployed to different hosts. The API's address
is `API_URL` — a server-side variable, not `NEXT_PUBLIC_*`, because only the
Next server needs to know it. See `.env.example`.

### The session is a cookie, and nothing here stores it

`POST /auth/login` sets an httpOnly cookie on its response and the browser
carries it from there. There is **nothing in `localStorage`**, no token to
attach and no `setToken` to call — httpOnly means JavaScript cannot read the
cookie, which is the point: an injected script cannot steal a session it cannot
see.

`lib/session.ts` has `login`, `adminLogin`, `logout` and `redirectToLogin`.
None of them stores anything; they report who signed in.

### Calling an endpoint

`lib/api.ts` is the shared client. `apiFetch` sends credentials, sets the right
content type (and stays out of the way for `FormData`), and turns the API's
error envelope into an `ApiRequestError` carrying the error `code` and one
`details[]` entry per rejected field — what a form needs to put a message
beside the right input.

Two helpers come with it, and using them is the convention rather than a
suggestion:

- `describeError(err, overrides?)` — the sentence to show the user. Pass
  per-status overrides for page-specific wording; do not write a seventh
  version of this function.
- `isNotSignedIn(err)` / `NOT_SIGNED_IN` — for the "log in, then come back"
  branch, which is not an error the user caused.

**Every endpoint gets a function in `lib/`** — `companies.ts`, `portfolios.ts`,
`certificate.ts`, `session.ts`. Calling `apiFetch` inline from a component is
why renaming one endpoint used to touch four files.

Sign in at [`/login`](http://localhost:3000/login), or
[`/admin/login`](http://localhost:3000/admin/login) for an administrator.
`npm run db:seed -w api` creates accounts you can use — the 20 original seeded
companies cannot log in, their `password` column holds a plain string rather
than a hash.

### Styling

Colours are tokens, not hex literals: `bg-brand`, `text-ink`, `border-line`.
They are declared in `app/globals.css`. The project's type scale is `type-hd`
through `type-xs` — **not** `text-lg` etc., which are Tailwind's own.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
