# Phase 4 — Backend: apply the wire rules

**Status: done.** The only phase that renames anything on the wire, so the only
one besides Phase 2 with an expected snapshot diff.

## What changed on the wire

| Change                                              | Rule                                                          |
| --------------------------------------------------- | ------------------------------------------------------------- |
| `GET /certificates/provider` → `/certificates/mine` | [conventions §2.3](../conventions.md)                         |
| `{ message, certificate }` → the bare resource      | §3                                                            |
| `providerId` comes off the certificate response     | §15 — every column shipped is a column someone keeps shipping |
| `DELETE /admin/ping`                                | §2.8                                                          |
| `/signup` link → `/register`                        | §2.1 — the old one was a live 404                             |

Everything else in this phase is invisible: annotated return types, `res.json()`
instead of `return res.json()`, one spelling of a 204.

## Two bugs fixed on the way

**`checkAvailabilitySchema` answered a different question than registration.**
It was declared inline in the controller and had drifted three ways from
`companyFields`: `min(1)` instead of `min(3)`, no `regex`, and no
`.toLowerCase()`. The unique index is case-sensitive, so it could report
`"CodeCrafters"` available while `codecrafters` was taken — and then the
registration it was supposed to predict would 409. It now lives in
`schemas/auth.schema.ts` and reuses `companyFields`.

**`new Date().getFullYear()` at module scope** froze the year the process
started, so a server left running over New Year rejects certificates issued in
January. It is a function now. `expireYear` also had a floor and no ceiling at
all, so `999999` was accepted.

## The snapshot caught its own driver

`scripts/snapshot-api.sh` read the new certificate's id out of
`certificate.certificate_id`. Unwrapping the envelope broke that, `NEW_CERT_ID`
came back empty, and three files silently stopped being written. The run
reported 42 snapshots instead of 45 — which is how it was noticed.

Then the run that died left a certificate behind, and it appeared in the next
run's `GET /certificates/mine`. **The cleanup trap now covers the portfolio and
the certificate too, not just the two throwaway companies.** Anything the script
creates has to be removed on every exit path, or it pollutes every later diff.

## Rules this phase leaves behind

1. **One name per action, one shape per answer.** The rules are in
   `docs/conventions.md`; this phase is what made the code match them. A new
   endpoint that disagrees with that file is the endpoint that is wrong.
2. **A controller returns `Promise<void>` and calls `res.json(...)`.** Not
   `return res.json(...)` — the return value goes nowhere and it reads like the
   response is the function's result.
3. **204 is `.end()`.** `.send()` works and is one more spelling to notice.
4. **Every update body is `z.strictObject`.** A plain `z.object` drops keys it
   does not know, so a typo answers 200 having written nothing. There is now a
   snapshot (`38-error-portfolio-unknown-field`) that fails if a schema quietly
   goes back.
5. **No `new Date()` at module scope in a validation rule.** It is evaluated
   once, at import, and a long-lived process then judges against a stale year.
6. **A `lib/` module never imports a type from a component.** `lib/certificate.ts`
   did, which made a data module depend on the UI. The shared type is the answer.
7. **Every numeric field gets both bounds.** A `.min()` with no `.max()` accepts
   `999999`.

## Pulled forward from Phase 6

The certificate forms each defined their own copy of the response type, and
`lib/certificate.ts` imported one of them from a component. Once Phase 2 added
the shared `Certificate`, those copies were duplicates of it — and both files
were already open for the envelope unwrap, so deleting them here was cheaper
than leaving a known-wrong import for later.
