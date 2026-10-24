# Admin endpoints (`/admin`)

Source: `apps/api/src/routes/admin.routes.ts`,
`apps/api/src/controllers/admin-company.controller.ts`.
Back to the [index](README.md).

The whole router is guarded once with `requireAuth, requireRole('admin')`.
A company token gets 403 on every route here.

| Method | Path                          | Success                     |
| ------ | ----------------------------- | --------------------------- |
| GET    | `/admin/companies`            | 200 `{ items, pagination }` |
| GET    | `/admin/companies/:companyId` | 200 account detail          |
| PATCH  | `/admin/companies/:companyId` | 200 account detail          |
| DELETE | `/admin/companies/:companyId` | 204                         |

## UML API Diagram

REST profile notation (see the [index](README.md#uml-api-diagram-notation)). Each operation lists its status codes. Follow an arrow from `«Application»` to a `«Resource»` to read one HTTP call.

```mermaid
classDiagram
    direction LR
    class API["MangoDB API"] {
        <<Application>>
        basePath = "/"
    }
    class Admin["Admin"] {
        <<Resource>>
    }
    class AdminCompanies["Companies"] {
        <<Resource>>
        +GET(page, pageSize, q, filter, includeDeleted : QueryParam) 200 | 400 | 401 | 403
    }
    class AdminCompany["Company"] {
        <<Resource>>
        +GET() 200 | 400 | 401 | 403 | 404
        +PATCH(UpdateCompanyProfileRequest) 200 | 400 | 401 | 403 | 404 | 409
        +DELETE(DeleteCompanyAccountRequest) 204 | 400 | 401 | 403 | 404 | 409
    }
    class CompanyAccountSummaryRep["CompanyAccountSummary"] {
        <<Representation>>
        -companyId : number
        -companyName : string
        -companyDescription : string?
        -phone : string
        -accountType : AccountType
        -averageRating : number?
        -ratingCount : number
        -deletedAt : date?
    }
    class CompanyAccountDetailRep["CompanyAccountDetail"] {
        <<Representation>>
        -CompanyProfile fields
        -averageRating : number?
        -ratingCount : number
        -deletedAt : date?
    }
    class UpdateCompanyProfileRequestRep["UpdateCompanyProfileRequest"] {
        <<Representation>>
        -companyName : string?
        -contactEmail : string?
        -phone : string?
        -companyType : string[]?
        -companyDescription : string?
        -address : string?
        -website : string?
        -serviceTerm : string?
        -warrantyPolicy : string?
    }
    class DeleteCompanyAccountRequestRep["DeleteCompanyAccountRequest"] {
        <<Representation>>
        -currentPassword : string
    }
    API --> Admin : «Path» /admin
    Admin --> AdminCompanies : «Path» /companies
    AdminCompanies ..> CompanyAccountSummaryRep : «use»
    AdminCompanies --> AdminCompany : «Path» /{companyId}
    AdminCompany ..> CompanyAccountDetailRep : «use»
    AdminCompany ..> UpdateCompanyProfileRequestRep : «use»
    AdminCompany ..> DeleteCompanyAccountRequestRep : «use»
    style API fill:#fde68a,stroke:#b45309
    style Admin fill:#bfdbfe,stroke:#1d4ed8
    style AdminCompanies fill:#bfdbfe,stroke:#1d4ed8
    style AdminCompany fill:#bfdbfe,stroke:#1d4ed8
    style CompanyAccountSummaryRep fill:#bbf7d0,stroke:#15803d
    style CompanyAccountDetailRep fill:#bbf7d0,stroke:#15803d
    style UpdateCompanyProfileRequestRep fill:#bbf7d0,stroke:#15803d
    style DeleteCompanyAccountRequestRep fill:#bbf7d0,stroke:#15803d
```

The sections below add one sequence diagram per endpoint: the steps inside the server.

## GET /admin/companies

US6-2. One alphabetical page of company accounts. Admin rows are never listed.

```mermaid
sequenceDiagram
    autonumber
    actor C as Admin client
    participant G as requireAuth + requireRole(admin)
    participant Ctl as admin-company.controller<br/>listCompanyAccounts
    participant DB as PostgreSQL

    C->>G: GET /admin/companies?page&pageSize&q&filter&includeDeleted
    alt not signed in
        G-->>C: 401
    else not an admin
        G-->>C: 403
    end
    G->>Ctl: next
    Ctl->>Ctl: parseQuery(companyAccountListQuerySchema)
    Ctl->>Ctl: build where (keyword OR, accountType filter, deletedAt null unless includeDeleted)
    Ctl->>DB: $transaction [company.count, company.findMany(page, order by name, id)]
    DB-->>Ctl: totalItems, companies
    Ctl-->>C: 200 { items: CompanyAccountSummary[], pagination }
```

## GET /admin/companies/:companyId

US6-2. One account with its private contact fields.

```mermaid
sequenceDiagram
    autonumber
    actor C as Admin client
    participant G as requireAuth + requireRole(admin)
    participant Ctl as admin-company.controller<br/>getCompanyAccountDetail
    participant DB as PostgreSQL

    C->>G: GET /admin/companies/:companyId
    G->>Ctl: next (401 / 403 as above)
    Ctl->>Ctl: parseParams(companyAccountIdParamSchema)
    Ctl->>DB: company.findUnique(adminCompanyDetailSelect)
    alt no row
        Ctl-->>C: 404 Company account not found
    end
    Ctl-->>C: 200 CompanyAccountDetail
```

## PATCH /admin/companies/:companyId

US6-3. Edit profile columns only. Username, email, and password are not
editable here.

```mermaid
sequenceDiagram
    autonumber
    actor C as Admin client
    participant G as requireAuth + requireRole(admin)
    participant Ctl as admin-company.controller<br/>updateCompanyAccount
    participant L as lib/company-profile
    participant DB as PostgreSQL

    C->>G: PATCH /admin/companies/:companyId (JSON)
    G->>Ctl: next (401 / 403 as above)
    Ctl->>Ctl: parseParams, then parseBody(updateCompanyProfileSchema)
    Ctl->>DB: company.findUnique (accountType, deletedAt)
    alt no row
        Ctl-->>C: 404 Company account not found
    else deletedAt is set
        Ctl-->>C: 409 Deleted company accounts cannot be edited
    end
    alt provider fields sent but target owns no provider row
        Ctl-->>C: 400 BAD_REQUEST with one detail per field
    end
    Ctl->>L: companyProfileUpdateData(body)
    Ctl->>DB: company.update where companyId and deletedAt null
    alt repeated companyType tag
        DB-->>Ctl: P2002
        Ctl-->>C: 409 (companyTypeRepeat)
    else deleted between read and write
        DB-->>Ctl: P2025
        Ctl-->>C: 409 Deleted company accounts cannot be edited
    end
    Ctl-->>C: 200 CompanyAccountDetail
```

## DELETE /admin/companies/:companyId

US6-4. Soft delete. The admin types their own password first.

```mermaid
sequenceDiagram
    autonumber
    actor C as Admin client
    participant G as requireAuth + requireRole(admin)
    participant Ctl as admin-company.controller<br/>deleteCompanyAccount
    participant P as auth/password
    participant E as lib/project-eligibility
    participant D as lib/company-deletion
    participant DB as PostgreSQL

    C->>G: DELETE /admin/companies/:companyId { currentPassword }
    G->>Ctl: next (401 / 403 as above)
    Ctl->>Ctl: parseParams, then parseBody(deleteCompanyAccountBodySchema)
    Ctl->>P: assertCurrentPassword(admin companyId, currentPassword)
    alt wrong password
        P-->>C: 401 Current password is incorrect
    end
    Ctl->>DB: company.findUnique (accountType, deletedAt)
    alt no row or already deleted
        Ctl-->>C: 404 Company account not found
    else target is ADMIN
        Ctl-->>C: 400 Administrator accounts cannot be deleted
    end
    Ctl->>E: hasOngoingProject(companyId)
    E->>DB: project count not COMPLETED / CANCELLED
    alt ongoing project
        Ctl-->>C: 409 ONGOING_PROJECT_BLOCKS_DELETE
    end
    Ctl->>D: softDeleteCompany(companyId)
    D->>DB: company.updateMany set deletedAt = now
    alt count is 0 (race)
        Ctl-->>C: 404 Company account not found
    end
    Ctl-->>C: 204
```
