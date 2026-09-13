# Phase 6 — Frontend: one way to call the API

**Status: done.** Snapshot diff empty — nothing here changes a response.

## What got merged

| Was                                               | Now                             |
| ------------------------------------------------- | ------------------------------- |
| 6 error helpers, all different                    | `describeError` in `lib/api.ts` |
| 7 catch ladders, 6 saying "port 4000"             | the same                        |
| 7 inline `err.status === 401` checks              | `isNotSignedIn`                 |
| `'no-token'` in 17 places                         | `NOT_SIGNED_IN`                 |
| 3 certificate calls made inline from forms        | `lib/certificate.ts`            |
| `AccountType \| null` on the register page        | `RegisterAccountType \| null`   |
| A `localStorage` write nothing read               | deleted                         |
| `origin: FRONTEND_URL \|\| true` with credentials | a named origin                  |

## `describeError`

The six helpers differed only in which statuses got a friendlier sentence. Those
are overrides now, passed where you can see which page they belong to:

```ts
setError(
    describeError(err, {
        401: 'Please log in to view Company accounts.',
        403: 'Only an administrator can view Company accounts.',
    }),
);
```

One behaviour changed on purpose: a **field-level detail now beats the
envelope's message** when the response has one. `"Invalid email address"` is
what a user can act on; `"Request body is invalid"` is not. Only one of the six
helpers did that before.

And six of them ended in **"Could not reach the API. Is it running on port
4000?"** — a developer's sentence in a user's error box. The only page still
saying it is `app/dev/session`, deliberately, and Phase 7 deletes that page.

## The CORS hole

`app.ts` was `origin: process.env.FRONTEND_URL || true` with
`credentials: true`. With `FRONTEND_URL` unset — which is the normal local
state, and one bad deploy away from the normal remote state — **any origin could
make credentialed calls carrying the visitor's session cookie.**

It was that way because the register page used to call the API cross-origin
directly. It does not any more: the browser only ever talks to Next, which
proxies `/api/*` through (`next.config.ts`). So the wildcard had nothing left to
support and is gone.

## Rules this phase leaves behind

1. **`describeError` is the only way to turn a failure into a sentence.** If a
   page needs different wording for a status, pass an override — do not write a
   seventh helper.
2. **No `.catch` ladder in a component.** `isNotSignedIn(err)` for the
   sign-in case, `describeError(err)` for everything else.
3. **An error message is for the person reading it.** Ports, codes and stack
   shapes belong in the console.
4. **Every endpoint gets a function in `lib/`.** Calling `apiFetch` inline from
   a component is why one endpoint rename touched four files instead of one.
5. **`NOT_SIGNED_IN`, not a string literal.** A sentinel compared by hand in
   seventeen places is one typo from a page that never shows its prompt.
6. **Nothing about the session goes in `localStorage`.** The cookie is httpOnly
   on purpose; a copy of the token in JS reach is the thing that protects
   against.
7. **CORS names its origins.** `origin: true` with `credentials: true` is not a
   default to leave in place.

## Left for Phase 7

`app/dev/session/` still exists — its own header says to delete it once
`/signup` exists, and `/register` has existed for a while. `AddCertificateForm`
still calls `alert()`. Both are on Phase 7's list, along with the primitives
those pages are built from.
