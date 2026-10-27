# Project endpoints (`/projects`)

Source: `apps/api/src/routes/project.routes.ts`,
`apps/api/src/controllers/project.controller.ts`.
Back to the [index](README.md).

Quotations are decided on their own paths under `/quotations`, see
[quotations.md](quotations.md).

A project is opened by `POST /proposals/:proposalId/accept` (see
[proposals.md](proposals.md)). Every route here needs only `requireAuth`.
There is no `requireRole`: a BOTH company can be either side, so the controller
works out the caller's side per project with `assertProjectParty`.

- Not a party to the project: **404**, as if it did not exist.
- A party, but the wrong side for this action: **403**.
- The right side, but the wrong status: **409**.

| Method | Path                                   | Who may act  | Success                     |
| ------ | -------------------------------------- | ------------ | --------------------------- |
| GET    | `/projects/mine`                       | any company  | 200 `{ items, pagination }` |
| GET    | `/projects/:projectId`                 | both parties | 200 ProjectDetail           |
| GET    | `/projects/:projectId/updates`         | both parties | 200 ProjectUpdate[]         |
| POST   | `/projects/:projectId/updates`         | Provider     | 201 ProjectUpdate           |
| GET    | `/projects/:projectId/quotations`      | both parties | 200 Quotation[]             |
| POST   | `/projects/:projectId/quotations`      | Provider     | 201 Quotation               |
| POST   | `/projects/:projectId/cancel`          | both parties | 200 Project                 |
| POST   | `/projects/:projectId/report-deposit`  | Receiver     | 200 Project                 |
| POST   | `/projects/:projectId/confirm-deposit` | Provider     | 200 Project                 |
| POST   | `/projects/:projectId/submit-work`     | Provider     | 200 Project                 |
| POST   | `/projects/:projectId/reject-work`     | Receiver     | 200 Project                 |
| POST   | `/projects/:projectId/accept-work`     | Receiver     | 200 Project                 |
| POST   | `/projects/:projectId/review`          | Receiver     | 201 Review                  |
| GET    | `/projects/:projectId/review`          | both parties | 200 Review                  |

## UML API Diagram

![UML API Diagram: projects](uml/projects.svg)

Source: [uml/projects.puml](uml/projects.puml). REST profile notation, see the [index](README.md#uml-api-diagram). Status codes, parameters and bodies are in the OpenAPI docs at `/api-docs`.

The sections below add one sequence diagram per endpoint: the steps inside the server.

## State diagram: project status

ADR 0015. `moveProjectStatus` in `lib/project.ts` allows only these moves.

```mermaid
stateDiagram-v2
    [*] --> AWAITING_QUOTATION : accept proposal
    AWAITING_QUOTATION --> AWAITING_DEPOSIT : accept quotation (Receiver)
    AWAITING_QUOTATION --> CANCELLED : cancel (either party)
    AWAITING_DEPOSIT --> IN_PROGRESS : confirm-deposit (Provider, after report-deposit)
    AWAITING_DEPOSIT --> CANCELLED : cancel (either party)
    IN_PROGRESS --> AWAITING_ACCEPTANCE : submit-work (Provider)
    AWAITING_ACCEPTANCE --> IN_PROGRESS : reject-work (Receiver)
    AWAITING_ACCEPTANCE --> COMPLETED : accept-work (Receiver)
    COMPLETED --> [*]
    CANCELLED --> [*]
```

## Shared step: assertProjectParty

Every `/:projectId` route starts with this. The diagrams below draw it as one
call.

```mermaid
sequenceDiagram
    autonumber
    participant Ctl as project.controller
    participant L as lib/project<br/>assertProjectParty
    participant DB as PostgreSQL

    Ctl->>L: assertProjectParty(projectId, caller)
    L->>DB: project.findUnique (status, proposal.senderId, listing type + owner)
    alt no project
        L-->>Ctl: throw 404 Project not found
    end
    L->>L: projectParties: job = sender is Provider, service = sender is Receiver
    alt caller is neither party
        L-->>Ctl: throw 404 Project not found
    end
    L-->>Ctl: { projectStatus, providerId, receiverId, myRole }
```

## GET /projects/mine

US4-9. The caller's projects on both sides, newest first. Paged.

```mermaid
sequenceDiagram
    autonumber
    actor C as Client
    participant G as requireAuth
    participant Ctl as project.controller<br/>listMyProjects
    participant DB as PostgreSQL

    C->>G: GET /projects/mine?page&pageSize
    G->>Ctl: req.auth (401 if not signed in)
    Ctl->>Ctl: parseQuery(projectListQuerySchema)
    Ctl->>DB: $transaction [project.count, project.findMany] where caller is sender OR listing owner, by projectId desc
    Ctl->>Ctl: toProjectSummary(row, caller) adds myRole
    Ctl-->>C: 200 { items: ProjectSummary[], pagination }
```

## GET /projects/:projectId

US4-9. One project, for its two parties.

```mermaid
sequenceDiagram
    autonumber
    actor C as Client
    participant G as requireAuth
    participant Ctl as project.controller<br/>getProject
    participant L as lib/project
    participant DB as PostgreSQL

    C->>G: GET /projects/:projectId
    G->>Ctl: req.auth (401 if not signed in)
    Ctl->>Ctl: parseParams(projectIdParamSchema)
    Ctl->>L: assertProjectParty
    alt not found or not a party
        L-->>C: 404 Project not found
    end
    Ctl->>DB: project.findUnique (projectViewSelect)
    Ctl->>L: toProjectDetail(row, caller)
    Ctl-->>C: 200 ProjectDetail
```

## GET /projects/:projectId/updates

US4-9. The project's whole timeline, oldest first. Not paged.

Each action saves one event inside the action's own transaction, so a
refused action (403, 409) saves none (#212). Only `PROGRESS` and `WORK_REJECTED` have
`updateText`; on the rest it is `null`.

| `updateType`         | Saved by                                    |
| -------------------- | ------------------------------------------- |
| `PROPOSAL_ACCEPTED`  | `POST /proposals/:proposalId/accept`        |
| `QUOTATION_SENT`     | `POST /projects/:projectId/quotations`      |
| `QUOTATION_DELETED`  | `DELETE /quotations/:quotationId`           |
| `QUOTATION_REJECTED` | `POST /quotations/:quotationId/reject`      |
| `QUOTATION_ACCEPTED` | `POST /quotations/:quotationId/accept`      |
| `DEPOSIT_REPORTED`   | `POST /projects/:projectId/report-deposit`  |
| `DEPOSIT_CONFIRMED`  | `POST /projects/:projectId/confirm-deposit` |
| `PROGRESS`           | `POST /projects/:projectId/updates`         |
| `WORK_SUBMITTED`     | `POST /projects/:projectId/submit-work`     |
| `WORK_REJECTED`      | `POST /projects/:projectId/reject-work`     |
| `WORK_ACCEPTED`      | `POST /projects/:projectId/accept-work`     |
| `PROJECT_CANCELLED`  | `POST /projects/:projectId/cancel`          |

A deleted quotation keeps its `QUOTATION_SENT` event: the timeline is
append-only.

```mermaid
sequenceDiagram
    autonumber
    actor C as Client
    participant G as requireAuth
    participant Ctl as project.controller<br/>listProjectUpdates
    participant L as lib/project
    participant DB as PostgreSQL

    C->>G: GET /projects/:projectId/updates
    G->>Ctl: req.auth (401 if not signed in)
    Ctl->>L: assertProjectParty
    alt not found or not a party
        L-->>C: 404 Project not found
    end
    Ctl->>DB: projectUpdate.findMany by createdAt asc, id asc
    Ctl-->>C: 200 ProjectUpdate[] (every event)
```

## POST /projects/:projectId/updates

US4-10. The Provider adds a progress note while IN_PROGRESS.

```mermaid
sequenceDiagram
    autonumber
    actor C as Provider client
    participant G as requireAuth
    participant Ctl as project.controller<br/>createProjectUpdate
    participant L as lib/project
    participant DB as PostgreSQL

    C->>G: POST /projects/:projectId/updates { updateText }
    G->>Ctl: req.auth (401 if not signed in)
    Ctl->>Ctl: parseParams, parseBody(createProjectUpdateSchema)
    Ctl->>L: assertProjectParty
    alt not found or not a party
        L-->>C: 404
    end
    alt caller is the Receiver
        Ctl-->>C: 403 Only the Provider can add a progress update
    else status is not IN_PROGRESS
        Ctl-->>C: 409 Project is not IN_PROGRESS
    end
    Ctl->>DB: projectUpdate.create (PROGRESS, createdAt by server)
    Ctl-->>C: 201 ProjectUpdate
```

## GET /projects/:projectId/quotations

US4-3. The project's quotations, newest first, for both parties. A plain
array, not paged.

```mermaid
sequenceDiagram
    autonumber
    actor C as Client
    participant G as requireAuth
    participant Ctl as quotation.controller<br/>listQuotations
    participant L as lib/project
    participant DB as PostgreSQL

    C->>G: GET /projects/:projectId/quotations
    G->>Ctl: req.auth (401 if not signed in)
    Ctl->>Ctl: parseParams(projectIdParamSchema)
    Ctl->>L: assertProjectParty
    alt not found or not a party
        L-->>C: 404 Project not found
    end
    Ctl->>DB: quotation.findMany where projectId, by createdAt desc then quotationId desc
    Ctl->>Ctl: toQuotation(row) makes createdAt an ISO string
    Ctl-->>C: 200 Quotation[]
```

## POST /projects/:projectId/quotations

US4-1. The Provider uploads a quotation PDF (multipart, field `file`, up to
5 MB). The project stays AWAITING_QUOTATION until the Receiver accepts one.

```mermaid
sequenceDiagram
    autonumber
    actor C as Provider client
    participant G as requireAuth
    participant U as uploadPdf('file')
    participant Ctl as quotation.controller<br/>createQuotation
    participant L as lib/project
    participant S as Storage
    participant DB as PostgreSQL

    C->>G: POST /projects/:projectId/quotations (multipart)
    G->>U: req.auth (401 if not signed in)
    alt not a PDF or over 5 MB
        U-->>C: 400
    end
    U->>Ctl: req.file
    alt no file
        Ctl-->>C: 400 Choose a PDF first
    end
    Ctl->>L: assertProjectParty
    alt not found or not a party
        L-->>C: 404
    end
    alt caller is the Receiver
        Ctl-->>C: 403 Only the Provider can upload a quotation
    else status is not AWAITING_QUOTATION
        Ctl-->>C: 409 Project is not AWAITING_QUOTATION
    end
    Ctl->>DB: quotation.findFirst where PENDING
    alt one is pending
        Ctl-->>C: 409 A quotation is already pending
    end
    Ctl->>S: upload PDF (quotations bucket)
    Ctl->>DB: quotation.create (PENDING, file URL)
    alt unique index hit (two uploads at once)
        Ctl->>S: delete the orphan PDF
        Ctl-->>C: 409 A quotation is already pending
    end
    Ctl-->>C: 201 Quotation
```

## POST /projects/:projectId/cancel

US4-8. Either party cancels before work starts: AWAITING_QUOTATION or
AWAITING_DEPOSIT to CANCELLED.

```mermaid
sequenceDiagram
    autonumber
    actor C as Client
    participant G as requireAuth
    participant Ctl as project.controller<br/>cancelProject
    participant L as lib/project
    participant DB as PostgreSQL

    C->>G: POST /projects/:projectId/cancel
    G->>Ctl: req.auth (401 if not signed in)
    Ctl->>L: assertProjectParty
    alt not found or not a party
        L-->>C: 404
    end
    rect rgba(128, 128, 128, 0.12)
        Note over Ctl,DB: prisma.$transaction
        Ctl->>L: moveProjectStatus(tx, current status, CANCELLED)
        alt move not allowed (already past deposit, or changed meanwhile)
            L-->>C: 409
        end
        Ctl->>DB: project.findUniqueOrThrow
    end
    Ctl-->>C: 200 Project
```

## POST /projects/:projectId/report-deposit

US4-6. The Receiver says the deposit is paid. Only the time is saved. The
status stays AWAITING_DEPOSIT.

```mermaid
sequenceDiagram
    autonumber
    actor C as Receiver client
    participant G as requireAuth
    participant Ctl as project.controller<br/>reportDeposit
    participant L as lib/project
    participant DB as PostgreSQL

    C->>G: POST /projects/:projectId/report-deposit
    G->>Ctl: req.auth (401 if not signed in)
    Ctl->>L: assertProjectParty
    alt not found or not a party
        L-->>C: 404
    end
    alt caller is the Provider
        Ctl-->>C: 403 Only the Receiver can report the deposit
    else status is not AWAITING_DEPOSIT
        Ctl-->>C: 409 Project is not AWAITING_DEPOSIT
    end
    Ctl->>DB: project.update where AWAITING_DEPOSIT and depositReportedAt null, set depositReportedAt = now
    alt no row matched (double click)
        Ctl-->>C: 409 Deposit has already been reported
    end
    Ctl-->>C: 200 Project
```

## POST /projects/:projectId/confirm-deposit

US4-7. The Provider confirms the deposit. AWAITING_DEPOSIT to IN_PROGRESS.

```mermaid
sequenceDiagram
    autonumber
    actor C as Provider client
    participant G as requireAuth
    participant Ctl as project.controller<br/>confirmDeposit
    participant L as lib/project
    participant DB as PostgreSQL

    C->>G: POST /projects/:projectId/confirm-deposit
    G->>Ctl: req.auth (401 if not signed in)
    Ctl->>L: assertProjectParty
    alt not found or not a party
        L-->>C: 404
    end
    alt caller is the Receiver
        Ctl-->>C: 403 Only the Provider can confirm the deposit
    end
    rect rgba(128, 128, 128, 0.12)
        Note over Ctl,DB: prisma.$transaction
        Ctl->>L: moveProjectStatus(tx, AWAITING_DEPOSIT, IN_PROGRESS)
        L->>DB: project.updateMany where status = AWAITING_DEPOSIT
        alt count is 0
            L-->>C: 409 Project is not AWAITING_DEPOSIT
        end
        Ctl->>DB: project.update where depositReportedAt not null, set depositConfirmedAt = now
        alt deposit not reported
            Ctl-->>C: 409 The Receiver has not reported the deposit yet (rollback)
        end
    end
    Ctl-->>C: 200 Project
```

## POST /projects/:projectId/submit-work

US4-11. The Provider reports the work complete. IN_PROGRESS to
AWAITING_ACCEPTANCE.

```mermaid
sequenceDiagram
    autonumber
    actor C as Provider client
    participant G as requireAuth
    participant Ctl as project.controller<br/>submitWork
    participant L as lib/project
    participant DB as PostgreSQL

    C->>G: POST /projects/:projectId/submit-work
    G->>Ctl: req.auth (401 if not signed in)
    Ctl->>L: assertProjectParty
    alt not found or not a party
        L-->>C: 404
    end
    alt caller is the Receiver
        Ctl-->>C: 403 Only the Provider can report the work complete
    end
    rect rgba(128, 128, 128, 0.12)
        Note over Ctl,DB: prisma.$transaction
        Ctl->>L: moveProjectStatus(tx, IN_PROGRESS, AWAITING_ACCEPTANCE)
        L->>DB: project.updateMany where status = IN_PROGRESS
        alt count is 0
            L-->>C: 409 Project is not IN_PROGRESS
        end
        Ctl->>DB: project.findUniqueOrThrow
    end
    Ctl-->>C: 200 Project
```

## POST /projects/:projectId/reject-work

US4-12. The Receiver rejects the work with a reason. AWAITING_ACCEPTANCE back
to IN_PROGRESS. The reason goes on the timeline.

```mermaid
sequenceDiagram
    autonumber
    actor C as Receiver client
    participant G as requireAuth
    participant Ctl as project.controller<br/>rejectWork
    participant L as lib/project
    participant DB as PostgreSQL

    C->>G: POST /projects/:projectId/reject-work { reason }
    G->>Ctl: req.auth (401 if not signed in)
    Ctl->>Ctl: parseParams, parseBody(rejectWorkSchema)
    alt reason missing or too long
        Ctl-->>C: 400 VALIDATION_FAILED
    end
    Ctl->>L: assertProjectParty
    alt not found or not a party
        L-->>C: 404
    end
    alt caller is the Provider
        Ctl-->>C: 403 Only the Receiver can reject the work
    end
    rect rgba(128, 128, 128, 0.12)
        Note over Ctl,DB: prisma.$transaction
        Ctl->>L: moveProjectStatus(tx, AWAITING_ACCEPTANCE, IN_PROGRESS)
        alt count is 0
            L-->>C: 409 Project is not AWAITING_ACCEPTANCE
        end
        Ctl->>DB: projectUpdate.create (WORK_REJECTED, updateText = reason)
        Ctl->>DB: project.findUniqueOrThrow
    end
    Ctl-->>C: 200 Project
```

## POST /projects/:projectId/accept-work

US4-13. The Receiver accepts the work. AWAITING_ACCEPTANCE to COMPLETED.

```mermaid
sequenceDiagram
    autonumber
    actor C as Receiver client
    participant G as requireAuth
    participant Ctl as project.controller<br/>acceptWork
    participant L as lib/project
    participant DB as PostgreSQL

    C->>G: POST /projects/:projectId/accept-work
    G->>Ctl: req.auth (401 if not signed in)
    Ctl->>L: assertProjectParty
    alt not found or not a party
        L-->>C: 404
    end
    alt caller is the Provider
        Ctl-->>C: 403 Only the Receiver can accept the work
    end
    rect rgba(128, 128, 128, 0.12)
        Note over Ctl,DB: prisma.$transaction
        Ctl->>L: moveProjectStatus(tx, AWAITING_ACCEPTANCE, COMPLETED)
        alt count is 0
            L-->>C: 409 Project is not AWAITING_ACCEPTANCE
        end
        Ctl->>DB: project.update set completedAt = now
    end
    Ctl-->>C: 200 Project
```

## POST /projects/:projectId/review

US5-1. The Receiver reviews a completed project once (ADR 0018).

```mermaid
sequenceDiagram
    autonumber
    actor C as Receiver client
    participant G as requireAuth
    participant Ctl as project.controller<br/>createReview
    participant L as lib/project
    participant DB as PostgreSQL

    C->>G: POST /projects/:projectId/review { 4 scores 1-5, comment? }
    G->>Ctl: req.auth (401 if not signed in)
    Ctl->>Ctl: parseParams, parseBody(createReviewSchema)
    alt score out of range
        Ctl-->>C: 400 VALIDATION_FAILED
    end
    Ctl->>L: assertProjectParty
    alt not found or not a party
        L-->>C: 404
    end
    alt caller is the Provider
        Ctl-->>C: 403 Only the Receiver can review the project
    else status is not COMPLETED
        Ctl-->>C: 409 Project is not COMPLETED
    end
    Ctl->>DB: review.create
    alt review already exists (P2002 on projectId)
        Ctl-->>C: 409 Project has already been reviewed
    end
    Ctl-->>C: 201 Review
```

## GET /projects/:projectId/review

US5-3. The project's review, for both parties. 404 until there is one.

```mermaid
sequenceDiagram
    autonumber
    actor C as Client
    participant G as requireAuth
    participant Ctl as project.controller<br/>getProjectReview
    participant L as lib/project
    participant DB as PostgreSQL

    C->>G: GET /projects/:projectId/review
    G->>Ctl: req.auth (401 if not signed in)
    Ctl->>L: assertProjectParty
    alt not found or not a party
        L-->>C: 404 Project not found
    end
    Ctl->>DB: review.findUnique where projectId
    alt no review yet
        Ctl-->>C: 404 Review not found
    end
    Ctl-->>C: 200 Review
```
