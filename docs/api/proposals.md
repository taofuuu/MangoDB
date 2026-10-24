# Proposal endpoints (`/proposals`)

Source: `apps/api/src/routes/proposal.routes.ts`,
`apps/api/src/controllers/proposal.controller.ts`.
Back to the [index](README.md).

Sending a proposal is `POST /jobs/:jobId/proposals`, in [jobs.md](jobs.md).
Every route here needs `requireAuth`.

| Method | Path                            | Guards              | Success                     |
| ------ | ------------------------------- | ------------------- | --------------------------- |
| GET    | `/proposals/mine`               | provider, receiver  | 200 `{ items, pagination }` |
| GET    | `/proposals/mine/counts`        | provider, receiver  | 200 counts by status        |
| POST   | `/proposals/:proposalId/accept` | auth, listing owner | 201 Project                 |
| POST   | `/proposals/:proposalId/reject` | auth, listing owner | 204                         |

## UML API Diagram

REST profile notation (see the [index](README.md#uml-api-diagram-notation)). Each operation lists its status codes. Follow an arrow from `«Application»` to a `«Resource»` to read one HTTP call.

```mermaid
classDiagram
    direction LR
    class API["MangoDB API"] {
        <<Application>>
        basePath = "/"
    }
    class Proposals["Proposals"] {
        <<Resource>>
    }
    class MyProposals["MyProposals"] {
        <<Resource>>
        +GET(status, page, pageSize : QueryParam) 200 | 400 | 401 | 403
    }
    class Counts["Counts"] {
        <<Resource>>
        +GET() 200 | 401 | 403
    }
    class ProposalR["Proposal"] {
        <<Resource>>
    }
    class Accept["Accept"] {
        <<Resource>>
        +POST() 201 | 400 | 401 | 403 | 404 | 409
    }
    class Reject["Reject"] {
        <<Resource>>
        +POST() 204 | 400 | 401 | 403 | 404 | 409
    }
    class SentProposalRep["SentProposal"] {
        <<Representation>>
        -Proposal fields
        -listingTitle : string
        -listingType : JOB, SERVICE
        -recipient : CompanyBrief
        -projectId : number?
    }
    class ProposalStatusCountsRep["ProposalStatusCounts"] {
        <<Representation>>
        -total : number
        -PENDING : number
        -ACCEPTED : number
        -REJECTED : number
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
    API --> Proposals : «Path» /proposals
    Proposals --> MyProposals : «Path» /mine
    MyProposals ..> SentProposalRep : «use»
    MyProposals --> Counts : «Path» /counts
    Counts ..> ProposalStatusCountsRep : «use»
    Proposals --> ProposalR : «Path» /{proposalId}
    ProposalR --> Accept : «Path» /accept
    Accept ..> ProjectRep : «use»
    ProposalR --> Reject : «Path» /reject
    style API fill:#fde68a,stroke:#b45309
    style Proposals fill:#bfdbfe,stroke:#1d4ed8
    style MyProposals fill:#bfdbfe,stroke:#1d4ed8
    style Counts fill:#bfdbfe,stroke:#1d4ed8
    style ProposalR fill:#bfdbfe,stroke:#1d4ed8
    style Accept fill:#bfdbfe,stroke:#1d4ed8
    style Reject fill:#bfdbfe,stroke:#1d4ed8
    style SentProposalRep fill:#bbf7d0,stroke:#15803d
    style ProposalStatusCountsRep fill:#bbf7d0,stroke:#15803d
    style ProjectRep fill:#bbf7d0,stroke:#15803d
```

The sections below add one sequence diagram per endpoint: the steps inside the server.

## GET /proposals/mine

US2-9. Proposals and hire requests the caller sent, newest first. Paged.

```mermaid
sequenceDiagram
    autonumber
    actor C as Client
    participant G as requireAuth + requireRole(provider, receiver)
    participant Ctl as proposal.controller<br/>listMyProposals
    participant DB as PostgreSQL

    C->>G: GET /proposals/mine?status&page&pageSize
    alt not signed in
        G-->>C: 401
    else admin
        G-->>C: 403
    end
    G->>Ctl: next
    Ctl->>Ctl: parseQuery(proposalListQuerySchema)
    Ctl->>DB: $transaction [proposal.count, proposal.findMany (senderId = caller, status?)]
    Ctl-->>C: 200 { items: SentProposal[], pagination }
```

## GET /proposals/mine/counts

US2-9. Numbers for the status chips. Ignores `?status`.

```mermaid
sequenceDiagram
    autonumber
    actor C as Client
    participant G as requireAuth + requireRole(provider, receiver)
    participant Ctl as proposal.controller<br/>getMyProposalCounts
    participant L as lib/proposal
    participant DB as PostgreSQL

    C->>G: GET /proposals/mine/counts
    G->>Ctl: next (401 / 403 as above)
    Ctl->>DB: proposal.groupBy proposalStatus where senderId = caller
    Ctl->>L: toProposalStatusCounts(groups)
    Ctl-->>C: 200 ProposalStatusCounts
```

## POST /proposals/:proposalId/accept

US2-11. All or nothing: close the listing, accept this proposal, reject the
others, and open a project.

```mermaid
sequenceDiagram
    autonumber
    actor C as Client
    participant G as requireAuth
    participant Ctl as proposal.controller<br/>acceptProposal
    participant P as lib/proposal
    participant L as lib/listing
    participant Pr as lib/project
    participant DB as PostgreSQL

    C->>G: POST /proposals/:proposalId/accept
    G->>Ctl: req.auth (401 if not signed in)
    Ctl->>Ctl: parseParams(proposalIdParamSchema)
    rect rgba(128, 128, 128, 0.12)
        Note over Ctl,DB: prisma.$transaction (any error rolls back every step)
        Ctl->>P: findPendingProposalFor(tx, proposalId, caller)
        P->>DB: proposal.findUnique with listing
        alt no proposal
            P-->>C: 404 Proposal not found
        else caller does not own the listing
            P-->>C: 403 You do not own this listing
        else not PENDING
            P-->>C: 409 Proposal is not pending
        end
        alt listing not OPEN
            Ctl-->>C: 409 Listing has already been closed
        end
        Ctl->>L: closeOpenListing(tx, listingId)
        L->>DB: listing.updateMany OPEN to CLOSED
        Ctl->>P: setProposalStatus(tx, proposalId, ACCEPTED)
        P->>DB: proposal.updateMany PENDING to ACCEPTED
        alt count is 0 (race)
            P-->>C: 409 Proposal has already been accepted or rejected
        end
        Ctl->>L: rejectPendingProposals(tx, listingId, except this one)
        L->>DB: proposal.updateMany PENDING to REJECTED
        Ctl->>Pr: createProjectFromProposal(tx, proposalId, budget)
        Pr->>DB: project.create (AWAITING_QUOTATION, start today UTC)
    end
    Ctl-->>C: 201 Project
```

## POST /proposals/:proposalId/reject

Reject one PENDING proposal. No other row changes.

```mermaid
sequenceDiagram
    autonumber
    actor C as Client
    participant G as requireAuth
    participant Ctl as proposal.controller<br/>rejectProposal
    participant P as lib/proposal
    participant DB as PostgreSQL

    C->>G: POST /proposals/:proposalId/reject
    G->>Ctl: req.auth (401 if not signed in)
    Ctl->>Ctl: parseParams(proposalIdParamSchema)
    Ctl->>P: findPendingProposalFor(prisma, proposalId, caller)
    alt no proposal
        P-->>C: 404 Proposal not found
    else caller does not own the listing
        P-->>C: 403 You do not own this listing
    else not PENDING
        P-->>C: 409 Proposal is not pending
    end
    Ctl->>P: setProposalStatus(prisma, proposalId, REJECTED)
    P->>DB: proposal.updateMany PENDING to REJECTED
    alt count is 0 (race)
        P-->>C: 409 Proposal has already been accepted or rejected
    end
    Ctl-->>C: 204
```
