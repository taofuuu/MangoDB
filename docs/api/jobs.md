# Job endpoints (`/jobs`)

Source: `apps/api/src/routes/job.routes.ts`,
`apps/api/src/controllers/job.controller.ts`
(the two `/proposals` routes live in `proposal.controller.ts`).
Back to the [index](README.md).

A job posting is a `listing` row with `listingType = JOB` plus a
`job_requirement` row. Every route needs `requireAuth`.

| Method | Path                     | Guards             | Success                     |
| ------ | ------------------------ | ------------------ | --------------------------- |
| GET    | `/jobs/mine`             | receiver           | 200 `{ items, pagination }` |
| GET    | `/jobs`                  | provider, receiver | 200 `{ items, pagination }` |
| GET    | `/jobs/:jobId`           | provider, receiver | 200 Job                     |
| POST   | `/jobs`                  | receiver           | 201 Job                     |
| GET    | `/jobs/:jobId/proposals` | receiver, owner    | 200 ReceivedProposal[]      |
| PATCH  | `/jobs/:jobId`           | auth, owner        | 200 Job                     |
| POST   | `/jobs/:jobId/close`     | auth, owner        | 200 Job                     |
| POST   | `/jobs/:jobId/proposals` | provider           | 201 Proposal                |

## UML API Diagram

![UML API Diagram: jobs](uml/jobs.svg)

Source: [uml/jobs.puml](uml/jobs.puml). REST profile notation, see the [index](README.md#uml-api-diagram). Status codes, parameters and bodies are in the OpenAPI docs at `/api-docs`.

The sections below add one sequence diagram per endpoint: the steps inside the server.

## GET /jobs/mine

US2-2. The caller's own job postings, every status, newest first. Paged.

```mermaid
sequenceDiagram
    autonumber
    actor C as Client
    participant G as requireAuth + requireRole(receiver)
    participant Ctl as job.controller<br/>listMyJobs
    participant DB as PostgreSQL

    C->>G: GET /jobs/mine?status&page&pageSize
    alt not signed in
        G-->>C: 401
    else not a receiver
        G-->>C: 403
    end
    G->>Ctl: next
    Ctl->>Ctl: parseQuery(jobMineQuerySchema)
    Ctl->>DB: $transaction [listing.count, listing.findMany (JOB, companyId = caller, status?)]
    Ctl-->>C: 200 { items: Job[], pagination }
```

## GET /jobs

US2-7 / US3-4 / US3-5 / US3-8. Search job postings. OPEN postings are visible to all
companies. CLOSED postings are visible only to their owner.

```mermaid
sequenceDiagram
    autonumber
    actor C as Client
    participant G as requireAuth + requireRole(provider, receiver)
    participant Ctl as job.controller<br/>listJobs
    participant L as lib/job
    participant DB as PostgreSQL

    C->>G: GET /jobs?status&companyId&q&category&minBudget&maxBudget&deadline&orderBy&page&pageSize
    G->>Ctl: next (401 / 403 as above)
    Ctl->>Ctl: parseQuery(jobListQuerySchema)
    alt bad filter, minBudget > maxBudget, or invalid orderBy
        Ctl-->>C: 400 VALIDATION_FAILED
    end
    Ctl->>L: jobSearchWhere(filters, caller)
    Ctl->>L: jobOrderBy(orderBy)
    Ctl->>DB: $transaction [listing.count, listing.findMany(orderBy)]
    Ctl-->>C: 200 { items: Job[], pagination }
```

## GET /jobs/:jobId

US2-7. One posting with the same visibility rule. Anything hidden is 404.

```mermaid
sequenceDiagram
    autonumber
    actor C as Client
    participant G as requireAuth + requireRole(provider, receiver)
    participant Ctl as job.controller<br/>getJob
    participant L as lib/listing
    participant DB as PostgreSQL

    C->>G: GET /jobs/:jobId
    G->>Ctl: next (401 / 403 as above)
    Ctl->>Ctl: parseParams(jobIdParamSchema)
    Ctl->>DB: listing.findUnique (id, JOB, company not deleted)
    Ctl->>L: assertListingVisible(posting, caller, JOB)
    alt no row, a service id, or CLOSED and not the owner
        L-->>C: 404 Job not found
    end
    Ctl-->>C: 200 Job
```

## POST /jobs

US2-6. Create and publish a job posting, with its requirement row and
categories in one nested write.

```mermaid
sequenceDiagram
    autonumber
    actor C as Client
    participant G as requireAuth + requireRole(receiver)
    participant Ctl as job.controller<br/>createJob
    participant Cat as lib/category
    participant DB as PostgreSQL

    C->>G: POST /jobs (JSON)
    alt not signed in
        G-->>C: 401
    else not a receiver
        G-->>C: 403
    end
    G->>Ctl: next
    Ctl->>Ctl: parseBody(createJobSchema)
    alt invalid body or minBudget > maxBudget
        Ctl-->>C: 400 VALIDATION_FAILED
    end
    opt categoryIds sent
        Ctl->>Cat: assertCategoriesExist
        alt unknown category
            Cat-->>C: 400 VALIDATION_FAILED
        end
    end
    Ctl->>DB: listing.create (JOB, OPEN, job requirement, listingCategory)
    Ctl-->>C: 201 Job
```

## GET /jobs/:jobId/proposals

US2-10. Every proposal on one posting, newest first. Only the posting's owner.

```mermaid
sequenceDiagram
    autonumber
    actor C as Client
    participant G as requireAuth + requireRole(receiver)
    participant Ctl as proposal.controller<br/>listJobProposals
    participant L as lib/listing
    participant DB as PostgreSQL

    C->>G: GET /jobs/:jobId/proposals
    alt not signed in
        G-->>C: 401
    else not a receiver
        G-->>C: 403
    end
    G->>Ctl: next
    Ctl->>Ctl: parseParams(jobIdParamSchema)
    Ctl->>L: assertListingOwned(jobId, JOB, caller)
    alt unknown job
        L-->>C: 404
    else another receiver's job
        L-->>C: 403
    end
    Ctl->>DB: proposal.findMany (listingId) with sender profile
    Ctl-->>C: 200 ReceivedProposal[]
```

## PATCH /jobs/:jobId

US2-13. Owner only, and only while OPEN. `categoryIds` replaces the set.

```mermaid
sequenceDiagram
    autonumber
    actor C as Client
    participant G as requireAuth
    participant Ctl as job.controller<br/>updateJob
    participant L as lib/listing
    participant Cat as lib/category
    participant DB as PostgreSQL

    C->>G: PATCH /jobs/:jobId (JSON)
    G->>Ctl: req.auth (401 if not signed in)
    Ctl->>Ctl: parseParams, parseBody(updateJobSchema)
    Ctl->>L: assertListingOwned(jobId, JOB, caller)
    alt unknown job
        L-->>C: 404
    else not the owner
        L-->>C: 403
    end
    alt listing is not OPEN
        Ctl-->>C: 409 Only an open job can be edited
    end
    Ctl->>L: assertBudgetRange(existing, body)
    alt merged min > max
        L-->>C: 400 VALIDATION_FAILED
    end
    opt categoryIds sent
        Ctl->>Cat: assertCategoriesExist
    end
    Ctl->>DB: listing.update where id, owner, JOB (upsert job requirement, replace categories)
    alt gone in between
        Ctl-->>C: 404 Job not found
    end
    Ctl-->>C: 200 Job
```

## POST /jobs/:jobId/close

US2-14. Close the posting and reject every pending proposal, in one
transaction.

```mermaid
sequenceDiagram
    autonumber
    actor C as Client
    participant G as requireAuth
    participant Ctl as job.controller<br/>closeJob
    participant L as lib/listing
    participant DB as PostgreSQL

    C->>G: POST /jobs/:jobId/close
    G->>Ctl: req.auth (401 if not signed in)
    Ctl->>Ctl: parseParams(jobIdParamSchema)
    Ctl->>L: assertListingOwned(jobId, JOB, caller)
    alt unknown job
        L-->>C: 404
    else not the owner
        L-->>C: 403
    end
    rect rgba(128, 128, 128, 0.12)
        Note over Ctl,DB: prisma.$transaction
        Ctl->>L: closeOpenListing(tx, jobId)
        L->>DB: listing.updateMany OPEN to CLOSED
        alt count is 0
            L-->>C: 409 Only an open job can be closed (rollback)
        end
        Ctl->>L: rejectPendingProposals(tx, jobId)
        L->>DB: proposal.updateMany PENDING to REJECTED
        Ctl->>DB: listing.findUniqueOrThrow
    end
    Ctl-->>C: 200 Job (CLOSED)
```

## POST /jobs/:jobId/proposals

US2-8. A Provider sends a proposal to an open job.

```mermaid
sequenceDiagram
    autonumber
    actor C as Client
    participant G as requireAuth + requireRole(provider)
    participant Ctl as proposal.controller<br/>createProposal
    participant DB as PostgreSQL

    C->>G: POST /jobs/:jobId/proposals { proposalBudget, proposalTerms, duration }
    alt not signed in
        G-->>C: 401
    else not a provider
        G-->>C: 403
    end
    G->>Ctl: next
    Ctl->>Ctl: parseParams, parseBody(createProposalSchema)
    Ctl->>DB: listing.findUnique (id, company not deleted)
    alt no row or not a JOB
        Ctl-->>C: 404 Job not found
    else caller owns the job
        Ctl-->>C: 403 You cannot send a proposal to your own job
    else job not OPEN
        Ctl-->>C: 409 This job is not open for proposals
    end
    Ctl->>DB: proposal.create (PENDING)
    alt already a PENDING proposal from this sender (P2002)
        Ctl-->>C: 409 You already have a pending proposal on this job
    end
    Ctl-->>C: 201 Proposal
```
