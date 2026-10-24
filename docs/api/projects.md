# Project endpoints (`/projects`)

Source: `apps/api/src/routes/project.routes.ts`,
`apps/api/src/controllers/project.controller.ts`.
Back to the [index](README.md).

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
| POST   | `/projects/:projectId/report-deposit`  | Receiver     | 200 Project                 |
| POST   | `/projects/:projectId/confirm-deposit` | Provider     | 200 Project                 |
| POST   | `/projects/:projectId/submit-work`     | Provider     | 200 Project                 |
| POST   | `/projects/:projectId/reject-work`     | Receiver     | 200 Project                 |
| POST   | `/projects/:projectId/accept-work`     | Receiver     | 200 Project                 |
| POST   | `/projects/:projectId/review`          | Receiver     | 201 Review                  |
| GET    | `/projects/:projectId/review`          | both parties | 200 Review                  |

## UML API Diagram

REST profile notation (see the [index](README.md#uml-api-diagram-notation)). Each operation lists its status codes. Follow an arrow from `«Application»` to a `«Resource»` to read one HTTP call.

```mermaid
classDiagram
    direction LR
    class API["MangoDB API"] {
        <<Application>>
        basePath = "/"
    }
    class Projects["Projects"] {
        <<Resource>>
    }
    class MyProjects["MyProjects"] {
        <<Resource>>
        +GET(page, pageSize : QueryParam) 200 | 400 | 401
    }
    class ProjectR["Project"] {
        <<Resource>>
        +GET() 200 | 400 | 401 | 404
    }
    class Updates["Updates"] {
        <<Resource>>
        +GET() 200 | 400 | 401 | 404
        +POST(CreateProjectUpdateRequest) 201 | 400 | 401 | 403 | 404 | 409
    }
    class ReportDeposit["ReportDeposit"] {
        <<Resource>>
        +POST() 200 | 400 | 401 | 403 | 404 | 409
    }
    class ConfirmDeposit["ConfirmDeposit"] {
        <<Resource>>
        +POST() 200 | 400 | 401 | 403 | 404 | 409
    }
    class SubmitWork["SubmitWork"] {
        <<Resource>>
        +POST() 200 | 400 | 401 | 403 | 404 | 409
    }
    class RejectWork["RejectWork"] {
        <<Resource>>
        +POST(RejectWorkRequest) 200 | 400 | 401 | 403 | 404 | 409
    }
    class AcceptWork["AcceptWork"] {
        <<Resource>>
        +POST() 200 | 400 | 401 | 403 | 404 | 409
    }
    class ReviewR["Review"] {
        <<Resource>>
        +GET() 200 | 400 | 401 | 404
        +POST(CreateReviewRequest) 201 | 400 | 401 | 403 | 404 | 409
    }
    class ProjectSummaryRep["ProjectSummary"] {
        <<Representation>>
        -Project fields
        -listingTitle : string
        -myRole : provider, receiver
        -otherParty : CompanyBrief
    }
    class ProjectDetailRep["ProjectDetail"] {
        <<Representation>>
        -Project fields
        -listingId : number
        -listingType : JOB, SERVICE
        -listingTitle : string
        -provider : CompanyBrief
        -receiver : CompanyBrief
        -myRole : provider, receiver
    }
    class ProjectUpdateRep["ProjectUpdate"] {
        <<Representation>>
        -projectUpdateId : number
        -projectId : number
        -updateType : PROGRESS, WORK_REJECTED
        -updateText : string
        -createdAt : date
    }
    class CreateProjectUpdateRequestRep["CreateProjectUpdateRequest"] {
        <<Representation>>
        -updateText : string
    }
    class ProjectRep["Project"] {
        <<Representation>>
        -projectId : number
        -proposalId : number
        -totalBudget : number
        -startDate : date
        -projectStatus : ProjectStatus
        -depositReportedAt : date?
        -depositConfirmedAt : date?
        -completedAt : date?
    }
    class RejectWorkRequestRep["RejectWorkRequest"] {
        <<Representation>>
        -reason : string
    }
    class ReviewRep["Review"] {
        <<Representation>>
        -reviewId : number
        -projectId : number
        -workQualityScore : 1-5
        -serviceScore : 1-5
        -valueForMoneyScore : 1-5
        -deliveryTimeScore : 1-5
        -comment : string?
        -createdAt : date
    }
    class CreateReviewRequestRep["CreateReviewRequest"] {
        <<Representation>>
        -workQualityScore : 1-5
        -serviceScore : 1-5
        -valueForMoneyScore : 1-5
        -deliveryTimeScore : 1-5
        -comment : string?
    }
    API --> Projects : «Path» /projects
    Projects --> MyProjects : «Path» /mine
    MyProjects ..> ProjectSummaryRep : «use»
    Projects --> ProjectR : «Path» /{projectId}
    ProjectR ..> ProjectDetailRep : «use»
    ProjectR --> Updates : «Path» /updates
    Updates ..> ProjectUpdateRep : «use»
    Updates ..> CreateProjectUpdateRequestRep : «use»
    ProjectR --> ReportDeposit : «Path» /report-deposit
    ReportDeposit ..> ProjectRep : «use»
    ProjectR --> ConfirmDeposit : «Path» /confirm-deposit
    ConfirmDeposit ..> ProjectRep : «use»
    ProjectR --> SubmitWork : «Path» /submit-work
    SubmitWork ..> ProjectRep : «use»
    ProjectR --> RejectWork : «Path» /reject-work
    RejectWork ..> RejectWorkRequestRep : «use»
    RejectWork ..> ProjectRep : «use»
    ProjectR --> AcceptWork : «Path» /accept-work
    AcceptWork ..> ProjectRep : «use»
    ProjectR --> ReviewR : «Path» /review
    ReviewR ..> ReviewRep : «use»
    ReviewR ..> CreateReviewRequestRep : «use»
    style API fill:#fde68a,stroke:#b45309
    style Projects fill:#bfdbfe,stroke:#1d4ed8
    style MyProjects fill:#bfdbfe,stroke:#1d4ed8
    style ProjectR fill:#bfdbfe,stroke:#1d4ed8
    style Updates fill:#bfdbfe,stroke:#1d4ed8
    style ReportDeposit fill:#bfdbfe,stroke:#1d4ed8
    style ConfirmDeposit fill:#bfdbfe,stroke:#1d4ed8
    style SubmitWork fill:#bfdbfe,stroke:#1d4ed8
    style RejectWork fill:#bfdbfe,stroke:#1d4ed8
    style AcceptWork fill:#bfdbfe,stroke:#1d4ed8
    style ReviewR fill:#bfdbfe,stroke:#1d4ed8
    style ProjectSummaryRep fill:#bbf7d0,stroke:#15803d
    style ProjectDetailRep fill:#bbf7d0,stroke:#15803d
    style ProjectUpdateRep fill:#bbf7d0,stroke:#15803d
    style CreateProjectUpdateRequestRep fill:#bbf7d0,stroke:#15803d
    style ProjectRep fill:#bbf7d0,stroke:#15803d
    style RejectWorkRequestRep fill:#bbf7d0,stroke:#15803d
    style ReviewRep fill:#bbf7d0,stroke:#15803d
    style CreateReviewRequestRep fill:#bbf7d0,stroke:#15803d
```

The sections below add one sequence diagram per endpoint: the steps inside the server.

## State diagram: project status

ADR 0015. `moveProjectStatus` in `lib/project.ts` allows only these moves.

```mermaid
stateDiagram-v2
    [*] --> AWAITING_QUOTATION : accept proposal
    AWAITING_QUOTATION --> AWAITING_DEPOSIT : quotation (no endpoint yet)
    AWAITING_QUOTATION --> CANCELLED : cancel (no endpoint yet)
    AWAITING_DEPOSIT --> IN_PROGRESS : confirm-deposit (Provider, after report-deposit)
    AWAITING_DEPOSIT --> CANCELLED : cancel (no endpoint yet)
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

US4-9. The progress timeline, oldest first. Not paged.

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
    Ctl-->>C: 200 ProjectUpdate[] (PROGRESS and WORK_REJECTED)
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
