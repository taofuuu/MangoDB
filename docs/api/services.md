# Service endpoints (`/services`)

Source: `apps/api/src/routes/service.routes.ts`,
`apps/api/src/controllers/service.controller.ts`.
Back to the [index](README.md).

A service is a `listing` row with `listingType = SERVICE` plus a `service` row.
Every route needs `requireAuth`.

| Method | Path                       | Guards             | Success                         |
| ------ | -------------------------- | ------------------ | ------------------------------- |
| GET    | `/services`                | provider, receiver | 200 `{ items, pagination }`     |
| GET    | `/services/filter-options` | provider, receiver | 200 `{ categories, techStack }` |
| POST   | `/services`                | provider           | 201 Service                     |
| GET    | `/services/mine`           | provider           | 200 Service[]                   |
| GET    | `/services/:serviceId`     | provider, receiver | 200 Service                     |
| PATCH  | `/services/:serviceId`     | auth, owner        | 200 Service                     |
| DELETE | `/services/:serviceId`     | auth, owner        | 204                             |

## GET /services

US3-1. Search open services of active companies. Paged and sorted.

```mermaid
sequenceDiagram
    autonumber
    actor C as Client
    participant G as requireAuth + requireRole(provider, receiver)
    participant Ctl as service.controller<br/>listServices
    participant L as lib/service
    participant DB as PostgreSQL

    C->>G: GET /services?q&category&techStack&minPrice&maxPrice&companyId&orderBy&page&pageSize
    alt not signed in
        G-->>C: 401
    else admin
        G-->>C: 403
    end
    G->>Ctl: next
    Ctl->>Ctl: parseQuery(serviceListQuerySchema)
    alt bad filter value or minPrice > maxPrice
        Ctl-->>C: 400 VALIDATION_FAILED
    end
    Ctl->>L: serviceSearchWhere(q, filters), serviceOrderBy(orderBy)
    Ctl->>DB: $transaction [listing.count, listing.findMany(serviceSummarySelect)]
    DB-->>Ctl: totalItems, listings
    Ctl->>L: toServiceSummary per row
    Ctl-->>C: 200 { items: ServiceSummary[], pagination }
```

## GET /services/filter-options

T3.2.2. The choices for the search filters.

```mermaid
sequenceDiagram
    autonumber
    actor C as Client
    participant G as requireAuth + requireRole(provider, receiver)
    participant Ctl as service.controller<br/>getServiceFilterOptions
    participant DB as PostgreSQL

    C->>G: GET /services/filter-options
    G->>Ctl: next (401 / 403 as above)
    Ctl->>DB: $transaction [category.findMany, techStack.findMany used by OPEN services of active companies]
    DB-->>Ctl: categories, techStack
    Ctl-->>C: 200 { categories, techStack }
```

## POST /services

Create and publish a service. Listing, service, categories, and tech stack are
one nested write.

```mermaid
sequenceDiagram
    autonumber
    actor C as Client
    participant G as requireAuth + requireRole(provider)
    participant Ctl as service.controller<br/>createService
    participant Cat as lib/category
    participant L as lib/service
    participant DB as PostgreSQL

    C->>G: POST /services (JSON)
    alt not signed in
        G-->>C: 401
    else not a provider
        G-->>C: 403
    end
    G->>Ctl: next
    Ctl->>Ctl: parseBody(createServiceSchema)
    alt invalid body or minBudget > maxBudget
        Ctl-->>C: 400 VALIDATION_FAILED
    end
    Ctl->>Cat: assertCategoriesExist(categoryIds)
    Cat->>DB: category.findMany by ids
    alt unknown category id
        Cat-->>C: 400 VALIDATION_FAILED
    end
    Ctl->>L: ensureTechStack(names)
    L->>DB: techStack.findMany (resolve spelling), createMany skipDuplicates
    Ctl->>DB: listing.create (SERVICE, OPEN, service + serviceTechStack, listingCategory)
    DB-->>Ctl: listing (serviceSelect)
    Ctl-->>C: 201 Service
```

## GET /services/mine

The caller's own services, every status, newest first.

```mermaid
sequenceDiagram
    autonumber
    actor C as Client
    participant G as requireAuth + requireRole(provider)
    participant Ctl as service.controller<br/>listMyServices
    participant DB as PostgreSQL

    C->>G: GET /services/mine?status
    G->>Ctl: next (401 / 403 as above)
    Ctl->>Ctl: parseQuery(serviceMineQuerySchema)
    Ctl->>DB: listing.findMany (companyId = caller, SERVICE, status?)
    Ctl-->>C: 200 Service[]
```

## GET /services/:serviceId

Any company reads an OPEN service of an active company. The owner reads its own
in any status. Everything else is 404.

```mermaid
sequenceDiagram
    autonumber
    actor C as Client
    participant G as requireAuth + requireRole(provider, receiver)
    participant Ctl as service.controller<br/>getService
    participant L as lib/listing
    participant DB as PostgreSQL

    C->>G: GET /services/:serviceId
    G->>Ctl: next (401 / 403 as above)
    Ctl->>Ctl: parseParams(serviceIdParamSchema)
    Ctl->>DB: listing.findUnique (id, SERVICE, company not deleted)
    Ctl->>L: assertListingVisible(listing, caller, SERVICE)
    alt no row, or not OPEN and caller is not the owner
        L-->>C: 404 Service not found
    end
    Ctl-->>C: 200 Service
```

## PATCH /services/:serviceId

T2.3.4 / T2.3.5. Owner only. Sent fields only. `categoryIds` and `techStack`
replace the whole set.

```mermaid
sequenceDiagram
    autonumber
    actor C as Client
    participant G as requireAuth
    participant Ctl as service.controller<br/>updateService
    participant L as lib/listing
    participant Cat as lib/category
    participant S as lib/service
    participant DB as PostgreSQL

    C->>G: PATCH /services/:serviceId (JSON)
    G->>Ctl: req.auth (401 if not signed in)
    Ctl->>Ctl: parseParams, parseBody(updateServiceSchema)
    Ctl->>L: assertListingOwned(serviceId, SERVICE, caller)
    L->>DB: listing.findUnique
    alt no row or not a service
        L-->>C: 404 Service not found
    else another company owns it
        L-->>C: 403 This service belongs to another company
    end
    Ctl->>L: assertBudgetRange(existing, body)
    alt merged min > max
        L-->>C: 400 VALIDATION_FAILED
    end
    opt categoryIds sent
        Ctl->>Cat: assertCategoriesExist
    end
    opt techStack sent
        Ctl->>S: ensureTechStack
    end
    Ctl->>DB: listing.update where id, owner, SERVICE (replace categories, upsert service tech stack)
    alt row changed hands or gone (P2025)
        Ctl-->>C: 404 Service not found
    end
    Ctl-->>C: 200 Service
```

## DELETE /services/:serviceId

Hard delete. Refused when any project came from this service (US2-4).
Portfolio images are removed from storage after the rows are gone.

```mermaid
sequenceDiagram
    autonumber
    actor C as Client
    participant G as requireAuth
    participant Ctl as service.controller<br/>deleteService
    participant L as lib/listing
    participant DB as PostgreSQL
    participant St as Supabase Storage<br/>PORTFOLIO bucket

    C->>G: DELETE /services/:serviceId
    G->>Ctl: req.auth (401 if not signed in)
    Ctl->>Ctl: parseParams(serviceIdParamSchema)
    Ctl->>L: assertListingOwned(serviceId, SERVICE, caller)
    alt not found
        L-->>C: 404
    else not the owner
        L-->>C: 403
    end
    Ctl->>DB: project.count where proposal.listingId = serviceId
    alt count > 0
        Ctl-->>C: 409 A service with projects cannot be deleted
    end
    Ctl->>DB: servicePortfolio.findMany (portfolioImage)
    Ctl->>DB: listing.delete (cascades service, categories, proposals, portfolios)
    alt gone in between
        Ctl-->>C: 404 Service not found
    end
    Ctl->>St: removeFromStorageByUrl per image (best effort, in parallel)
    Ctl-->>C: 204
```
