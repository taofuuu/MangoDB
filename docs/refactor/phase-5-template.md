# Phase 5 — Publish the template

**Status: done.** Ships [docs/adding-a-resource.md](../adding-a-resource.md),
and brings `apps/api/README.md` and `docs/api-guide.html` back in line with the
code.

## Why

Sprint 2's 32 backend tasks will copy something. This phase decides what, and
writes it down, so three new resources built by three people at the same time
arrive looking like one API.

**The reference is `admin-company.controller.ts` / `lib/adminCompany.ts` /
`admin-company.schema.ts`.** Not because it is the newest, but because it is the
only part of the API that already does every one of the things the conventions
ask for: `ApiError` throughout, schemas in `schemas/`, DTO mappers in `lib/`,
routes with no logic, and the only paginated endpoint.

## What the walkthrough covers

Seven steps in the order they depend on each other — table, schema, lib,
controller, route + shared type, snapshot, guide — with a checklist at the end.
The bits worth knowing before you start:

- **Check whether the table already exists.** `listing`, `service`,
  `job_requirement`, `proposal` and `project` all do, and three Sprint 2 tasks
  are worded as if they do not.
- **`prisma migrate dev --create-only`**, read the SQL, then
  `npm run db:migrate`. Never plain `migrate dev`, never the dashboard.
- **The ownership check has two right shapes** — 403 separate from 404, or
  folded into it — and which one is right depends on whether the ids are
  discoverable. Say which you picked and why, or the next person picks the other.
- **Anything the snapshot script creates has to be deleted on every exit path.**
  That one is in there because it bit during Phase 4.

## What was wrong with the docs

`apps/api/README.md`:

- Said **three** endpoints return `{ company, accessToken }`. It is four —
  `POST /auth/admin/login` was missed.
- Listed `PROVIDER`, `RECEIVER`, `BOTH` as the account types. `ADMIN` is one too,
  and the reason it is absent from `registerSchema` is worth a sentence.
- Its **worked example contradicted two rules on the same page**: it declared a
  schema inline (the page says schemas live in `schemas/`) and returned a raw
  Prisma row (the page says select the columns and map them). It now shows the
  real thing and points at the walkthrough for a whole resource.
- Documented neither `DELETE /companies/me`, `DELETE /admin/companies/:companyId`,
  nor any of the four certificate endpoints.

`docs/api-guide.html`:

- Contained **zero occurrences of the word "certificate"**.
- Documented `/admin/ping` in nine places, an endpoint Phase 4 deleted.
- Every field name in it was `snake_case`, i.e. wrong since Phase 2.

Both now describe what the code does. The guide gained a Certificates section
and an account-deletion entry, and a nav link to reach them.

## Rules this phase leaves behind

1. **An endpoint that is not in `docs/api-guide.html` is an endpoint someone
   writes a second time.** Update it in the same PR, not later.
2. **The walkthrough's checklist is the definition of done** for a new resource.
3. **If a doc contradicts the code, the doc is a bug** — the same severity as
   the code being wrong, because somebody will follow it.
4. **When you change a convention, grep the docs for it.** Phase 2 renamed every
   field in the codebase and left 162 stale names across these two files, which
   nobody noticed for three phases.
