# Phase 6 — Frontend: one way to call the API

**Status: done.** `apps/mangodb` only, plus one comment in the API. The
snapshot diff is empty: nothing here changes what the API is asked or answers.

## One way to call it

| Was                                                                                                 | Now                                                                                                    |
| --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Seven reads went straight to `apiFetch`                                                             | every read is `cachedGet`, every write `invalidateAfter`                                               |
| `register` was an `apiFetch` inside the register page                                               | `register()` in `lib/session.ts`, beside `login()`                                                     |
| `lib/jobPostings.ts`; `listCompanyServices`, `listCompanyCertificates`, `listServicePortfolios`     | `lib/jobs.ts`; `list*` for a collection, `get*` for one; company scoping is one `{ companyId }` option |
| Seven local date formatters, four `toLocaleDateString` calls, `formatProposalDateTime` in proposals | `lib/dates.ts`: `formatDateOnly`, `formatDate`, `formatDateTime`, `formatMonthYear`, `formatMonths`    |
| Amounts as `฿12,500`, `12,500 baht` and `12,500`                                                    | `formatBaht` in `lib/money.ts`, which `formatBudgetRange` uses too                                     |
| Two certificate period formatters                                                                   | `formatCertificatePeriod` in `lib/certificates.ts`                                                     |
| Page sizes `5` written inside two pages                                                             | constants in `lib/pagination.ts`                                                                       |
| `lib/validation.ts`: 663 lines, importing a component's type                                        | `lib/validation/` with one file per API schema; `ProfileFormData` lives there                          |
| Separate title, description, budget and category rules for services and jobs                        | `lib/validation/listing.ts`, worded as the API's `listingFields`                                       |
| `getMyProfile()` plus a role check written into each page, with its own loading and refusal screens | `useMyCompany(role?)` in `lib/` and `components/auth/PageGate.tsx`                                     |
| Four ways to read an id from the URL                                                                | `parseId` in `lib/api.ts`                                                                              |

## URLs that match the API

| Was                                                           | Now                                   |
| ------------------------------------------------------------- | ------------------------------------- |
| `/job-postings`, `/job-postings/mine`, `/job-postings/create` | `/jobs`, `/jobs/mine`, `/jobs/create` |
| `/job-postings/[jobPostingId]/edit`                           | `/jobs/[jobId]/edit`                  |
| `/proposal/view?jobPostingId=&title=`                         | `/jobs/[jobId]/proposals`             |
| `/profile/[companyId]/*`                                      | `/companies/[companyId]/*`            |
| `/proposal/submit`, `/job-postings/by-company`                | deleted (test pages)                  |

Your own profile stays at `/profile/view` and `/profile/edit`, so a URL that
starts with `/profile/` is always yours.

## Real bugs found

1. **Accept and reject left stale lists.** They skipped `invalidateAfter`,
   so the job and proposal lists showed the old status for up to 30 seconds.
2. **A date-only value went through `new Date()`** in `JobDetailModal`,
   and `JobBox` printed it raw. Parsed, `2026-09-01` is UTC midnight, which is the
   day before for a viewer west of UTC. (The plan said UTC+7 showed the wrong
   day. It does not; UTC+7 is east of UTC. It was still wrong.)
3. **The service form refused what the API accepts.** It capped descriptions
   at 2000 characters where the API allows 10000, and let a fractional budget
   through for the API to reject.
4. **Another company's profile did not redirect on 401.** It showed its own
   "log in" note; every other page redirects to `/unauthorized`.
5. **The received-proposals page had no 401 handling**, and its default
   export took props, which a page never receives. The title came from the
   query string, so any title could be typed into the URL.

## What a user can see change

- Every date reads `1 Sep 2026`; the proposal stamps stay `dd/mm/yyyy hh:mm`.
- Every amount reads `฿12,500`.
- The service form's messages are the job form's (and the API's) wording.
- Loading and refusal screens are the same on every guarded page: a blank
  surface while loading, Access Restricted for the wrong account type, "Unable
  to load your account" for anything else. Job edit no longer says "Checking
  permissions...".

## Rules this phase leaves behind

1. **A request lives in `lib/<noun>.ts`. Reads are `cachedGet`, writes
   `invalidateAfter`.**
2. **Dates, money and page sizes come from `lib/dates`, `lib/money` and
   `lib/pagination`.** A date column is never passed to `new Date()`.
3. **A page that needs the signed-in company calls `useMyCompany(role?)`** and
   returns `<PageGate state={me} />` until it is `'ready'`.
4. **An id from the URL goes through `parseId`.** `null` is shown as not found.
5. **A form rule that the API also checks uses the API's wording**, from the
   matching file in `lib/validation/`.
6. **Page URLs mirror the API's** (`conventions.md` §2): `/jobs/[jobId]`, not
   `/job-postings/[jobPostingId]`.

## What is left

- **Nothing in the UI links to `/jobs/[jobId]/proposals`.** Only the dev
  index did, and that link needed a job id it never had. A receiver cannot
  reach their received proposals without typing the URL. Where the link goes
  is a design call for Toa (Phase 7).
- `/account-settings` and `/portfolios` still call `getMyProfile` themselves.
  Both already follow the documented shape; account settings replaces the
  profile after a save, which the hook does not do.
- `initials()` is written twice, and `daysInMonth` twice. Phase 7 merges the
  cards and the portfolio forms that hold them.
- `CertificateData`, the certificate form's own shape, is Phase 7's (one
  `CertificateForm`).
- The two `alert()` calls on the received-proposals page are Phase 7's
  (`ConfirmModal`).
- `ai-brief.md` still names the old routes and helpers; Phase 9 updates it.
