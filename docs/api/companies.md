# Company endpoints (`/companies`)

Source: `apps/api/src/routes/company.routes.ts`,
`apps/api/src/controllers/company.controller.ts`
(`completed-projects` lives in `project.controller.ts`).
Back to the [index](README.md).

Every route needs `requireAuth`. "Company" in the guard column means
`requireRole('provider', 'receiver')`: any company, not admins.

| Method | Path                                       | Guards                       | Success                                 |
| ------ | ------------------------------------------ | ---------------------------- | --------------------------------------- |
| GET    | `/companies`                               | company                      | 200 `{ items, pagination }`             |
| GET    | `/companies/me`                            | auth                         | 200 CompanyProfile                      |
| PATCH  | `/companies/me`                            | auth                         | 200 CompanyProfile                      |
| PATCH  | `/companies/me/credentials`                | auth                         | 200 `{ company, accessToken }` + cookie |
| PATCH  | `/companies/me/photo`                      | auth, `uploadImage('photo')` | 200 CompanyProfile                      |
| DELETE | `/companies/me/photo`                      | auth                         | 200 CompanyProfile                      |
| DELETE | `/companies/me`                            | company                      | 204                                     |
| GET    | `/companies/:companyId/completed-projects` | company                      | 200 `{ items, pagination }`             |
| GET    | `/companies/:companyId/reviews`            | company                      | 200 `{ items, pagination }`             |
| GET    | `/companies/:companyId/reviews/summary`    | company                      | 200 rating summary                      |
| GET    | `/companies/:companyId`                    | company                      | 200 PublicCompanyProfile                |

## UML API Diagram

![UML API Diagram: companies](uml/companies.svg)

Source: [uml/companies.puml](uml/companies.puml). REST profile notation, see the [index](README.md#uml-api-diagram). Status codes, parameters and bodies are in the OpenAPI docs at `/api-docs`.

The sections below add one sequence diagram per endpoint: the steps inside the server.

## GET /companies

T3.6.7. Company search. Each word must match. Admins and deleted companies are
hidden.

```mermaid
sequenceDiagram
    autonumber
    actor C as Client
    participant G as requireAuth + requireRole(provider, receiver)
    participant Ctl as company.controller<br/>listCompanies
    participant L as lib/search + lib/company-search
    participant DB as PostgreSQL

    C->>G: GET /companies?q&orderBy&page&pageSize
    alt not signed in
        G-->>C: 401
    else admin
        G-->>C: 403
    end
    G->>Ctl: next
    Ctl->>Ctl: parseQuery(companyListQuerySchema)
    Ctl->>L: splitWords(q), companyKeywordWhere per word
    Ctl->>DB: $transaction [company.count, company.findMany(page, name then id)]
    DB-->>Ctl: totalItems, companies
    Ctl-->>C: 200 { items: CompanySummary[], pagination }
```

## GET /companies/me

US1-4. The caller's own profile, read fresh from the database.

```mermaid
sequenceDiagram
    autonumber
    actor C as Client
    participant G as requireAuth
    participant Ctl as company.controller<br/>getMyProfile
    participant DB as PostgreSQL

    C->>G: GET /companies/me
    alt not signed in
        G-->>C: 401
    end
    G->>Ctl: req.auth.companyId
    Ctl->>DB: company.findUnique(companyProfileSelect)
    alt no row
        Ctl-->>C: 404 Company not found
    end
    Ctl-->>C: 200 CompanyProfile
```

## PATCH /companies/me

US1-5. Partial update. Absent field = no change, `null` = clear.

```mermaid
sequenceDiagram
    autonumber
    actor C as Client
    participant G as requireAuth
    participant Ctl as company.controller<br/>updateMyProfile
    participant L as lib/company-profile
    participant DB as PostgreSQL

    C->>G: PATCH /companies/me (JSON)
    G->>Ctl: req.auth (401 if not signed in)
    Ctl->>Ctl: parseBody(updateCompanyProfileSchema)
    alt invalid body
        Ctl-->>C: 400 VALIDATION_FAILED
    end
    alt provider fields sent and role does not grant provider
        Ctl-->>C: 403 Only a provider company has service terms and a warranty policy
    end
    Ctl->>L: companyProfileUpdateData(body)
    Ctl->>DB: company.update (nested companyType replace, provider upsert)
    alt repeated companyType tag
        Ctl-->>C: 409 (companyTypeRepeat)
    else row gone (P2025)
        Ctl-->>C: 404 Company not found
    end
    Ctl-->>C: 200 CompanyProfile
```

## PATCH /companies/me/credentials

Username, email, and password. Needs the current password. Issues a new token
and revokes the old one.

```mermaid
sequenceDiagram
    autonumber
    actor C as Client
    participant G as requireAuth
    participant Ctl as company.controller<br/>changeMyCredentials
    participant P as auth/password
    participant Id as lib/company-identity
    participant DB as PostgreSQL
    participant D as auth/tokenDenylist
    participant S as lib/session

    C->>G: PATCH /companies/me/credentials { currentPassword, username?, email?, newPassword? }
    G->>Ctl: req.auth (401 if not signed in)
    Ctl->>Ctl: parseBody(changeCredentialsSchema)
    Ctl->>P: assertCurrentPassword(companyId, currentPassword)
    alt wrong password
        P-->>C: 401 Current password is incorrect
    end
    Ctl->>Id: assertCompanyIdentityAvailable(identity, exclude self)
    alt username or email taken by another company
        Id-->>C: 409 CONFLICT
    end
    opt newPassword sent
        Ctl->>P: hashPassword(newPassword)
    end
    Ctl->>DB: company.update (identity, password hash)
    alt unique race
        Ctl-->>C: 409 (identityConflict)
    else row gone
        Ctl-->>C: 404 Company not found
    end
    Ctl->>D: revokeToken(old jti, exp)
    Ctl->>S: sendSession(company)
    S-->>C: 200 { company, accessToken } + new Set-Cookie
```

## PATCH /companies/me/photo

US1-5, photo half. Multipart with one file field `photo`.

```mermaid
sequenceDiagram
    autonumber
    actor C as Client
    participant G as requireAuth + uploadImage(photo)
    participant Ctl as company.controller<br/>updateMyPhoto
    participant U as lib/upload<br/>saveWithUpload
    participant St as Supabase Storage<br/>PROFILE bucket
    participant DB as PostgreSQL

    C->>G: PATCH /companies/me/photo (multipart)
    alt bad type, over 5MB, or wrong field
        G-->>C: 400 BAD_REQUEST
    end
    G->>Ctl: req.file in memory
    Ctl->>Ctl: requireFile(req.file, photo)
    alt no file
        Ctl-->>C: 400 VALIDATION_FAILED
    end
    Ctl->>DB: company.findUnique (companyPhoto)
    alt no row
        Ctl-->>C: 404 Company not found
    end
    Ctl->>U: saveWithUpload(file, PROFILE, companies, write, oldUrl)
    U->>St: upload new file
    U->>DB: company.update set companyPhoto = new URL
    alt write fails
        U->>St: remove new file
        U-->>C: error from the write
    end
    U->>St: remove old file (best effort)
    Ctl-->>C: 200 CompanyProfile
```

## DELETE /companies/me/photo

Clears the photo. The file is removed after the column is cleared.

```mermaid
sequenceDiagram
    autonumber
    actor C as Client
    participant G as requireAuth
    participant Ctl as company.controller<br/>deleteMyPhoto
    participant DB as PostgreSQL
    participant St as Supabase Storage<br/>PROFILE bucket

    C->>G: DELETE /companies/me/photo
    G->>Ctl: req.auth (401 if not signed in)
    Ctl->>DB: company.findUnique (companyPhoto)
    alt no row
        Ctl-->>C: 404 Company not found
    end
    Ctl->>DB: company.update set companyPhoto = null
    opt there was a photo
        Ctl->>St: removeFromStorageByUrl (best effort)
    end
    Ctl-->>C: 200 CompanyProfile
```

## DELETE /companies/me

US1-6. A company deletes itself (soft delete). Admins cannot use this route.

```mermaid
sequenceDiagram
    autonumber
    actor C as Client
    participant G as requireAuth + requireRole(provider, receiver)
    participant Ctl as company.controller<br/>deleteMyAccount
    participant E as lib/project-eligibility
    participant D as lib/company-deletion
    participant DB as PostgreSQL

    C->>G: DELETE /companies/me
    alt not signed in
        G-->>C: 401
    else admin
        G-->>C: 403
    end
    G->>Ctl: req.auth.companyId
    Ctl->>E: hasOngoingProject(companyId)
    E->>DB: project.findFirst not COMPLETED / CANCELLED, as sender or owner
    alt ongoing project
        Ctl-->>C: 409 A company with an ongoing project cannot be deleted
    end
    Ctl->>D: softDeleteCompany(companyId)
    D->>DB: company.updateMany set deletedAt = now
    Ctl-->>C: 204
    Note over C,DB: The next request with the old token fails in requireAuth (isCompanyDeleted) with 401.
```

## GET /companies/:companyId/completed-projects

US2-5. A Provider's completed projects, newest first. Paged.

```mermaid
sequenceDiagram
    autonumber
    actor C as Client
    participant G as requireAuth + requireRole(provider, receiver)
    participant Ctl as project.controller<br/>listProviderCompletedProjects
    participant L as lib/project
    participant DB as PostgreSQL

    C->>G: GET /companies/:companyId/completed-projects?page&pageSize
    G->>Ctl: next (401 / 403 as above)
    Ctl->>Ctl: parseParams(companyIdParamSchema), parseQuery
    alt bad or too large id
        Ctl-->>C: 400 VALIDATION_FAILED
    end
    Ctl->>DB: company.findFirst (not deleted, not ADMIN)
    alt not found
        Ctl-->>C: 404 Company not found
    end
    Ctl->>L: providerCompletedProjectsWhere(companyId)
    Ctl->>DB: $transaction [project.count, project.findMany(completedAt desc, id desc)]
    Ctl-->>C: 200 { items: CompletedProject[], pagination }
```

## GET /companies/:companyId/reviews

US5-3. Reviews on a Provider's completed projects, newest first. Paged.

```mermaid
sequenceDiagram
    autonumber
    actor C as Client
    participant G as requireAuth + requireRole(provider, receiver)
    participant Ctl as company.controller<br/>listProviderReviews
    participant L as lib/project + lib/review
    participant DB as PostgreSQL

    C->>G: GET /companies/:companyId/reviews?page&pageSize
    G->>Ctl: next (401 / 403 as above)
    Ctl->>Ctl: parseParams, parseQuery(companyReviewListQuerySchema)
    Ctl->>DB: company.findFirst (not deleted, not ADMIN)
    alt not found
        Ctl-->>C: 404 Company not found
    end
    Ctl->>L: review where project = providerCompletedProjectsWhere
    Ctl->>DB: $transaction [review.count, review.findMany(createdAt desc, id desc)]
    Ctl->>L: toCompanyReview per row
    Ctl-->>C: 200 { items: CompanyReview[], pagination }
```

## GET /companies/:companyId/reviews/summary

US5-3. Average score and review count.

```mermaid
sequenceDiagram
    autonumber
    actor C as Client
    participant G as requireAuth + requireRole(provider, receiver)
    participant Ctl as company.controller<br/>getProviderReviewSummary
    participant R as lib/rating
    participant DB as PostgreSQL

    C->>G: GET /companies/:companyId/reviews/summary
    G->>Ctl: next (401 / 403 as above)
    Ctl->>Ctl: parseParams(companyIdParamSchema)
    Ctl->>DB: company.findFirst (not deleted, not ADMIN) with ratingSelect
    alt not found
        Ctl-->>C: 404 Company not found
    end
    Ctl->>R: getRating(company)
    Ctl-->>C: 200 rating summary
```

## GET /companies/:companyId

Another company's public profile, without username and email. Unknown,
deleted, and admin ids all answer the same 404.

```mermaid
sequenceDiagram
    autonumber
    actor C as Client
    participant G as requireAuth + requireRole(provider, receiver)
    participant Ctl as company.controller<br/>getCompanyProfile
    participant DB as PostgreSQL

    C->>G: GET /companies/:companyId
    G->>Ctl: next (401 / 403 as above)
    Ctl->>Ctl: parseParams(companyIdParamSchema)
    Ctl->>DB: company.findFirst (not deleted, not ADMIN, publicCompanyProfileSelect)
    alt not found
        Ctl-->>C: 404 Company not found
    end
    Ctl-->>C: 200 PublicCompanyProfile
```
