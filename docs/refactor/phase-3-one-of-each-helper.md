# Phase 3 — Backend: one of each helper

**Status: done.** Nothing here changes a response. The empty snapshot diff is
the acceptance test, and it passed.

## Why before Phase 4

Phase 4 edits these same code paths. Do it the other way round and you edit
three copies of each thing, then merge them.

## What got merged

| Was                                               | Now                                            |
| ------------------------------------------------- | ---------------------------------------------- |
| 13 × `Number(req.auth!.sub)`                      | `req.auth.companyId`, coerced in `requireAuth` |
| 8 `process.env` reads in 6 files, 3 dotenv styles | `env.ts`                                       |
| Two session lifetimes                             | `SESSION_TTL_SECONDS`                          |
| 6 bare `throw new Error` on request paths         | `ApiError`                                     |
| Certificate ownership checked inline, twice       | `assertCertificateOwned`                       |
| Expiry-vs-issue rule written twice                | `expiryIsOnOrAfterIssue`                       |
| "Verify my current password", twice               | `assertCurrentPassword`                        |
| Two P2002 detectors                               | one predicate, one caller of it                |
| `adminCompanyListSelect` restating five columns   | derived from `companyProfileSelect`            |
| Three ways to ask "does this own a provider row"  | `ownsProviderRow` / `ownsReceiverRow`          |
| `clearRevokedTokens` + 7 unused `z.infer` aliases | deleted                                        |

## The one that was a live bug

`lib/session.ts` set the cookie to `60 * 60 * 1000`; `auth/jwt.ts` signed the
token with `JWT_EXPIRES_IN || '1h'`. **`JWT_EXPIRES_IN` moved the token and not
the cookie**, so `JWT_EXPIRES_IN=8h` gave you a cookie that died seven hours
before the token it was carrying — a session that silently ended early, on a
setting that looked like it worked.

One number now, `SESSION_TTL_SECONDS`, in seconds because that is what
`jsonwebtoken` takes; the cookie multiplies up. `JWT_EXPIRES_IN` is gone from
`.env.example`. **If you have it set in your own `.env`, it does nothing now.**

## Rules this phase leaves behind

1. **Read the caller's id from `req.auth!.companyId`.** Never coerce `sub`
   yourself — `sub` is a string because JWT requires it, and that is the only
   reason.
2. **Every `process.env` read lives in `env.ts`.** A handler reading
   `process.env` directly is a variable nobody can find and nothing validates.
   Required ones throw at startup naming the variable; the Supabase pair is
   checked at first use, because the app is usable without storage keys and
   half the team does not have them.
3. **Never `throw new Error` on a request path.** That is a 500 with no message.
   `ApiError` has a factory for every status this API returns, and
   `new ApiError(500, 'INTERNAL', …)` is there for "the database holds a value
   no code path can produce".
4. **An ownership check is a function in `lib/`, not three lines in a handler.**
   There are two shapes: `assertPortfolioOwned` separates 403 from 404,
   `assertCertificateOwned` folds them. Both are right for their resource, and
   both say why in a comment. Pick one deliberately.
5. **A rule that a PATCH also needs cannot live only in a `.refine()`.**
   `.partial()` drops refinements, and a partial body has to be merged with the
   stored row before most rules mean anything. Export the predicate and let the
   schema and the controller both call it.
6. **A narrower `select` derives from the wider one.** Restating the column
   names is how the two drift when a column is added.
7. **Delete an export the moment nothing imports it.** A test hook with no tests
   is not a seam, it is a thing the next reader has to rule out.

## What this phase deliberately did not do

Anything visible from outside. `{ message, certificate }` is still there,
`/certificates/provider` is still spelled that way, and eleven update schemas
are still `z.object` rather than `z.strictObject`. Those are Phase 4, because
they change the wire and this phase's whole claim is that it did not.
