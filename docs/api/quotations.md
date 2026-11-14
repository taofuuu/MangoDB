# Quotation endpoints (`/quotations`)

Source: `apps/api/src/routes/quotation.routes.ts`,
`apps/api/src/controllers/quotation.controller.ts`.
Back to the [index](README.md).

A quotation is one PDF on a project (ADR 0017). Uploading one and listing them
happen under the project: `POST` and `GET /projects/:projectId/quotations`, see
[projects.md](projects.md). The three endpoints here act on one quotation by
its own id, so the project does not appear in the path.

Every route needs only `requireAuth`. There is no `requireRole`: a BOTH company
can be either side, so the controller works out the caller's side per project
with `assertQuotationParty`.

- Not a party to the quotation's project: **404**, as if it did not exist.
- A party, but the wrong side for this action: **403**.
- The right side, but the quotation is not PENDING (or the project is in the
  wrong status): **409**.

| Method | Path                              | Who may act | Success       |
| ------ | --------------------------------- | ----------- | ------------- |
| POST   | `/quotations/:quotationId/accept` | Receiver    | 200 Quotation |
| POST   | `/quotations/:quotationId/reject` | Receiver    | 200 Quotation |
| DELETE | `/quotations/:quotationId`        | Provider    | 204 (no body) |

## UML API Diagram

![UML API Diagram: quotations](uml/quotations.svg)

Source: [uml/quotations.puml](uml/quotations.puml). REST profile notation, see the [index](README.md#uml-api-diagram). Status codes, parameters and bodies are in the OpenAPI docs at `/api-docs`.

The sections below add one sequence diagram per endpoint: the steps inside the server.

## State diagram: quotation status

```mermaid
stateDiagram-v2
    [*] --> PENDING : Provider uploads PDF
    PENDING --> ACCEPTED : accept (Receiver)
    PENDING --> REJECTED : reject (Receiver)
    PENDING --> [*] : delete (Provider)
    ACCEPTED --> [*]
    REJECTED --> [*]
```

Only one quotation per project can be PENDING at a time. After a reject, the
Provider can upload a new one.

## Shared step: assertQuotationParty

Every `/:quotationId` route starts with this.

```mermaid
sequenceDiagram
    autonumber
    participant Ctl as quotation.controller
    participant L as lib/quotation<br/>assertQuotationParty
    participant DB as PostgreSQL

    Ctl->>L: assertQuotationParty(quotationId, caller)
    L->>DB: quotation.findUnique (projectId, project status, proposal sender, listing type + owner)
    alt no quotation
        L-->>Ctl: throw 404 Quotation not found
    end
    L->>L: projectParties: job = sender is Provider, service = sender is Receiver
    alt caller is neither party
        L-->>Ctl: throw 404 Quotation not found
    end
    L-->>Ctl: { projectId, projectStatus, myRole }
```

## POST /quotations/:quotationId/accept

US4-4. The Receiver accepts a pending quotation. The quotation becomes
ACCEPTED and the project moves from AWAITING_QUOTATION to AWAITING_DEPOSIT,
in one transaction.

```mermaid
sequenceDiagram
    autonumber
    actor C as Receiver client
    participant G as requireAuth
    participant Ctl as quotation.controller<br/>acceptQuotation
    participant L as lib/quotation + lib/project
    participant DB as PostgreSQL

    C->>G: POST /quotations/:quotationId/accept
    G->>Ctl: req.auth (401 if not signed in)
    Ctl->>Ctl: parseParams(quotationIdParamSchema)
    Ctl->>L: assertQuotationParty
    alt not found or not a party
        L-->>C: 404 Quotation not found
    end
    alt caller is the Provider
        Ctl-->>C: 403 Only the Receiver can accept a quotation
    end
    rect rgba(128, 128, 128, 0.12)
        Note over Ctl,DB: prisma.$transaction
        Ctl->>DB: quotation.update where PENDING, set ACCEPTED
        alt no row matched
            Ctl-->>C: 409 Quotation is not PENDING
        end
        Ctl->>L: moveProjectStatus(tx, AWAITING_QUOTATION, AWAITING_DEPOSIT)
        alt count is 0
            L-->>C: 409 Project is not AWAITING_QUOTATION
        end
    end
    Ctl-->>C: 200 Quotation
```

## POST /quotations/:quotationId/reject

US4-5. The Receiver rejects a pending quotation. The project stays
AWAITING_QUOTATION so the Provider can send a new one.

```mermaid
sequenceDiagram
    autonumber
    actor C as Receiver client
    participant G as requireAuth
    participant Ctl as quotation.controller<br/>rejectQuotation
    participant L as lib/quotation
    participant DB as PostgreSQL

    C->>G: POST /quotations/:quotationId/reject
    G->>Ctl: req.auth (401 if not signed in)
    Ctl->>Ctl: parseParams(quotationIdParamSchema)
    Ctl->>L: assertQuotationParty
    alt not found or not a party
        L-->>C: 404 Quotation not found
    end
    alt caller is the Provider
        Ctl-->>C: 403 Only the Receiver can reject a quotation
    else project is not AWAITING_QUOTATION (moved on or cancelled)
        Ctl-->>C: 409 Project is not AWAITING_QUOTATION
    end
    Ctl->>DB: quotation.update where PENDING, set REJECTED
    alt no row matched
        Ctl-->>C: 409 Quotation is not PENDING
    end
    Ctl-->>C: 200 Quotation
```

## DELETE /quotations/:quotationId

US4-2. The Provider deletes a pending quotation, so a wrong PDF can be
replaced before the Receiver answers.

```mermaid
sequenceDiagram
    autonumber
    actor C as Provider client
    participant G as requireAuth
    participant Ctl as quotation.controller<br/>deleteQuotation
    participant L as lib/quotation
    participant DB as PostgreSQL
    participant S as Storage

    C->>G: DELETE /quotations/:quotationId
    G->>Ctl: req.auth (401 if not signed in)
    Ctl->>Ctl: parseParams(quotationIdParamSchema)
    Ctl->>L: assertQuotationParty
    alt not found or not a party
        L-->>C: 404 Quotation not found
    end
    alt caller is the Receiver
        Ctl-->>C: 403 Only the Provider can delete a quotation
    end
    Ctl->>DB: quotation.delete where PENDING
    alt no row matched (Receiver decided first)
        Ctl-->>C: 409 Quotation is not PENDING
    end
    Ctl->>S: remove the PDF (best effort)
    Ctl-->>C: 204
```
