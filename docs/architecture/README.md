# System Architecture & API Design Report: MangoDB

This document provides the architectural specification for **MangoDB**, a B2B marketplace platform for IT services and job contracting. It covers:

1. **System Architecture & UML API Diagram** (Sparx Systems REST Profile)
2. **Sequence Diagram for Core Use Case** (US2-11: Accept Proposal & Initialize Project)
3. **Design Quality Evaluation** (Reusability, Maintainability, Scalability, Security)

---

## 1. System Architecture Overview

MangoDB follows a three-tier decoupled architecture designed for high cohesiveness, strong type safety, and clear boundaries:

```mermaid
flowchart TD
    subgraph ClientLayer ["Client & Frontend (Presentation)"]
        Browser["User Browser / Client"]
        NextApp["Next.js 16 Web Application\n(React 19, Tailwind CSS v4)\napps/mangodb"]
    end

    subgraph APILayer ["Backend Application Service (Express 5 + TypeScript)"]
        ProxyRoute["/api/* Route Rewrite & Cookie Forwarding"]
        AuthGuards["Guards & Middleware\n(requireAuth, requireRole, loginLimiter)"]
        Controllers["Resource Controllers\n(proposal.controller, project.controller, etc.)"]
        Validation["Zod Schema Validation\n(parseParams, parseBody, parseQuery)"]
        DomainLib["Domain Business Logic\n(lib/proposal, lib/project, lib/listing)"]
        PrismaORM["Prisma 7 Client ORM\n(lib/prisma.ts)"]
    end

    subgraph DataStorage ["Data & Storage Layer (Supabase)"]
        Postgres[("PostgreSQL 15+\nTransactional Relational DB")]
        ObjectStore[("Supabase Storage\n(PDF Quotations, Photos, Portfolios)")]
    end

    Browser -->|HTTPS Request| NextApp
    NextApp -->|Internal /api rewrite| ProxyRoute
    ProxyRoute --> AuthGuards
    AuthGuards --> Controllers
    Controllers --> Validation
    Controllers --> DomainLib
    DomainLib --> PrismaORM
    PrismaORM -->|Connection Pooling / SQL| Postgres
    DomainLib -->|S3 REST / Signed URLs| ObjectStore
```

---

## 2. UML API Diagram

The UML API Diagram below follows the **Sparx Systems REST Profile** standard commonly used in software engineering curriculum:

- `«Application»`: Represents the API root endpoint with `basePath = "/"`.
- `«Path»`: Connectors defining URI hierarchy segments.
- `«Resource»`: REST resource entity exposing standard HTTP verbs (`GET`, `POST`, `PATCH`, `DELETE`).
- `«Representation»`: JSON payload structures exchanged between client and server (`«use»` dependency).

The diagram focuses on the central business engine of MangoDB: **Proposals & Projects**.

### 2.1 Mermaid UML API Diagram

```mermaid
classDiagram
    direction LR

    class API {
        <<Application>>
        basePath = "/"
    }

    class Proposals {
        <<Resource>>
    }

    class MyProposals {
        <<Resource>>
        +GET()
    }

    class ProposalCounts {
        <<Resource>>
        +GET()
    }

    class ProposalItem {
        <<Resource>>
    }

    class AcceptProposal {
        <<Resource>>
        +POST()
    }

    class RejectProposal {
        <<Resource>>
        +POST()
    }

    class Projects {
        <<Resource>>
    }

    class MyProjects {
        <<Resource>>
        +GET()
    }

    class ProjectItem {
        <<Resource>>
        +GET()
    }

    class ProjectQuotation {
        <<Resource>>
        +GET()
        +POST()
    }

    class ConfirmDeposit {
        <<Resource>>
        +POST()
    }

    class AcceptWork {
        <<Resource>>
        +POST()
    }

    class ProjectReview {
        <<Resource>>
        +GET()
        +POST()
    }

    %% Representations
    class SentProposalRep {
        <<Representation>>
        -proposalId: int
        -listingTitle: string
        -listingType: ListingType
        -status: ProposalStatus
        -proposedBudget: decimal
        -proposedDurationMonths: int
    }

    class ProposalCountsRep {
        <<Representation>>
        -total: int
        -PENDING: int
        -ACCEPTED: int
        -REJECTED: int
    }

    class ProjectRep {
        <<Representation>>
        -projectId: int
        -proposalId: int
        -totalBudget: decimal
        -startDate: date
        -projectStatus: ProjectStatus
        -depositConfirmedAt: date?
        -completedAt: date?
    }

    class ReviewRep {
        <<Representation>>
        -reviewId: int
        -ratingWorkQuality: int
        -ratingValueForMoney: int
        -comment: string
    }

    %% Paths and Usages
    API ..> Proposals : «Path» /proposals
    Proposals ..> MyProposals : «Path» /mine
    MyProposals ..> SentProposalRep : «use»

    MyProposals ..> ProposalCounts : «Path» /counts
    ProposalCounts ..> ProposalCountsRep : «use»

    Proposals ..> ProposalItem : «Path» /{proposalId}
    ProposalItem ..> AcceptProposal : «Path» /accept
    AcceptProposal ..> ProjectRep : «use» (returns)

    ProposalItem ..> RejectProposal : «Path» /reject

    API ..> Projects : «Path» /projects
    Projects ..> MyProjects : «Path» /mine
    Projects ..> ProjectItem : «Path» /{projectId}
    ProjectItem ..> ProjectRep : «use»

    ProjectItem ..> ProjectQuotation : «Path» /quotation
    ProjectItem ..> ConfirmDeposit : «Path» /deposit/confirm
    ProjectItem ..> AcceptWork : «Path» /accept-work
    ProjectItem ..> ProjectReview : «Path» /review
    ProjectReview ..> ReviewRep : «use»
```

### 2.2 PlantUML Source (Exact Course Specification)

```plantuml
@startuml
left to right direction
skinparam classAttributeIconSize 0
hide circle
hide empty members
skinparam shadowing false
skinparam roundcorner 8

skinparam class {
  BackgroundColor<<Application>> #E8EDF2
  BorderColor<<Application>> #475569
  BackgroundColor<<Resource>> #DDEFEF
  BorderColor<<Resource>> #0F766E
  BackgroundColor<<Representation>> #FCE4F0
  BorderColor<<Representation>> #BE185D
}

class "MangoDB API" as API <<Application>> {
  basePath = "/"
}

class "Proposals" as Proposals <<Resource>>
class "MyProposals" as MyProposals <<Resource>> {
  + GET()
}
class "Counts" as Counts <<Resource>> {
  + GET()
}
class "Proposal" as ProposalR <<Resource>>
class "Accept" as Accept <<Resource>> {
  + POST()
}
class "Reject" as Reject <<Resource>> {
  + POST()
}

class "Projects" as Projects <<Resource>>
class "MyProjects" as MyProjects <<Resource>> {
  + GET()
}
class "Project" as ProjectR <<Resource>> {
  + GET()
}
class "Quotation" as Quotation <<Resource>> {
  + GET()
  + POST()
}
class "ConfirmDeposit" as ConfirmDeposit <<Resource>> {
  + POST()
}
class "AcceptWork" as AcceptWork <<Resource>> {
  + POST()
}
class "Review" as Review <<Resource>> {
  + GET()
  + POST()
}

class "SentProposal" as SentProposalRep <<Representation>> {
  - proposalId : int
  - listingTitle : string
  - listingType : ListingType
  - status : ProposalStatus
}
class "Project" as ProjectRep <<Representation>> {
  - projectId : int
  - proposalId : int
  - totalBudget : decimal
  - projectStatus : ProjectStatus
}

API -[#B45309,dashed]-> Proposals : «Path» /proposals
Proposals -[#B45309,dashed]-> MyProposals : «Path» /mine
MyProposals -[#BE185D,dashed]-> SentProposalRep : «use»
MyProposals -[#B45309,dashed]-> Counts : «Path» /counts
Proposals -[#B45309,dashed]-> ProposalR : «Path» /{proposalId}
ProposalR -[#B45309,dashed]-> Accept : «Path» /accept
Accept -[#BE185D,dashed]-> ProjectRep : «use»
ProposalR -[#B45309,dashed]-> Reject : «Path» /reject

API -[#B45309,dashed]-> Projects : «Path» /projects
Projects -[#B45309,dashed]-> MyProjects : «Path» /mine
Projects -[#B45309,dashed]-> ProjectR : «Path» /{projectId}
ProjectR -[#BE185D,dashed]-> ProjectRep : «use»
ProjectR -[#B45309,dashed]-> Quotation : «Path» /quotation
ProjectR -[#B45309,dashed]-> ConfirmDeposit : «Path» /deposit/confirm
ProjectR -[#B45309,dashed]-> AcceptWork : «Path» /accept-work
ProjectR -[#B45309,dashed]-> Review : «Path» /review
@enduml
```

---

## 3. Sequence Diagram (Use Case US2-11: Accept Proposal)

This sequence diagram illustrates the complete end-to-end flow of the **Accept Proposal** operation (`POST /api/proposals/{proposalId}/accept`). It highlights how the platform verifies authentication, asserts authorization and ownership, isolates database mutations inside a strict ACID transaction, and standardizes errors.

```mermaid
sequenceDiagram
    autonumber
    actor Receiver as Receiver (Client)
    participant UI as Next.js Page<br/>(jobs/[id]/proposals)
    participant Proxy as Next.js Rewrite<br/>(/api/* proxy)
    participant AuthMW as Middleware<br/>(requireAuth)
    participant Ctrl as ProposalController<br/>(acceptProposal)
    participant Zod as Zod Validation<br/>(validate.ts)
    participant Lib as Domain Libs<br/>(proposal, listing, project)
    participant DB as PostgreSQL<br/>(Prisma Transaction)
    participant EH as ErrorHandler<br/>(errorHandler.ts)

    Receiver->>UI: Click "Accept Proposal" & confirm
    UI->>Proxy: POST /api/proposals/14/accept<br/>Cookie: access_token (httpOnly)
    Proxy->>AuthMW: Forward request with Cookie header

    %% Authentication & Session verification
    AuthMW->>AuthMW: verifyAccessToken(jwt)
    alt Invalid / Missing JWT
        AuthMW-->>EH: throw ApiError.unauthorized()
        EH-->>UI: 401 UNAUTHORIZED
    end

    AuthMW->>DB: isTokenRevoked(jti) & isCompanyDeleted(companyId)
    alt Token Revoked or Account Soft-Deleted
        AuthMW-->>EH: throw ApiError.unauthorized("Session ended")
        EH-->>UI: 401 UNAUTHORIZED
    end

    AuthMW->>Ctrl: next() with req.auth = { companyId, role }

    %% Controller & Input Validation
    Ctrl->>Zod: parseParams(proposalIdParamSchema)
    alt Invalid UUID / Integer format
        Zod-->>EH: throw ApiError.validationFailed(details)
        EH-->>UI: 400 VALIDATION_FAILED
    end

    %% Database ACID Transaction
    rect rgb(240, 245, 255)
        Note over Ctrl, DB: prisma.$transaction (Atomic Execution)
        Ctrl->>DB: BEGIN $transaction

        Ctrl->>Lib: findPendingProposalFor(tx, proposalId, callerId)
        Lib->>DB: proposal.findUnique({ id, include: listing })
        DB-->>Lib: proposal + listing data

        alt Proposal Not Found
            Lib-->>EH: throw ApiError.notFound("Proposal not found")
            EH-->>UI: 404 NOT_FOUND
        else Caller Does Not Own Listing
            Lib-->>EH: throw ApiError.forbidden("You do not own this listing")
            EH-->>UI: 403 FORBIDDEN
        else Proposal Not PENDING or Listing Not OPEN
            Lib-->>EH: throw ApiError.conflict("State invalid for acceptance")
            EH-->>UI: 409 CONFLICT
        end

        opt Listing is a Job Listing
            Ctrl->>Lib: closeOpenListing(tx, listingId)
            Lib->>DB: listing.updateMany(status: OPEN -> CLOSED)
        end

        Ctrl->>Lib: setProposalStatus(tx, proposalId, ACCEPTED)
        Lib->>DB: proposal.updateMany(status: PENDING -> ACCEPTED)

        opt Listing is a Job Listing
            Ctrl->>Lib: rejectPendingProposals(tx, listingId, except: proposalId)
            Lib->>DB: proposal.updateMany(status: PENDING -> REJECTED)
        end

        Ctrl->>Lib: createProjectFromProposal(tx, proposal)
        Lib->>DB: project.create(status: AWAITING_QUOTATION)
        DB-->>Lib: created project row

        Ctrl->>DB: COMMIT
    end

    Ctrl-->>UI: 201 Created + Project JSON
    UI-->>Receiver: Update UI: Status = ACCEPTED & link to /projects/{id}
```

---

## 4. Discussion of the UML API Diagram in terms of Design Quality

The architectural quality of the REST API is evaluated against four primary software quality attributes: **Reusability**, **Maintainability**, **Scalability**, and **Security**.

### 4.1 Reusability

1. **Shared Schema Representations (`packages/shared`)**:
    - Instead of defining disparate shapes across client and server, representations (`Project`, `SentProposal`, `CompanyProfile`, etc.) are declared once in `packages/shared` as single sources of truth.
    - Client-side data fetching hooks and backend controllers both bind directly to these types, ensuring compile-time contract compatibility and preventing wire format regressions.
2. **Uniform Resource Hierarchy & Polymorphic Proposals**:
    - Per ADR 0016, both job bidding (Provider bidding on Receiver's Job) and direct hire requests (Receiver hiring Provider's Service) reuse the same underlying `«Resource» Proposal` and state machine (`PENDING`, `ACCEPTED`, `REJECTED`).
    - Common pagination wrappers (`{ items: T[], pagination: { page, pageSize, total, totalPages } }`) and summary counters (`/counts`) are reused across all collection endpoints.
3. **Decoupled Business Services**:
    - The controllers delegate core mutations to reusable domain libraries (`lib/proposal.ts`, `lib/listing.ts`, `lib/project.ts`), making the business logic callable not only by HTTP handlers but also by asynchronous background jobs or automated test harnesses.

### 4.2 Maintainability

1. **Strict Separation of Concerns**:
    - The design neatly delineates **Paths** (URI routing in Express), **Resources** (HTTP verb dispatches), and **Representations** (DTOs). Routing (`*.routes.ts`), request parsing (`validate.ts`), business rules (`lib/*.ts`), and persistence (`prisma.ts`) are completely decoupled.
2. **Declarative Validation via Zod Schemas**:
    - All inbound payloads (path parameters, query filters, and JSON bodies) are validated through declarative schemas before reaching controller logic. If an API contract evolves, updating the schema updates input validation, documentation, and TypeScript types simultaneously.
3. **Normalized Error Envelope**:
    - All failures flow through a centralized `errorHandler` that outputs a predictable RFC-compliant JSON envelope:
        ```json
        {
            "error": {
                "code": "VALIDATION_FAILED",
                "message": "Invalid input",
                "details": [
                    {
                        "field": "proposedBudget",
                        "message": "Expected number, received string"
                    }
                ]
            }
        }
        ```
    - This prevents error format fragmentation and dramatically reduces frontend error-handling boilerplate.

### 4.3 Scalability

1. **Stateless API Design**:
    - The Express API maintains no server-side in-memory session states. Client authentication relies on self-contained JSON Web Tokens (JWT) carried in `httpOnly` secure cookies.
    - As traffic scales, additional API instances can be spun up behind a standard reverse proxy (e.g., Caddy/Nginx) without requiring session synchronization or sticky load balancing.
2. **Defensive Query Execution & Cursor/Offset Pagination**:
    - All collection resources (`/jobs`, `/services`, `/proposals/mine`, `/projects/mine`) mandate pagination parameters (`page`, `pageSize` with hard upper caps).
    - Unbounded queries (`SELECT *`) are banned. Prisma transactions bundle `.count()` and `.findMany()` with selective field projection (`select: { id, title, status }`), minimizing network bandwidth and database memory footprint.
3. **Static & Media Offloading**:
    - Large binary payloads (PDF quotations, project deliverables, company certificates) are stored directly in S3-compatible cloud buckets (Supabase Storage). The API only exchanges signed URLs and metadata, keeping backend network I/O lean.

### 4.4 Security

1. **Defense-in-Depth Middleware Pipeline**:
    - Requests traverse a multi-stage security pipeline prior to business logic execution:
        1. **`loginLimiter`**: Rate-limits authentication attempts (e.g., max 10 failed logins per email/IP in 15 mins) to prevent brute-force attacks.
        2. **`requireAuth`**: Validates JWT cryptographic signature, expiry (`exp`), revocation status via `isTokenRevoked(jti)`, and verifies the company has not been soft-deleted (`isCompanyDeleted`).
        3. **`requireRole('provider' | 'receiver' | 'admin')`**: Enforces strict Role-Based Access Control (RBAC).
2. **No Relying on Client-Supplied Identifiers (IDOR Mitigation)**:
    - For sensitive user actions (such as fetching one's proposals or creating a listing), the platform reads the authenticated `companyId` directly from the validated token claims (`req.auth.companyId`), never trusting client-supplied URL query or body IDs.
    - Resource access enforces strict ownership checks in domain helpers (e.g., ensuring `proposal.listing.companyId === callerId`).
3. **Cross-Site Scripting (XSS) & CORS Protection**:
    - Access tokens are encapsulated in `httpOnly`, `SameSite=Lax`, `Secure` cookies inaccessible to JavaScript running in the browser.
    - The Next.js frontend proxies `/api/*` calls server-to-server, rendering external cross-origin requests (`CORS`) unnecessary and neutralizing credential leakage vectors.
